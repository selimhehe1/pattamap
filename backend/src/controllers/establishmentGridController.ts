/**
 * Establishment Grid Controller
 *
 * Handles grid position management and logo updates for establishments.
 * Extracted from establishmentController.ts
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError, InternalServerError } from '../middleware/asyncHandler';
import { fetchNightclubFreelances } from '../utils/establishmentHelpers';

// Employee with ID for mapping
interface EmployeeWithId {
  id: string;
}

// Employee data returned from Supabase relationship queries
interface EmployeeFromQuery {
  id: string;
  name: string;
  age?: number;
  nationality?: string[];
  photos?: string[];
  status: string;
  average_rating?: number;
  comment_count?: number;
  is_freelance?: boolean;
}

/**
 * Update grid position for an establishment (admin/moderator only)
 * PATCH /api/establishments/:id/grid-position
 */
export const updateEstablishmentGridPosition = asyncHandler(async (req: AuthRequest, res: Response) => {
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
    throw BadRequestError('grid_row, grid_col, and zone are required');
  }

  // Validate grid position bounds (extensible - will be configurable later)
  if (grid_row < 1 || grid_row > 2) {
    throw BadRequestError('grid_row must be between 1 and 2');
  }

  if (grid_col < 1 || grid_col > 20) {
    throw BadRequestError('grid_col must be between 1 and 20');
  }

  // Check if user has permission (admin/moderator only)
  if (!['admin', 'moderator'].includes(req.user!.role)) {
    logger.error('❌ PERMISSION DENIED:', {
      userRole: req.user!.role,
      requiredRoles: ['admin', 'moderator'],
      userId: req.user!.id
    });
    throw ForbiddenError('Only admin/moderator can modify grid positions');
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
    throw NotFoundError('Establishment not found');
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
      throw BadRequestError('swap_with_id does not match the establishment at target position');
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
      throw InternalServerError('Failed to swap positions');
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
    throw BadRequestError(error.message);
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
});

/**
 * Update establishment logo (admin/moderator only)
 * PATCH /api/establishments/:id/logo
 */
export const updateEstablishmentLogo = asyncHandler(async (req: AuthRequest, res: Response) => {
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
    throw ForbiddenError('Admin or moderator access required');
  }

  logger.debug('✅ UPDATE LOGO - Permission granted for:', req.user.role);

  // Validate establishment ID
  if (!id) {
    logger.debug('❌ UPDATE LOGO - Missing establishment ID');
    throw BadRequestError('Establishment ID is required');
  }

  // Validate logo URL
  if (!logo_url || typeof logo_url !== 'string') {
    logger.debug('❌ UPDATE LOGO - Invalid logo URL:', { logo_url, type: typeof logo_url });
    throw BadRequestError('Valid logo URL is required');
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
    throw BadRequestError(error.message);
  }

  if (!establishment) {
    logger.debug('❌ UPDATE LOGO - Establishment not found');
    throw NotFoundError('Establishment not found');
  }

  logger.debug('✅ UPDATE LOGO - Success! Updated establishment:', establishment);

  res.json({
    message: 'Establishment logo updated successfully',
    establishment: establishment
  });
});

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
export const getEstablishmentEmployees = asyncHandler(async (req: AuthRequest, res: Response) => {
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
    throw ForbiddenError('You are not authorized to view employees of this establishment');
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
    throw NotFoundError('Establishment not found');
  }

  const categoryData = establishment.category as { name: string }[] | null;
  const isNightclub = categoryData?.[0]?.name === 'Nightclub';

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
    throw InternalServerError('Failed to fetch employees');
  }

  // 4. Extract regular employees and add current_employment info
  let employees = employments
    .filter(emp => emp.employee) // Filter out null employees
    .map(emp => {
      const employeeArray = emp.employee as EmployeeFromQuery[] | null;
      const employee = employeeArray?.[0];
      if (!employee) return null;
      return {
        ...employee,
        current_employment: {
          establishment_id: id,
          establishment_name: establishment.name,
          start_date: emp.start_date
        },
        employee_type: employee.is_freelance ? 'freelance' : 'regular'
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  // 5. v10.3: If nightclub, also fetch associated freelances
  if (isNightclub) {
    const existingIds = new Set(employees.map((e: EmployeeWithId) => e.id));
    const freelances = await fetchNightclubFreelances(id, establishment.name, existingIds);
    employees = [...employees, ...freelances];
  }

  // 6. Fetch VIP status for all employees in a single query (optimized from N+1)
  type EmployeeWithVIP = (typeof employees)[number] & { is_vip: boolean; vip_expires_at: string | null };
  let employeesWithVIP: EmployeeWithVIP[] = employees.map(emp => ({ ...emp, is_vip: false, vip_expires_at: null }));

  try {
    const employeeIds = employees.map((emp: EmployeeWithId) => emp.id);
    const { data: vipSubs } = await supabase
      .from('employee_vip_subscriptions')
      .select('employee_id, expires_at')
      .in('employee_id', employeeIds)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString());

    // Create a map for O(1) lookup
    const vipMap = new Map(
      (vipSubs || []).map((sub: { employee_id: string; expires_at: string }) => [sub.employee_id, sub.expires_at])
    );

    employeesWithVIP = employees.map(emp => ({
      ...emp,
      is_vip: vipMap.has(emp.id),
      vip_expires_at: vipMap.get(emp.id) || null
    }));
  } catch {
    // Table doesn't exist yet or query failed - keep default without VIP info
  }

  logger.debug('Successfully fetched employees', {
    establishmentId: id,
    employeeCount: employeesWithVIP.length
  });

  res.json({
    employees: employeesWithVIP,
    total: employeesWithVIP.length,
    establishment
  });
});
