/**
 * @deprecated since v10.3
 *
 * ⚠️ DEPRECATED: This controller is deprecated as of v10.3
 *
 * The independent_positions table is no longer used for freelances.
 * Freelances are now managed through the standard employment_history table
 * with multi-nightclub association support.
 *
 * Migration: Freelances now:
 * - Use is_freelance flag on employees table
 * - Associate with nightclubs via employment_history (can_work_multiple = true)
 * - Appear in dedicated /freelances page
 * - Filter via search with type=freelance
 *
 * See: backend/database/migrations/013_refactor_freelance_nightclub_system.sql
 *
 * This file is kept for backward compatibility but should not be used for new features.
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateIndependentPositionRequest, UpdateIndependentPositionRequest } from '../types';
import { logger } from '../utils/logger';

/**
 * Get independent position for a specific employee
 * @deprecated since v10.3 - Use /api/employees?type=freelance instead
 */
export const getIndependentPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;

    const { data, error } = await supabase
      .from('independent_positions')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Error fetching independent position:', error);
      return res.status(500).json({ error: 'Failed to fetch independent position' });
    }

    res.json({ data: data || null });
  } catch (error) {
    logger.error('Error in getIndependentPosition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all active freelances for the map
 * @deprecated since v10.3 - Use /api/freelances instead
 */
export const getFreelancesForMap = async (req: AuthRequest, res: Response) => {
  try {
    const { zone } = req.query;

    let query = supabase
      .from('independent_positions')
      .select(`
        *,
        employee:employees(
          id,
          name,
          nickname,
          age,
          nationality,
          photos,
          description,
          social_media,
          status
        )
      `)
      .eq('is_active', true)
      .eq('employees.status', 'approved');

    // Filter by zone if provided
    if (zone) {
      query = query.eq('zone', zone);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching freelances for map:', error);
      return res.status(500).json({ error: 'Failed to fetch freelances' });
    }

    res.json({ data: data || [] });
  } catch (error) {
    logger.error('Error in getFreelancesForMap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create an independent position for an employee (freelance mode)
 * @deprecated since v10.3 - Freelances now use employment_history with is_freelance flag
 */
export const createIndependentPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, zone, grid_row, grid_col }: CreateIndependentPositionRequest = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate required fields
    if (!employee_id || !zone || !grid_row || !grid_col) {
      return res.status(400).json({ error: 'employee_id, zone, grid_row, and grid_col are required' });
    }

    // RESTRICTION: Freelances can only work in beachroad
    if (zone !== 'beachroad') {
      return res.status(400).json({ error: 'Freelances can only be positioned in Beach Road zone' });
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if this position is already taken
    const { data: existingPosition, error: positionCheckError } = await supabase
      .from('independent_positions')
      .select('id')
      .eq('zone', zone)
      .eq('grid_row', grid_row)
      .eq('grid_col', grid_col)
      .eq('is_active', true)
      .single();

    // ========================================
    // BUG #11 FIX - Use 422 instead of 409 for business rule violations
    // ========================================
    // 409 Conflict = resource state conflict (edit conflict, optimistic locking)
    // 422 Unprocessable Entity = valid request but business rule prevents processing
    if (existingPosition) {
      return res.status(422).json({
        error: 'This position is already occupied',
        code: 'POSITION_OCCUPIED'
      });
    }

    // Deactivate any existing active position for this employee
    await supabase
      .from('independent_positions')
      .update({ is_active: false })
      .eq('employee_id', employee_id)
      .eq('is_active', true);

    // Create new independent position
    const { data, error } = await supabase
      .from('independent_positions')
      .insert({
        employee_id,
        zone,
        grid_row,
        grid_col,
        is_active: true,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating independent position:', error);
      return res.status(500).json({ error: 'Failed to create independent position' });
    }

    res.status(201).json({ data });
  } catch (error) {
    logger.error('Error in createIndependentPosition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update an independent position
 * @deprecated since v10.3 - Freelances now use employment_history with is_freelance flag
 */
export const updateIndependentPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { zone, grid_row, grid_col, is_active }: UpdateIndependentPositionRequest = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get current position
    const { data: currentPosition, error: fetchError } = await supabase
      .from('independent_positions')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .single();

    if (fetchError || !currentPosition) {
      return res.status(404).json({ error: 'Independent position not found' });
    }

    // RESTRICTION: Freelances can only work in beachroad
    if (zone && zone !== 'beachroad') {
      return res.status(400).json({ error: 'Freelances can only be positioned in Beach Road zone' });
    }

    // If changing position, check if new position is available
    if ((zone && zone !== currentPosition.zone) ||
        (grid_row && grid_row !== currentPosition.grid_row) ||
        (grid_col && grid_col !== currentPosition.grid_col)) {

      const newZone = zone || currentPosition.zone;
      const newRow = grid_row || currentPosition.grid_row;
      const newCol = grid_col || currentPosition.grid_col;

      const { data: existingPosition } = await supabase
        .from('independent_positions')
        .select('id')
        .eq('zone', newZone)
        .eq('grid_row', newRow)
        .eq('grid_col', newCol)
        .eq('is_active', true)
        .neq('id', currentPosition.id)
        .single();

      // BUG #11 FIX - Use 422 for business rule violation
      if (existingPosition) {
        return res.status(422).json({
          error: 'This position is already occupied',
          code: 'POSITION_OCCUPIED'
        });
      }
    }

    // Update position
    const updateData: any = {};
    if (zone !== undefined) updateData.zone = zone;
    if (grid_row !== undefined) updateData.grid_row = grid_row;
    if (grid_col !== undefined) updateData.grid_col = grid_col;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('independent_positions')
      .update(updateData)
      .eq('id', currentPosition.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating independent position:', error);
      return res.status(500).json({ error: 'Failed to update independent position' });
    }

    res.json({ data });
  } catch (error) {
    logger.error('Error in updateIndependentPosition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete (deactivate) an independent position
 * @deprecated since v10.3 - Freelances now use employment_history with is_freelance flag
 */
export const deleteIndependentPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Deactivate the position instead of hard delete
    const { data, error } = await supabase
      .from('independent_positions')
      .update({ is_active: false })
      .eq('employee_id', employeeId)
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      logger.error('Error deleting independent position:', error);
      return res.status(500).json({ error: 'Failed to delete independent position' });
    }

    res.json({ message: 'Independent position deleted successfully', data });
  } catch (error) {
    logger.error('Error in deleteIndependentPosition:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
