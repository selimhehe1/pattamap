import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest, isEstablishmentOwner } from '../middleware/auth';
import { CreateEstablishmentRequest, Establishment } from '../types';
import { validateTextInput, validateNumericInput, prepareFilterParams } from '../utils/validation';
import { logger } from '../utils/logger';
import { paginateQuery, validatePaginationParams, offsetFromPage, buildOffsetPaginationMeta } from '../utils/pagination';
import { cacheDel, cacheInvalidatePattern, CACHE_KEYS } from '../config/redis';
import { notifyAdminsPendingContent } from '../utils/notificationHelper';

export const getEstablishments = async (req: AuthRequest, res: Response) => {
  try {
    const { category_id, status = 'approved', search, limit = 50, page = 1, zone, cursor } = req.query;

    // Validate and sanitize inputs
    const validatedParams = prepareFilterParams({
      category_id: category_id ? Number(category_id) : undefined,
      status: status as string,
      search: search as string,
      zone: zone as string,
      limit: Number(limit),
      page: Number(page)
    });

    // Validate status field against allowed values
    const allowedStatuses = ['pending', 'approved', 'rejected'];
    if (validatedParams.status && !allowedStatuses.includes(validatedParams.status)) {
      return res.status(400).json({
        error: 'Invalid status parameter',
        code: 'INVALID_STATUS'
      });
    }

    // Validate limit (increased to 200 to support loading all 153 establishments)
    const limitValidation = validateNumericInput(validatedParams.limit, 1, 200);
    if (!limitValidation.valid) {
      return res.status(400).json({
        error: limitValidation.error,
        code: 'INVALID_LIMIT'
      });
    }

    // Validate page
    const pageValidation = validateNumericInput(validatedParams.page, 1, 10000);
    if (!pageValidation.valid) {
      return res.status(400).json({
        error: pageValidation.error,
        code: 'INVALID_PAGE'
      });
    }

    // Calculate pagination offset
    const pageNum = pageValidation.value!;
    const limitNum = limitValidation.value!;
    const offset = (pageNum - 1) * limitNum;

    // Validate search term
    if (validatedParams.search) {
      const searchValidation = validateTextInput(validatedParams.search, 0, 100);
      if (!searchValidation.valid) {
        return res.status(400).json({
          error: `Invalid search parameter: ${searchValidation.error}`,
          code: 'INVALID_SEARCH'
        });
      }
      validatedParams.search = searchValidation.sanitized;
    }

    // Start building query safely - Include grid system fields
    // Use count query for pagination metadata
    let countQuery = supabase
      .from('establishments')
      .select('*', { count: 'exact', head: true });

    let query = supabase
      .from('establishments')
      .select(`
        id,
        name,
        address,
        zone,
        grid_row,
        grid_col,
        category_id,
        description,
        phone,
        website,
        location,
        opening_hours,
        instagram,
        twitter,
        tiktok,
        status,
        is_vip,
        vip_expires_at,
        created_at,
        updated_at,
        logo_url,
        ladydrink,
        barfine,
        rooms,
        category:establishment_categories(*)
      `);

    // Apply filters safely using Supabase's built-in parameterization (to BOTH queries)
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status);
      countQuery = countQuery.eq('status', validatedParams.status);
    }

    if (validatedParams.category_id) {
      query = query.eq('category_id', validatedParams.category_id);
      countQuery = countQuery.eq('category_id', validatedParams.category_id);
    }

    if (validatedParams.zone) {
      query = query.eq('zone', validatedParams.zone);
      countQuery = countQuery.eq('zone', validatedParams.zone);
    }

    // Safe search using Supabase's parameterized queries (to BOTH queries)
    if (validatedParams.search) {
      // Use Supabase's ilike with proper escaping
      const searchTerm = `%${validatedParams.search.replace(/[%_]/g, '\\$&')}%`;
      const searchFilter = `name.ilike."${searchTerm}",address.ilike."${searchTerm}"`;
      query = query.or(searchFilter);
      countQuery = countQuery.or(searchFilter);
    }

    // Order by grid position when zone is specified, otherwise by creation date
    if (validatedParams.zone) {
      query = query.order('grid_row').order('grid_col');
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination: range(from, to) where to = from + limit - 1
    query = query.range(offset, offset + limitNum - 1);

    // Execute both queries in parallel
    const [{ data: establishments, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ]);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get employee counts for all establishments
    let employeeCounts: { [key: string]: number } = {};
    let approvedEmployeeCounts: { [key: string]: number } = {};
    if (establishments && establishments.length > 0) {
      const establishmentIds = establishments.map((est: any) => est.id);

      // Count all current employees
      const { data: employmentData, error: employmentError } = await supabase
        .from('employment_history')
        .select('establishment_id')
        .in('establishment_id', establishmentIds)
        .eq('is_current', true);

      if (!employmentError && employmentData) {
        // Count employees per establishment
        employmentData.forEach((emp: any) => {
          const estId = emp.establishment_id;
          employeeCounts[estId] = (employeeCounts[estId] || 0) + 1;
        });
      }

      // Count only approved employees (for sorting priority)
      const { data: approvedEmploymentData, error: approvedEmploymentError } = await supabase
        .from('employment_history')
        .select('establishment_id, employees!inner(status)')
        .in('establishment_id', establishmentIds)
        .eq('is_current', true)
        .eq('employees.status', 'approved');

      if (!approvedEmploymentError && approvedEmploymentData) {
        // Count approved employees per establishment
        approvedEmploymentData.forEach((emp: any) => {
          const estId = emp.establishment_id;
          approvedEmployeeCounts[estId] = (approvedEmployeeCounts[estId] || 0) + 1;
        });
      }
    }

    // ========================================
    // BUG #3 FIX - Keep category_id as INTEGER (no transformation)
    // ========================================
    // Issue: Transforming INTEGER → STRING 'cat-XXX' created frontend complexity
    // Frontend had to convert back STRING → INTEGER for DB queries
    // Fix: Keep native INTEGER format for consistency (DB INTEGER ↔ API INTEGER)

    // Extract coordinates only (no category_id transformation)
    const establishmentsWithCoords = establishments?.map((est: any) => {
      let latitude = null;
      let longitude = null;

      if (est.location) {
        try {
          // Parse PostGIS binary format (hex-encoded)
          const coords = parsePostGISBinary(est.location);
          if (coords) {
            latitude = coords.latitude;
            longitude = coords.longitude;
          }
        } catch (err) {
          logger.error('Error parsing coordinates for establishment: ' + est.name, err);
        }
      }

      return {
        ...est,
        // Keep category_id as native INTEGER (no transformation)
        latitude,
        longitude,
        employee_count: employeeCounts[est.id] || 0, // Total employee count
        approved_employee_count: approvedEmployeeCounts[est.id] || 0 // Approved employee count (for sorting)
      };
    }) || [];

// Utility function to parse PostGIS binary format
function parsePostGISBinary(hexString: string): {latitude: number, longitude: number} | null {
  try {
    if (!hexString || typeof hexString !== 'string') return null;
    
    // PostGIS WKB format for POINT with SRID
    // Format: endianness(1) + type(4) + SRID(4) + point(16)
    if (hexString.startsWith('0101000020E6100000')) {
      // Skip the header (16 chars) and extract coordinates
      const coordsHex = hexString.substring(16);
      
      if (coordsHex.length >= 32) {
        // Each coordinate is 8 bytes (16 hex chars) in little-endian IEEE 754
        const lngHex = coordsHex.substring(0, 16);
        const latHex = coordsHex.substring(16, 32);
        
        const longitude = hexToFloat64LE(lngHex);
        const latitude = hexToFloat64LE(latHex);
        
        // Validate coordinates are in reasonable range
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          return { latitude, longitude };
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error parsing PostGIS binary:', error);
    return null;
  }
}

function hexToFloat64LE(hex: string): number {
  // Convert hex string to little-endian IEEE 754 double
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  
  // Parse hex string in little-endian order
  for (let i = 0; i < 8; i++) {
    const byteHex = hex.substr(i * 2, 2);
    const byte = parseInt(byteHex, 16);
    view.setUint8(i, byte);
  }
  
  return view.getFloat64(0, true); // true = little-endian
}

    // Check for count error
    if (countError) {
      logger.warn('Count query failed, using establishments length', { error: countError });
    }

    // Calculate pagination metadata
    const total = count || 0;
    const hasMore = offset + limitNum < total;

    // Return paginated response
    res.json({
      establishments: establishmentsWithCoords,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        hasMore,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Get establishments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEstablishment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    logger.debug('🔍 getEstablishment called with ID:', id);

    const { data: establishment, error } = await supabase
      .from('establishments')
      .select(`
        id,
        name,
        address,
        zone,
        grid_row,
        grid_col,
        category_id,
        description,
        phone,
        website,
        location,
        opening_hours,
        instagram,
        twitter,
        tiktok,
        status,
        is_vip,
        vip_expires_at,
        created_at,
        updated_at,
        created_by,
        logo_url,
        ladydrink,
        barfine,
        rooms,
        category:establishment_categories(*),
        created_by_user:users!establishments_created_by_fkey(pseudonym)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Establishment not found' });
    }

    // Transform location data using PostGIS coordinate extraction
    let latitude = null;
    let longitude = null;
    
    if (establishment.location) {
      try {
        // Use PostGIS function to extract coordinates
        const { data: coords } = await supabase.rpc('get_lat_lng_from_geography', {
          location_value: establishment.location
        });
        if (coords) {
          latitude = coords.latitude;
          longitude = coords.longitude;
        }
      } catch (locationError) {
        logger.warn('Could not extract location coordinates:', locationError);
      }
    }

    // ========================================
    // BUG #3 FIX - Keep category_id as INTEGER (no transformation)
    // ========================================
    // Removed categoryIdToString transformation for consistency

    // Load consumables for this establishment with details from consumable_templates
    const { data: consumables, error: consumablesError } = await supabase
      .from('establishment_consumables')
      .select(`
        id,
        consumable_id,
        price,
        consumable:consumable_templates(
          id,
          name,
          category,
          icon,
          default_price
        )
      `)
      .eq('establishment_id', id);

    if (consumablesError) {
      logger.warn('Could not load consumables:', consumablesError);
    }

    // Format consumables for frontend (pricing.consumables format)
    const formattedConsumables = (consumables || []).map((ec: any) => ({
      id: ec.id,
      consumable_id: ec.consumable_id,
      name: ec.consumable?.name,
      category: ec.consumable?.category,
      icon: ec.consumable?.icon,
      price: ec.price
    }));

    const pricing = {
      consumables: formattedConsumables,
      ladydrink: establishment.ladydrink || '130',
      barfine: establishment.barfine || '400',
      rooms: establishment.rooms || 'N/A'
    };

    // 🆕 v10.3 - Check if establishment has verified owner
    const { data: ownerCheck } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('establishment_id', id)
      .limit(1)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error if no owner

    const transformedEstablishment = {
      ...establishment,
      // Keep category_id as native INTEGER (consistent with DB)
      latitude,
      longitude,
      pricing, // Add pricing with consumables
      has_owner: !!ownerCheck // 🆕 v10.3 - True if establishment has verified owner
    };

    res.json({ establishment: transformedEstablishment });
  } catch (error) {
    logger.error('Get establishment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEstablishment = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('🔥 CREATE ESTABLISHMENT V3 - FINAL RELOAD FORCE - Body:', req.body);
    const { name, address, zone, category_id, description, phone, website, opening_hours, instagram, twitter, tiktok, pricing, logo_url, latitude, longitude }: any = req.body;
    logger.debug('🏢 CREATE ESTABLISHMENT - Extracted logo_url:', logo_url);

    if (!name || !address || !zone || !category_id) {
      return res.status(400).json({ error: 'Name, address, zone and category are required' });
    }

    // ========================================
    // BUG #2 FIX - Validate coordinates if provided
    // ========================================
    // Validate latitude/longitude if provided by user
    if (latitude !== undefined || longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // Validate latitude range (-90 to 90)
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({
          error: 'Invalid latitude. Must be a number between -90 and 90',
          code: 'INVALID_LATITUDE'
        });
      }

      // Validate longitude range (-180 to 180)
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          error: 'Invalid longitude. Must be a number between -180 and 180',
          code: 'INVALID_LONGITUDE'
        });
      }

      // Validate Pattaya area (rough bounds: 12.8-13.1 lat, 100.8-101.0 lng)
      // This prevents obviously wrong coordinates outside Pattaya region
      if (lat < 12.8 || lat > 13.1 || lng < 100.8 || lng > 101.0) {
        logger.warn('Coordinates outside Pattaya region', { lat, lng });
        return res.status(400).json({
          error: 'Coordinates are outside Pattaya region (12.8-13.1 lat, 100.8-101.0 lng)',
          code: 'COORDINATES_OUT_OF_RANGE'
        });
      }
    }

    // Generate default coordinates based on zone if not provided
    const getZoneCoordinates = (zone: string) => {
      switch (zone) {
        case 'Soi 6': return { latitude: 12.9342, longitude: 100.8779 };
        case 'Walking Street': return { latitude: 12.9278, longitude: 100.8701 };
        case 'LK Metro': return { latitude: 12.9389, longitude: 100.8744 };
        case 'Treetown': return { latitude: 12.9456, longitude: 100.8822 };
        default: return { latitude: 12.9342, longitude: 100.8779 }; // Default to Soi 6
      }
    };

    // Use provided coordinates or generate defaults
    const coords = (latitude !== undefined && longitude !== undefined)
      ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
      : getZoneCoordinates(zone);

    // Create location point for PostGIS
    const location = `POINT(${coords.longitude} ${coords.latitude})`;

    const { data: establishment, error } = await supabase
      .from('establishments')
      .insert({
        name,
        address, // Google Maps address as text
        zone,
        location,
        category_id,
        description,
        phone,
        website,
        logo_url, // Include logo URL for establishment branding
        opening_hours,
        instagram,
        twitter,
        tiktok,
        ladydrink: pricing?.ladydrink || null,
        barfine: pricing?.barfine || null,
        rooms: pricing?.rooms?.available ? pricing.rooms.price : 'N/A',
        status: req.user!.role === 'admin' ? 'approved' : 'pending', // Auto-approve for admins
        created_by: req.user!.id
      })
      .select(`
        id,
        name,
        address,
        zone,
        grid_row,
        grid_col,
        category_id,
        phone,
        website,
        location,
        opening_hours,
        instagram,
        twitter,
        tiktok,
        status,
        is_vip,
        vip_expires_at,
        created_at,
        updated_at,
        created_by,
        logo_url,
        ladydrink,
        barfine,
        rooms,
        category:establishment_categories(*)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Add to moderation queue
    await supabase
      .from('moderation_queue')
      .insert({
        item_type: 'establishment',
        item_id: establishment.id,
        submitted_by: req.user!.id,
        status: 'pending'
      });

    // 🔔 Notify admins of new pending content
    try {
      // Get submitter pseudonym
      const { data: submitterData } = await supabase
        .from('users')
        .select('pseudonym')
        .eq('id', req.user!.id)
        .single();

      const submitterName = submitterData?.pseudonym || 'A user';

      await notifyAdminsPendingContent(
        'establishment',
        establishment.name,
        submitterName,
        establishment.id
      );
    } catch (notifyError) {
      // Log error but don't fail the request if notification fails
      logger.error('Admin notification error:', notifyError);
    }

    // Invalidate cache after creation
    await cacheInvalidatePattern('establishments:*');
    await cacheDel('dashboard:stats');
    await cacheDel(CACHE_KEYS.CATEGORIES);

    // Return created establishment
    res.status(201).json({
      message: 'Establishment submitted for approval',
      establishment
    });
  } catch (error) {
    logger.error('Create establishment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEstablishment = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('🔄 UPDATE ESTABLISHMENT called with ID:', req.params.id);
    logger.debug('🔄 UPDATE ESTABLISHMENT body:', req.body);
    logger.debug('🔄 UPDATE ESTABLISHMENT user:', req.user);

    const { id } = req.params;
    const updates = req.body;

    // Check authorization: admin/moderator OR creator OR establishment owner (v10.1)
    const { data: establishment } = await supabase
      .from('establishments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!establishment) {
      return res.status(404).json({ error: 'Establishment not found' });
    }

    // Authorization hierarchy:
    // 1. Admin/Moderator → Full access
    // 2. Creator → Can update own establishment
    // 3. Establishment Owner (via establishment_owners table) → Can update assigned establishment
    const isAdmin = ['admin', 'moderator'].includes(req.user!.role);
    const isCreator = establishment.created_by === req.user!.id;
    const isOwner = await isEstablishmentOwner(req.user!.id, id);

    if (!isAdmin && !isCreator && !isOwner) {
      logger.warn('Unauthorized establishment update attempt', {
        userId: req.user!.id,
        establishmentId: id,
        role: req.user!.role
      });
      return res.status(403).json({
        error: 'Not authorized to update this establishment',
        code: 'ESTABLISHMENT_UPDATE_FORBIDDEN'
      });
    }

    logger.debug('Establishment update authorized', {
      userId: req.user!.id,
      establishmentId: id,
      authReason: isAdmin ? 'admin/moderator' : isCreator ? 'creator' : 'owner'
    });

    // ========================================
    // BUG #8 FIX - Enforce granular permissions for owners
    // ========================================
    // Security Issue: Owners could modify fields they don't have permission for
    // Check permissions only for owners (admin/creator have full access)
    if (isOwner && !isAdmin && !isCreator) {
      logger.debug('🔒 Checking granular permissions for owner');

      // Fetch owner permissions
      const { data: ownership, error: ownershipError } = await supabase
        .from('establishment_owners')
        .select('permissions, owner_role')
        .eq('user_id', req.user!.id)
        .eq('establishment_id', id)
        .single();

      if (ownershipError || !ownership) {
        logger.error('Failed to fetch ownership permissions:', ownershipError);
        return res.status(403).json({
          error: 'Failed to verify ownership permissions',
          code: 'OWNERSHIP_VERIFICATION_FAILED'
        });
      }

      const permissions = ownership.permissions;
      logger.debug('📋 Owner permissions:', permissions);

      // Define field → permission mapping
      const infoFields = ['name', 'address', 'description', 'phone', 'website', 'opening_hours', 'instagram', 'twitter', 'tiktok'];
      const pricingFields = ['ladydrink', 'barfine', 'rooms', 'pricing'];
      const photoFields = ['logo_url', 'photos'];

      // Check if owner is trying to modify fields they don't have permission for
      const attemptedFields = Object.keys(updates);

      // Check INFO permission
      const modifyingInfo = attemptedFields.some(field => infoFields.includes(field));
      if (modifyingInfo && !permissions.can_edit_info) {
        logger.warn('Owner attempted to edit info without permission', {
          userId: req.user!.id,
          establishmentId: id,
          attemptedFields
        });
        return res.status(403).json({
          error: 'You do not have permission to edit establishment information',
          code: 'MISSING_EDIT_INFO_PERMISSION',
          requiredPermission: 'can_edit_info'
        });
      }

      // Check PRICING permission
      const modifyingPricing = attemptedFields.some(field => pricingFields.includes(field));
      if (modifyingPricing && !permissions.can_edit_pricing) {
        logger.warn('Owner attempted to edit pricing without permission', {
          userId: req.user!.id,
          establishmentId: id,
          attemptedFields
        });
        return res.status(403).json({
          error: 'You do not have permission to edit pricing information',
          code: 'MISSING_EDIT_PRICING_PERMISSION',
          requiredPermission: 'can_edit_pricing'
        });
      }

      // Check PHOTOS permission
      const modifyingPhotos = attemptedFields.some(field => photoFields.includes(field));
      if (modifyingPhotos && !permissions.can_edit_photos) {
        logger.warn('Owner attempted to edit photos without permission', {
          userId: req.user!.id,
          establishmentId: id,
          attemptedFields
        });
        return res.status(403).json({
          error: 'You do not have permission to edit establishment photos',
          code: 'MISSING_EDIT_PHOTOS_PERMISSION',
          requiredPermission: 'can_edit_photos'
        });
      }

      logger.debug('✅ All permission checks passed for owner');
    }

    // If location is being updated, recreate the PostGIS point
    if (updates.latitude && updates.longitude) {
      updates.location = `POINT(${updates.longitude} ${updates.latitude})`;
      delete updates.latitude;
      delete updates.longitude;
    }

    // Handle consumables separately (pricing.consumables)
    if (updates.pricing?.consumables) {
      logger.debug('🔧 Updating consumables for establishment:', id);
      logger.debug('📦 New consumables:', updates.pricing.consumables);

      // Delete existing consumables
      await supabase
        .from('establishment_consumables')
        .delete()
        .eq('establishment_id', id);

      // Insert new consumables
      if (updates.pricing.consumables.length > 0) {
        const consumablesToInsert = updates.pricing.consumables.map((c: any) => ({
          establishment_id: id,
          consumable_id: c.consumable_id,
          price: c.price
        }));

        const { error: consumablesError } = await supabase
          .from('establishment_consumables')
          .insert(consumablesToInsert);

        if (consumablesError) {
          logger.error('❌ Failed to update consumables:', consumablesError);
        } else {
          logger.debug('✅ Consumables updated successfully');
        }
      }
    }

    // Transform pricing object to flat database columns (same as createEstablishment)
    if (updates.pricing) {
      // Handle rooms toggle: available=true → save price, available=false → save 'N/A'
      if (updates.pricing.rooms !== undefined) {
        updates.rooms = updates.pricing.rooms.available ? updates.pricing.rooms.price : 'N/A';
        logger.debug('🏠 Rooms transformation:', {
          input: updates.pricing.rooms,
          output: updates.rooms
        });
      }

      // Handle ladydrink and barfine from pricing object
      if (updates.pricing.ladydrink !== undefined) {
        updates.ladydrink = updates.pricing.ladydrink;
      }
      if (updates.pricing.barfine !== undefined) {
        updates.barfine = updates.pricing.barfine;
      }
    }

    // Filter only allowed fields to prevent database errors
    const allowedFields = {
      name: updates.name,
      address: updates.address,
      description: updates.description,
      phone: updates.phone,
      website: updates.website,
      opening_hours: updates.opening_hours,
      instagram: updates.instagram,
      twitter: updates.twitter,
      tiktok: updates.tiktok,
      category_id: updates.category_id,
      zone: updates.zone,
      grid_row: updates.grid_row,
      grid_col: updates.grid_col,
      ladydrink: updates.ladydrink,
      barfine: updates.barfine,
      rooms: updates.rooms,
      logo_url: updates.logo_url  // ← ADD logo_url field to allowed fields
      // Note: pricing is NOT saved to establishments table, it's handled separately above
    };

    // Remove undefined values to avoid updating with null/undefined
    const cleanUpdates = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    // DEBUG: Log logo_url specifically
    logger.debug('🎨 LOGO UPDATE DEBUG:', {
      'original_logo_url': updates.logo_url,
      'allowedFields_logo_url': allowedFields.logo_url,
      'cleanUpdates_logo_url': cleanUpdates.logo_url,
      'cleanUpdates_keys': Object.keys(cleanUpdates)
    });

    // Non-admin updates go back to pending status
    if (req.user!.role !== 'admin') {
      cleanUpdates.status = 'pending';
    }

    const { data: updatedEstablishment, error } = await supabase
      .from('establishments')
      .update(cleanUpdates)
      .eq('id', id)
      .select(`
        id,
        name,
        address,
        zone,
        grid_row,
        grid_col,
        category_id,
        phone,
        website,
        location,
        opening_hours,
        instagram,
        twitter,
        tiktok,
        status,
        is_vip,
        vip_expires_at,
        created_at,
        updated_at,
        created_by,
        description,
        ladydrink,
        barfine,
        rooms,
        logo_url
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Load consumables for the updated establishment (same as GET)
    const { data: consumables, error: consumablesError } = await supabase
      .from('establishment_consumables')
      .select(`
        id,
        consumable_id,
        price,
        consumable:consumable_templates(
          id,
          name,
          category,
          icon,
          default_price
        )
      `)
      .eq('establishment_id', id);

    if (consumablesError) {
      logger.warn('Could not load consumables after update:', consumablesError);
    }

    // Format consumables for frontend
    const formattedConsumables = (consumables || []).map((ec: any) => ({
      id: ec.id,
      consumable_id: ec.consumable_id,
      name: ec.consumable?.name,
      category: ec.consumable?.category,
      icon: ec.consumable?.icon,
      price: ec.price
    }));

    // Format response with pricing (including consumables)
    const pricing = {
      consumables: formattedConsumables,
      ladydrink: updatedEstablishment.ladydrink || '130',
      barfine: updatedEstablishment.barfine || '400',
      rooms: updatedEstablishment.rooms || 'N/A'
    };

    // Invalidate cache after update
    await cacheDel(CACHE_KEYS.ESTABLISHMENT(id));
    await cacheInvalidatePattern('establishments:*');
    await cacheDel('dashboard:stats');

    res.json({
      message: 'Establishment updated successfully',
      establishment: {
        ...updatedEstablishment,
        pricing
      }
    });
  } catch (error) {
    logger.error('Update establishment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEstablishment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check authorization: admin/moderator OR creator OR establishment owner (v10.1)
    const { data: establishment } = await supabase
      .from('establishments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!establishment) {
      return res.status(404).json({ error: 'Establishment not found' });
    }

    // Authorization hierarchy (same as update)
    const isAdmin = ['admin', 'moderator'].includes(req.user!.role);
    const isCreator = establishment.created_by === req.user!.id;
    const isOwner = await isEstablishmentOwner(req.user!.id, id);

    if (!isAdmin && !isCreator && !isOwner) {
      logger.warn('Unauthorized establishment delete attempt', {
        userId: req.user!.id,
        establishmentId: id,
        role: req.user!.role
      });
      return res.status(403).json({
        error: 'Not authorized to delete this establishment',
        code: 'ESTABLISHMENT_DELETE_FORBIDDEN'
      });
    }

    logger.debug('Establishment delete authorized', {
      userId: req.user!.id,
      establishmentId: id,
      authReason: isAdmin ? 'admin/moderator' : isCreator ? 'creator' : 'owner'
    });

    const { error } = await supabase
      .from('establishments')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Establishment deleted successfully' });
  } catch (error) {
    logger.error('Delete establishment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEstablishmentGridPosition = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('🔍 DEBUG - Raw request body type:', typeof req.body);
    logger.debug('🔍 DEBUG - Raw request body:', req.body);
    logger.debug('🔍 DEBUG - Request headers:', req.headers);

    const { id } = req.params;
    const { grid_row, grid_col, zone, swap_with_id } = req.body;

    logger.debug('🎯 GRID POSITION UPDATE REQUEST:', {
      establishmentId: id,
      requestBody: req.body,
      user: req.user ? `${req.user.pseudonym} (${req.user.role})` : 'no user',
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!grid_row || !grid_col || !zone) {
      logger.error('❌ VALIDATION FAILED - missing required fields:', { grid_row, grid_col, zone });
      return res.status(400).json({
        error: 'grid_row, grid_col, and zone are required'
      });
    }

    // Validate grid position bounds (extensible - will be configurable later)
    if (grid_row < 1 || grid_row > 2) {
      return res.status(400).json({
        error: 'grid_row must be between 1 and 2'
      });
    }

    if (grid_col < 1 || grid_col > 20) {
      return res.status(400).json({
        error: 'grid_col must be between 1 and 20'
      });
    }

    // Check if user has permission (admin/moderator only)
    if (!['admin', 'moderator'].includes(req.user!.role)) {
      logger.error('❌ PERMISSION DENIED:', {
        userRole: req.user!.role,
        requiredRoles: ['admin', 'moderator'],
        userId: req.user!.id
      });
      return res.status(403).json({
        error: 'Only admin/moderator can modify grid positions'
      });
    }

    logger.debug('✅ PERMISSION GRANTED:', {
      userRole: req.user!.role,
      userId: req.user!.id
    });

    // Get current establishment
    const { data: currentEst } = await supabase
      .from('establishments')
      .select('id, name, grid_row, grid_col, zone')
      .eq('id', id)
      .single();

    if (!currentEst) {
      return res.status(404).json({ error: 'Establishment not found' });
    }

    // Check if target position is occupied
    const { data: existingEst } = await supabase
      .from('establishments')
      .select('id, name, grid_row, grid_col')
      .eq('zone', zone)
      .eq('grid_row', grid_row)
      .eq('grid_col', grid_col)
      .neq('id', id)
      .single();

    if (existingEst && !swap_with_id) {
      return res.status(409).json({
        error: 'Position already occupied',
        occupied_by: {
          id: existingEst.id,
          name: existingEst.name
        },
        suggestion: 'Use swap_with_id to exchange positions'
      });
    }

    // If swapping positions
    if (swap_with_id && existingEst) {
      if (existingEst.id !== swap_with_id) {
        return res.status(400).json({
          error: 'swap_with_id does not match the establishment at target position'
        });
      }

      // Perform position swap
      const { error: swapError } = await supabase.rpc('swap_establishment_positions', {
        est1_id: id,
        est2_id: swap_with_id,
        new_row1: grid_row,
        new_col1: grid_col,
        new_row2: currentEst.grid_row,
        new_col2: currentEst.grid_col
      });

      if (swapError) {
        return res.status(500).json({ error: 'Failed to swap positions' });
      }

      logger.debug(`🔄 GRID SWAP: ${currentEst.name} (${currentEst.grid_row},${currentEst.grid_col}) ↔ ${existingEst.name} (${grid_row},${grid_col})`);

      return res.json({
        message: 'Positions swapped successfully',
        swapped: {
          establishment1: { id, name: currentEst.name, new_position: { grid_row, grid_col } },
          establishment2: { id: swap_with_id, name: existingEst.name, new_position: { grid_row: currentEst.grid_row, grid_col: currentEst.grid_col } }
        }
      });
    }

    // Simple position update (no conflict)
    logger.debug('🗄️ UPDATING DATABASE:', {
      establishmentId: id,
      updateData: { grid_row, grid_col, zone },
      operation: 'simple_move'
    });

    const { data: updatedEst, error } = await supabase
      .from('establishments')
      .update({ grid_row, grid_col, zone })
      .eq('id', id)
      .select('id, name, grid_row, grid_col, zone')
      .single();

    if (error) {
      logger.error('❌ DATABASE UPDATE FAILED:', {
        error: error.message,
        establishmentId: id,
        updateData: { grid_row, grid_col, zone }
      });
      return res.status(400).json({ error: error.message });
    }

    logger.debug('✅ DATABASE UPDATE SUCCESS:', {
      before: `${currentEst.name} (${currentEst.grid_row},${currentEst.grid_col})`,
      after: `${updatedEst.name} (${updatedEst.grid_row},${updatedEst.grid_col})`,
      establishment: updatedEst
    });

    logger.debug(`📍 GRID MOVE: ${updatedEst.name} → (${grid_row},${grid_col}) in ${zone}`);

    res.json({
      message: 'Grid position updated successfully',
      establishment: updatedEst
    });

  } catch (error) {
    logger.error('Update grid position error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEstablishmentLogo = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug('🔧 UPDATE LOGO - Start function');
    logger.debug('🔧 UPDATE LOGO - Request params:', req.params);
    logger.debug('🔧 UPDATE LOGO - Request body:', req.body);
    logger.debug('🔧 UPDATE LOGO - User:', req.user);

    const { id } = req.params;
    const { logo_url } = req.body;

    logger.debug('🔧 UPDATE LOGO - Extracted ID:', id);
    logger.debug('🔧 UPDATE LOGO - Extracted logo_url:', logo_url);

    // Verify user is admin or moderator
    if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
      logger.debug('❌ UPDATE LOGO - Permission denied for user:', req.user);
      return res.status(403).json({ error: 'Admin or moderator access required' });
    }

    logger.debug('✅ UPDATE LOGO - Permission granted for:', req.user.role);

    // Validate establishment ID
    if (!id) {
      logger.debug('❌ UPDATE LOGO - Missing establishment ID');
      return res.status(400).json({ error: 'Establishment ID is required' });
    }

    // Validate logo URL
    if (!logo_url || typeof logo_url !== 'string') {
      logger.debug('❌ UPDATE LOGO - Invalid logo URL:', { logo_url, type: typeof logo_url });
      return res.status(400).json({ error: 'Valid logo URL is required' });
    }

    logger.debug('🗄️ UPDATE LOGO - Updating database...');

    // Update establishment logo in database
    const { data: establishment, error } = await supabase
      .from('establishments')
      .update({
        logo_url: logo_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, name, logo_url')
      .single();

    logger.debug('🗄️ UPDATE LOGO - Database response:', { data: establishment, error });

    if (error) {
      logger.error('❌ UPDATE LOGO - Database update error:', error);
      return res.status(400).json({ error: error.message });
    }

    if (!establishment) {
      logger.debug('❌ UPDATE LOGO - Establishment not found');
      return res.status(404).json({ error: 'Establishment not found' });
    }

    logger.debug('✅ UPDATE LOGO - Success! Updated establishment:', establishment);

    res.json({
      message: 'Establishment logo updated successfully',
      establishment: establishment
    });
  } catch (error) {
    logger.error('❌ UPDATE LOGO - Catch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEstablishmentCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { data: categories, error } = await supabase
      .from('establishment_categories')
      .select('*')
      .order('name');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ categories });
  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/establishments/:id/employees
 *
 * Returns all employees working at an establishment.
 * Only accessible by establishment owners/managers.
 *
 * @param req.params.id - Establishment ID
 * @param req.user.id - Current user ID
 * @returns { employees[], total, establishment }
 */
export const getEstablishmentEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // establishment_id
    const user_id = req.user?.id;

    // 1. Check ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from('establishment_owners')
      .select('*')
      .eq('user_id', user_id)
      .eq('establishment_id', id)
      .single();

    if (ownershipError || !ownership) {
      logger.warn('Unauthorized employee list access attempt', {
        userId: user_id,
        establishmentId: id
      });
      return res.status(403).json({
        error: 'You are not authorized to view employees of this establishment'
      });
    }

    logger.debug('Establishment employee list access authorized', {
      userId: user_id,
      establishmentId: id,
      ownerRole: ownership.owner_role
    });

    // 2. Fetch establishment info (v10.3: include category to check if nightclub)
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select(`
        id,
        name,
        zone,
        category:establishment_categories(name)
      `)
      .eq('id', id)
      .single();

    if (estError) {
      logger.error('Establishment not found:', estError);
      return res.status(404).json({ error: 'Establishment not found' });
    }

    const isNightclub = (establishment.category as any)?.name === 'Nightclub';

    // 3. Fetch employees via current_employment
    const { data: employments, error: empError } = await supabase
      .from('current_employment')
      .select(`
        employee_id,
        start_date,
        employee:employees!current_employment_employee_id_fkey(
          id,
          name,
          age,
          nationality,
          photos,
          status,
          average_rating,
          comment_count,
          is_freelance
        )
      `)
      .eq('establishment_id', id);

    if (empError) {
      logger.error('Failed to fetch employees:', empError);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    // 4. Extract regular employees and add current_employment info
    let employees = employments
      .filter(emp => emp.employee) // Filter out null employees
      .map(emp => ({
        ...(emp.employee as any),
        current_employment: {
          establishment_id: id,
          establishment_name: establishment.name,
          start_date: emp.start_date
        },
        employee_type: (emp.employee as any).is_freelance ? 'freelance' : 'regular'
      }));

    // 5. v10.3: If nightclub, also fetch associated freelances
    if (isNightclub) {
      logger.debug('Nightclub detected, fetching associated freelances', { establishmentId: id });

      const { data: freelanceEmployments, error: freelanceError } = await supabase
        .from('employment_history')
        .select(`
          employee_id,
          start_date,
          employee:employees(
            id,
            name,
            age,
            nationality,
            photos,
            status,
            average_rating,
            comment_count,
            is_freelance
          )
        `)
        .eq('establishment_id', id)
        .eq('is_current', true);

      if (!freelanceError && freelanceEmployments) {
        const freelances = freelanceEmployments
          .filter(emp => emp.employee && (emp.employee as any).is_freelance === true)
          .map(emp => ({
            ...(emp.employee as any),
            current_employment: {
              establishment_id: id,
              establishment_name: establishment.name,
              start_date: emp.start_date
            },
            employee_type: 'freelance'
          }));

        // Merge freelances with regular employees (avoid duplicates by employee_id)
        const existingIds = new Set(employees.map((e: any) => e.id));
        const newFreelances = freelances.filter((f: any) => !existingIds.has(f.id));

        employees = [...employees, ...newFreelances];

        logger.debug('Freelances merged', {
          regularCount: employees.length - newFreelances.length,
          freelanceCount: newFreelances.length,
          totalCount: employees.length
        });
      }
    }

    // 5. Fetch VIP status for each employee (parallel)
    const employeesWithVIP = await Promise.all(
      employees.map(async (emp: any) => {
        // Check if employee_vip_subscriptions table exists (will in Phase 1-3)
        // For now, return default values
        try {
          const { data: vipSub } = await supabase
            .from('employee_vip_subscriptions')
            .select('id, expires_at, status')
            .eq('employee_id', emp.id)
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .maybeSingle();

          return {
            ...emp,
            is_vip: !!vipSub,
            vip_expires_at: vipSub?.expires_at || null
          };
        } catch (error) {
          // Table doesn't exist yet (VIP not implemented)
          return {
            ...emp,
            is_vip: false,
            vip_expires_at: null
          };
        }
      })
    );

    logger.debug('Successfully fetched employees', {
      establishmentId: id,
      employeeCount: employeesWithVIP.length
    });

    res.json({
      employees: employeesWithVIP,
      total: employeesWithVIP.length,
      establishment
    });

  } catch (error) {
    logger.error('Get establishment employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};