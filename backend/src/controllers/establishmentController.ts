import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateEstablishmentRequest, Establishment } from '../types';
import { validateTextInput, validateNumericInput, prepareFilterParams } from '../utils/validation';
import { logger } from '../utils/logger';
import { paginateQuery, validatePaginationParams, offsetFromPage, buildOffsetPaginationMeta } from '../utils/pagination';

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

    // Validate limit
    const limitValidation = validateNumericInput(validatedParams.limit, 1, 100);
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
        phone,
        website,
        location,
        opening_hours,
        services,
        status,
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

    // Helper function to convert category_id INTEGER to STRING format
    const categoryIdToString = (categoryId: number): string => {
      if (!categoryId) return 'cat-001'; // default fallback
      return `cat-${String(categoryId).padStart(3, '0')}`;
    };

    // Extract coordinates and transform category_id INTEGER → STRING
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

      // Transform category_id from DB INTEGER to API STRING
      const originalCategoryId = est.category_id;
      const transformedCategoryId = categoryIdToString(originalCategoryId);

      return {
        ...est,
        category_id: transformedCategoryId, // ALWAYS STRING format 'cat-001'
        latitude,
        longitude
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
        phone,
        website,
        location,
        opening_hours,
        services,
        status,
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

    // Helper function to convert category_id INTEGER to STRING format
    const categoryIdToString = (categoryId: number): string => {
      if (!categoryId) return 'cat-001'; // default fallback
      return `cat-${String(categoryId).padStart(3, '0')}`;
    };

    // Transform category_id from INTEGER to STRING (same as getEstablishments)
    const originalCategoryId = establishment.category_id;
    const transformedCategoryId = categoryIdToString(originalCategoryId);

    logger.debug(`🔥 getEstablishment - TRANSFORM ${establishment.name}: category_id ${originalCategoryId} → ${transformedCategoryId}`);

    // Load consumables for this establishment
    const { data: consumables, error: consumablesError } = await supabase
      .from('establishment_consumables')
      .select('consumable_id, price')
      .eq('establishment_id', id);

    if (consumablesError) {
      logger.warn('Could not load consumables:', consumablesError);
    }

    // Format consumables for frontend (pricing.consumables format)
    const pricing = {
      consumables: consumables || [],
      ladydrink: establishment.ladydrink || '130',
      barfine: establishment.barfine || '400',
      rooms: establishment.rooms || 'N/A'
    };

    const transformedEstablishment = {
      ...establishment,
      category_id: transformedCategoryId, // 🔥 ALWAYS STRING format 'cat-XXX'
      latitude,
      longitude,
      pricing // Add pricing with consumables
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
    const { name, address, zone, category_id, description, phone, website, opening_hours, services, pricing, logo_url }: any = req.body;
    logger.debug('🏢 CREATE ESTABLISHMENT - Extracted logo_url:', logo_url);

    if (!name || !address || !zone || !category_id) {
      return res.status(400).json({ error: 'Name, address, zone and category are required' });
    }

    // Generate default coordinates based on zone
    const getZoneCoordinates = (zone: string) => {
      switch (zone) {
        case 'Soi 6': return { latitude: 12.9342, longitude: 100.8779 };
        case 'Walking Street': return { latitude: 12.9278, longitude: 100.8701 };
        case 'LK Metro': return { latitude: 12.9389, longitude: 100.8744 };
        case 'Treetown': return { latitude: 12.9456, longitude: 100.8822 };
        default: return { latitude: 12.9342, longitude: 100.8779 }; // Default to Soi 6
      }
    };

    const coords = getZoneCoordinates(zone);
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
        services,
        ladydrink: pricing?.ladydrink || null,
        barfine: pricing?.barfine || null,
        rooms: pricing?.rooms?.available ? pricing.rooms.price : null,
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
        services,
        status,
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

    // Check if user owns this establishment or is admin/moderator
    const { data: establishment } = await supabase
      .from('establishments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!establishment) {
      return res.status(404).json({ error: 'Establishment not found' });
    }

    if (establishment.created_by !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Not authorized to update this establishment' });
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

    // Filter only allowed fields to prevent database errors
    const allowedFields = {
      name: updates.name,
      address: updates.address,
      description: updates.description,
      phone: updates.phone,
      website: updates.website,
      opening_hours: updates.opening_hours,
      services: updates.services,
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
        services,
        status,
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
      .select('consumable_id, price')
      .eq('establishment_id', id);

    if (consumablesError) {
      logger.warn('Could not load consumables after update:', consumablesError);
    }

    // Format response with pricing (including consumables)
    const pricing = {
      consumables: consumables || [],
      ladydrink: updatedEstablishment.ladydrink || '130',
      barfine: updatedEstablishment.barfine || '400',
      rooms: updatedEstablishment.rooms || 'N/A'
    };

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

    // Check permissions
    const { data: establishment } = await supabase
      .from('establishments')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!establishment) {
      return res.status(404).json({ error: 'Establishment not found' });
    }

    if (establishment.created_by !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this establishment' });
    }

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