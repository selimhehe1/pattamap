/**
 * Notifications Module
 *
 * Centralized notification system for PattaMap
 *
 * Structure:
 * - types.ts:       Type definitions and constants
 * - core.ts:        Core functions (createNotification, fetchUserIdsByRole, notifyMultipleUsers)
 * - database.ts:    CRUD operations (markAsRead, getUnreadCount)
 * - ownership.ts:   Ownership request notifications
 * - moderation.ts:  Content moderation notifications
 * - social.ts:      Social notifications (comments, favorites)
 * - employee.ts:    Employee update notifications
 * - admin.ts:       Admin/moderator notifications
 * - specialized.ts: VIP, verification, edit proposals, establishment owner
 */

// Types and constants
export {
  UserRole,
  NotificationType,
  CreateNotificationRequest,
  CONTENT_APPROVED_TYPE_MAP,
  CONTENT_REJECTED_TYPE_MAP,
  CONTENT_APPROVED_I18N_MAP,
  CONTENT_REJECTED_I18N_MAP,
  EMPLOYEE_UPDATE_TYPE_MAP,
  EMPLOYEE_UPDATE_I18N_MAP
} from './types';

// Core functions
export {
  createNotification,
  fetchUserIdsByRole,
  notifyMultipleUsers
} from './core';

// Database operations
export {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount
} from './database';

// Ownership notifications
export {
  notifyAdminsNewOwnershipRequest,
  notifyOwnershipRequestSubmitted,
  notifyOwnerRequestStatusChange
} from './ownership';

// Moderation notifications
export {
  notifyUserContentPendingReview,
  notifyUserContentApproved,
  notifyUserContentRejected,
  notifyCommentRemoved
} from './moderation';

// Social notifications
export {
  notifyCommentReply,
  notifyCommentMention,
  notifyNewFavorite,
  notifyFavoriteAvailable
} from './social';

// Employee notifications
export { notifyEmployeeUpdate } from './employee';

// Admin notifications
export {
  notifyAdminsPendingContent,
  notifyModeratorsNewReport
} from './admin';

// Specialized notifications (VIP, verification, edit proposals, establishment owner)
export {
  // Verification
  notifyEmployeeVerificationSubmitted,
  notifyEmployeeVerificationApproved,
  notifyEmployeeVerificationRejected,
  notifyEmployeeVerificationRevoked,
  notifyAdminsNewVerificationRequest,
  // VIP
  notifyVIPPurchaseConfirmed,
  notifyVIPPaymentVerified,
  notifyVIPPaymentRejected,
  notifyVIPSubscriptionCancelled,
  // Edit proposals
  notifyAdminsNewEditProposal,
  notifyEditProposalApproved,
  notifyEditProposalRejected,
  // Establishment owner
  notifyEstablishmentOwnerAssigned,
  notifyEstablishmentOwnerRemoved,
  notifyEstablishmentOwnerPermissionsUpdated
} from './specialized';
