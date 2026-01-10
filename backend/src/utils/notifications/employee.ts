/**
 * Employee Update Notifications
 *
 * Notifications for employee profile updates
 */

import { logger } from '../logger';
import { notifyMultipleUsers } from './core';
import { EMPLOYEE_UPDATE_TYPE_MAP, EMPLOYEE_UPDATE_I18N_MAP } from './types';

/**
 * Notify followers when employee profile is updated
 * @param userIds Array of user IDs to notify
 * @param employeeName Name of employee
 * @param updateType Type of update (profile, photos, position)
 * @param employeeId ID of employee
 */
export const notifyEmployeeUpdate = async (
  userIds: string[],
  employeeName: string,
  updateType: 'profile' | 'photos' | 'position',
  employeeId: string
): Promise<void> => {
  try {
    await notifyMultipleUsers(
      userIds,
      (userId) => ({
        user_id: userId,
        type: EMPLOYEE_UPDATE_TYPE_MAP[updateType],
        i18n_key: EMPLOYEE_UPDATE_I18N_MAP[updateType],
        i18n_params: { employeeName },
        link: `/employee/${employeeId}`,
        related_entity_type: 'employee',
        related_entity_id: employeeId
      }),
      `employee ${updateType} update (${employeeId})`
    );
  } catch (error) {
    logger.error('Notify employee update error:', error);
  }
};
