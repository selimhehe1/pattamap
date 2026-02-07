import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest, isEstablishmentOwner } from '../middleware/auth';
import { validateTextInput, validateNumericInput, prepareFilterParams } from '../utils/validation';
import { logger } from '../utils/logger';
import { cacheDel, cacheInvalidatePattern, CACHE_KEYS } from '../config/redis';
import { notifyAdminsPendingContent } from '../utils/notificationHelper';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../middleware/asyncHandler';
import { missionTrackingService } from '../services/missionTrackingService';
import {
  validateCoordinates,
  getEstablishmentCoordinates,
  createLocationPoint,
  fetchEmployeeCounts,
  fetchOwnershipMap,
  mapEstablishmentsWithExtras,
  DbEstablishmentWithLocation,
  ConsumableInput,
  EstablishmentConsumableWithTemplate,
  checkOwnerPermissions,
  updateEstablishmentConsumables,
  fetchFormattedConsumables
} from '../utils/establishmentHelpers';


// Create establishment request body
interface CreateEstablishmentBody {
  name: string;
  address: string;
  zone: string;
  category_id: string | number;
  description?: string;
  phone?: string;
  website?: string;
  opening_hours?: Record<string, unknown>;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  pricing?: {
    consumables?: ConsumableInput[];
    ladydrink?: string;
    barfine?: string;
    rooms?: string | { available?: boolean; price?: string };
  };
  logo_url?: string;
  latitude?: string | number;
  longitude?: string | number;
}

// Helper functions are imported from establishmentHelpers.ts

export const getEstablishments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { category_id, status = 'approved', search, limit = 50, page = 1, zone, cursor: _cursor } = req.query;

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
    throw BadRequestError('Invalid status parameter');
  }

  // Validate limit (increased to 200 to support loading all 153 establishments)
  const limitValidation = validateNumericInput(validatedParams.limit, 1, 200);
  if (!limitValidation.valid) {
    throw BadRequestError(limitValidation.error || 'Invalid limit parameter');
  }

  // Validate page
  const pageValidation = validateNumericInput(validatedParams.page, 1, 10000);
  if (!pageValidation.valid) {
    throw BadRequestError(pageValidation.error || 'Invalid page parameter');
  }

  // Calculate pagination offset
  const pageNum = pageValidation.value!;
  const limitNum = limitValidation.value!;
  const offset = (pageNum - 1) * limitNum;

  // Validate search term
  if (validatedParams.search) {
    const searchValidation = validateTextInput(validatedParams.search, 0, 100);
    if (!searchValidation.valid || searchValidation.sanitized === undefined) {
      throw BadRequestError(`Invalid search parameter: ${searchValidation.error}`);
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
    throw BadRequestError(error.message);
  }

  // Fetch employee counts and ownership data using helper functions
  let establishmentsWithCoords: ReturnType<typeof mapEstablishmentsWithExtras> = [];
  if (establishments && establishments.length > 0) {
    const establishmentIds = establishments.map((est: DbEstablishmentWithLocation) => est.id);

    // Fetch extra data in parallel
    const [employeeData, ownerMap] = await Promise.all([
      fetchEmployeeCounts(establishmentIds),
      fetchOwnershipMap(establishmentIds)
    ]);

    // Map establishments with coordinates and extra data
    establishmentsWithCoords = mapEstablishmentsWithExtras(
      establishments,
      employeeData.total,
      employeeData.approved,
      ownerMap
    );
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
});

