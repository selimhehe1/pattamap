/**
 * Notification Types and Constants
 *
 * Shared type definitions and content type mappings
 */

import { NotificationType, CreateNotificationRequest } from '../../types';

// Re-export for convenience
export { NotificationType, CreateNotificationRequest };

// ============================================================================
// USER ROLE TYPE
// ============================================================================

export type UserRole = 'admin' | 'moderator' | 'user';

// ============================================================================
// CONTENT TYPE MAPPINGS
// ============================================================================

/** Maps content types to their corresponding notification types for approval */
export const CONTENT_APPROVED_TYPE_MAP: Record<string, NotificationType> = {
  employee: 'employee_approved',
  establishment: 'establishment_approved',
  comment: 'comment_approved'
};

/** Maps content types to their corresponding notification types for rejection */
export const CONTENT_REJECTED_TYPE_MAP: Record<string, NotificationType> = {
  employee: 'employee_rejected',
  establishment: 'establishment_rejected',
  comment: 'comment_rejected'
};

/** Maps content types to their i18n keys for approval */
export const CONTENT_APPROVED_I18N_MAP: Record<string, string> = {
  employee: 'notifications.employeeApproved',
  establishment: 'notifications.establishmentApproved',
  comment: 'notifications.commentApproved'
};

/** Maps content types to their i18n keys for rejection */
export const CONTENT_REJECTED_I18N_MAP: Record<string, string> = {
  employee: 'notifications.employeeRejected',
  establishment: 'notifications.establishmentRejected',
  comment: 'notifications.commentRejected'
};

// ============================================================================
// EMPLOYEE UPDATE MAPPINGS
// ============================================================================

/** Maps employee update types to notification types */
export const EMPLOYEE_UPDATE_TYPE_MAP: Record<string, NotificationType> = {
  profile: 'employee_profile_updated',
  photos: 'employee_photos_updated',
  position: 'employee_position_changed'
};

/** Maps employee update types to i18n keys */
export const EMPLOYEE_UPDATE_I18N_MAP: Record<string, string> = {
  profile: 'notifications.employeeProfileUpdated',
  photos: 'notifications.employeePhotosUpdated',
  position: 'notifications.employeePositionChanged'
};
