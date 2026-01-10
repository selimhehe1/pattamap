/**
 * Employee Employment
 *
 * Functions for managing employee-establishment associations
 */

import { supabase } from '../../config/supabase';
import { logger } from '../logger';
import { notifyEmployeeUpdate } from '../notificationHelper';

/**
 * Validate and update employment associations for an employee
 */
export async function updateEmploymentAssociations(
  employeeId: string,
  newEstablishmentIds: string[],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Deactivate all current employment
  const { error: deactivateError } = await supabase
    .from('employment_history')
    .update({ is_current: false, end_date: new Date().toISOString().split('T')[0] })
    .eq('employee_id', employeeId)
    .eq('is_current', true);

  if (deactivateError) {
    logger.error('Failed to deactivate employment history:', deactivateError);
  }

  // 2. Create new employment associations
  if (newEstablishmentIds.length > 0) {
    const employmentRecords = newEstablishmentIds.map(estId => ({
      employee_id: employeeId,
      establishment_id: estId,
      start_date: new Date().toISOString().split('T')[0],
      is_current: true,
      created_by: userId
    }));

    const { error: createError } = await supabase
      .from('employment_history')
      .insert(employmentRecords);

    if (createError) {
      logger.error('Failed to create employment history:', createError);
      return { success: false, error: 'Failed to update establishments: ' + createError.message };
    }

    logger.info(`Employee ${employeeId} updated with ${newEstablishmentIds.length} establishment(s)`);
  } else {
    logger.info(`Employee ${employeeId} removed from all establishments`);
  }

  return { success: true };
}

/**
 * Notify followers of employee profile updates
 */
export async function notifyFollowersOfUpdate(
  employeeId: string,
  employeeName: string,
  updates: Record<string, unknown>,
  previousEmployee: { photos?: string[]; is_freelance?: boolean },
  currentEstablishmentChanged: boolean
): Promise<void> {
  try {
    const { data: followers } = await supabase
      .from('user_favorites')
      .select('user_id')
      .eq('employee_id', employeeId);

    const followerIds = followers?.map(f => f.user_id) || [];
    if (followerIds.length === 0) return;

    let updateType: 'profile' | 'photos' | 'position' | null = null;

    if (updates.photos && updates.photos !== previousEmployee.photos) {
      updateType = 'photos';
    } else if (currentEstablishmentChanged || updates.is_freelance !== undefined) {
      updateType = 'position';
    } else if (
      updates.name || updates.nickname || updates.age !== undefined ||
      updates.nationality || updates.description || updates.social_media
    ) {
      updateType = 'profile';
    }

    if (updateType) {
      await notifyEmployeeUpdate(followerIds, employeeName, updateType, employeeId);
    }
  } catch (err) {
    logger.error('Employee update notification error:', err);
  }
}