export const getEstablishment = asyncHandler(async (req: AuthRequest, res: Response) => {
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
    throw NotFoundError('Establishment not found');
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
  // Note: Supabase returns nested relations as arrays
  const formattedConsumables = (consumables || []).map((ec: EstablishmentConsumableWithTemplate) => ({
    id: ec.id,
    consumable_id: ec.consumable_id,
    name: ec.consumable?.[0]?.name,
    category: ec.consumable?.[0]?.category,
    icon: ec.consumable?.[0]?.icon,
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
});

export const createEstablishment = asyncHandler(async (req: AuthRequest, res: Response) => {
  logger.debug('🔥 CREATE ESTABLISHMENT V3 - FINAL RELOAD FORCE - Body:', req.body);
  const { name, address, zone, category_id, description, phone, website, opening_hours, instagram, twitter, tiktok, pricing, logo_url, latitude, longitude } = req.body as CreateEstablishmentBody;
  logger.debug('🏢 CREATE ESTABLISHMENT - Extracted logo_url:', logo_url);

  if (!name || !address || !zone || !category_id) {
    throw BadRequestError('Name, address, zone and category are required');
  }

  // Validate coordinates using helper
  const coordValidation = validateCoordinates(latitude, longitude);
  if (!coordValidation.valid) {
    throw BadRequestError(coordValidation.error || 'Invalid coordinates');
  }

  // Get coordinates using helper (uses zone defaults if not provided)
  const coords = getEstablishmentCoordinates(zone, latitude, longitude);
  const location = createLocationPoint(coords);

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
      rooms: typeof pricing?.rooms === 'object' && pricing.rooms?.available ? pricing.rooms.price : (typeof pricing?.rooms === 'string' ? pricing.rooms : 'N/A'),
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
    throw BadRequestError(error.message);
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
});

// Helper functions are imported from establishmentHelpers.ts:
// - checkOwnerPermissions
// - updateEstablishmentConsumables
// - fetchNightclubFreelances
// - fetchFormattedConsumables

export const updateEstablishment = asyncHandler(async (req: AuthRequest, res: Response) => {
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
    throw NotFoundError('Establishment not found');
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
    throw ForbiddenError('Not authorized to update this establishment');
  }

  logger.debug('Establishment update authorized', {
    userId: req.user!.id,
    establishmentId: id,
    authReason: isAdmin ? 'admin/moderator' : isCreator ? 'creator' : 'owner'
  });

  // Check granular permissions for owners (admin/creator have full access)
  if (isOwner && !isAdmin && !isCreator) {
    await checkOwnerPermissions(req.user!.id, id, updates);
  }

  // If location is being updated, recreate the PostGIS point
  if (updates.latitude && updates.longitude) {
    updates.location = `POINT(${updates.longitude} ${updates.latitude})`;
    delete updates.latitude;
    delete updates.longitude;
  }

  // Handle consumables separately
  if (updates.pricing?.consumables) {
    await updateEstablishmentConsumables(id, updates.pricing.consumables);
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
    throw BadRequestError(error.message);
  }

  // Load and format consumables for response
  const formattedConsumables = await fetchFormattedConsumables(id);

  // Format response with pricing
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

  // Track mission progress for establishment owners
  if (req.user!.account_type === 'establishment_owner') {
    try {
      const updateFields = Object.keys(cleanUpdates);
      await missionTrackingService.onEstablishmentUpdated(req.user!.id, id, updateFields);
    } catch (missionError) {
      logger.error('Mission tracking error (establishment update):', missionError);
    }
  }

  res.json({
    message: 'Establishment updated successfully',
    establishment: {
      ...updatedEstablishment,
      pricing
    }
  });
});

export const deleteEstablishment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check authorization: admin/moderator OR creator OR establishment owner (v10.1)
  const { data: establishment } = await supabase
    .from('establishments')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!establishment) {
    throw NotFoundError('Establishment not found');
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
    throw ForbiddenError('Not authorized to delete this establishment');
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
    throw BadRequestError(error.message);
  }

  res.json({ message: 'Establishment deleted successfully' });
});

// Grid and logo functions are in establishmentGridController.ts
export { updateEstablishmentGridPosition, updateEstablishmentLogo, getEstablishmentEmployees } from './establishmentGridController';

export const getEstablishmentCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { data: categories, error } = await supabase
    .from('establishment_categories')
    .select('*')
    .order('name');

  if (error) {
    throw BadRequestError(error.message);
  }

  res.json({ categories });
});

// getEstablishmentEmployees is exported from establishmentGridController
