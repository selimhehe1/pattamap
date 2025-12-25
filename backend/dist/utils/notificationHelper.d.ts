import { CreateNotificationRequest } from '../types';
/**
 * Create a new in-app notification for a user
 * Automatically sends push notification if user has subscriptions
 *
 * v10.3 - i18n Support:
 * - NEW: Pass i18n_key + i18n_params for multilingual notifications
 * - Backward compatible: Still accepts title + message
 * - Metadata: i18n data stored in JSONB column
 *
 * @param params Notification parameters
 * @returns Created notification ID or null if failed
 */
export declare const createNotification: (params: CreateNotificationRequest) => Promise<string | null>;
/**
 * Notify all admins about a new ownership request
 * @param establishmentName Name of establishment
 * @param requesterPseudonym Pseudonym of requester
 * @param requestId Request ID
 * @param isNewEstablishment Whether this request includes establishment creation
 */
export declare const notifyAdminsNewOwnershipRequest: (establishmentName: string, requesterPseudonym: string, requestId: string, isNewEstablishment?: boolean) => Promise<void>;
/**
 * Notify user when they submit an ownership request
 * @param userId User ID
 * @param establishmentName Name of establishment
 * @param requestId Request ID
 * @param isNewEstablishment Whether this request includes establishment creation
 */
export declare const notifyOwnershipRequestSubmitted: (userId: string, establishmentName: string, requestId: string, isNewEstablishment?: boolean) => Promise<void>;
/**
 * Notify owner about request status change
 * @param userId Owner user ID
 * @param status New status (approved/rejected)
 * @param establishmentName Name of establishment
 * @param adminNotes Optional admin notes
 * @param requestId Request ID
 */
export declare const notifyOwnerRequestStatusChange: (userId: string, status: "approved" | "rejected", establishmentName: string, adminNotes?: string, requestId?: string) => Promise<void>;
/**
 * Mark notification as read
 * @param notificationId Notification ID
 * @param userId User ID (for security check)
 * @returns Success boolean
 */
export declare const markNotificationAsRead: (notificationId: string, userId: string) => Promise<boolean>;
/**
 * Mark all notifications as read for a user
 * @param userId User ID
 * @returns Success boolean
 */
export declare const markAllNotificationsAsRead: (userId: string) => Promise<boolean>;
/**
 * Notify user when their content is pending review
 * @param userId User ID (the creator)
 * @param contentType Type of content (employee, establishment)
 * @param contentName Name/title of content
 * @param contentId ID of content
 */
export declare const notifyUserContentPendingReview: (userId: string, contentType: "employee" | "establishment", contentName: string, contentId?: string) => Promise<void>;
/**
 * Notify user when their content is approved
 * @param userId User ID
 * @param contentType Type of content (employee, establishment, comment)
 * @param contentName Name/title of content
 * @param contentId ID of content
 */
export declare const notifyUserContentApproved: (userId: string, contentType: "employee" | "establishment" | "comment", contentName: string, contentId?: string) => Promise<void>;
/**
 * Notify user when their content is rejected
 * @param userId User ID
 * @param contentType Type of content
 * @param reason Rejection reason
 * @param contentId ID of content
 */
export declare const notifyUserContentRejected: (userId: string, contentType: "employee" | "establishment" | "comment", reason: string, contentId?: string) => Promise<void>;
/**
 * Notify user when someone replies to their comment
 * @param userId User ID (original comment author)
 * @param replierName Name of person who replied
 * @param employeeName Name of employee profile
 * @param commentId ID of the reply comment
 * @param employeeId ID of employee
 */
export declare const notifyCommentReply: (userId: string, replierName: string, employeeName: string, commentId: string, employeeId: string) => Promise<void>;
/**
 * Notify user when they are mentioned in a comment
 * @param userId User ID
 * @param mentionerName Name of person who mentioned
 * @param employeeName Name of employee profile
 * @param commentId ID of comment
 * @param employeeId ID of employee
 */
export declare const notifyCommentMention: (userId: string, mentionerName: string, employeeName: string, commentId: string, employeeId: string) => Promise<void>;
/**
 * Notify employee when someone adds them as favorite
 * @param employeeLinkedUserId User ID linked to employee
 * @param favoritedByName Name of user who favorited
 * @param employeeName Name of employee
 */
export declare const notifyNewFavorite: (employeeLinkedUserId: string, favoritedByName: string, employeeName: string) => Promise<void>;
/**
 * Notify users when a favorited employee becomes available
 * @param employeeId Employee ID
 * @param employeeName Name of employee
 * @param establishmentName Name of current establishment (optional)
 */
export declare const notifyFavoriteAvailable: (employeeId: string, employeeName: string, establishmentName?: string) => Promise<void>;
/**
 * Notify followers when employee profile is updated
 * @param userIds Array of user IDs to notify
 * @param employeeName Name of employee
 * @param updateType Type of update (profile, photos, position)
 * @param employeeId ID of employee
 */
export declare const notifyEmployeeUpdate: (userIds: string[], employeeName: string, updateType: "profile" | "photos" | "position", employeeId: string) => Promise<void>;
/**
 * Notify admins when new content is submitted for moderation
 * @param contentType Type of content
 * @param contentName Name of content
 * @param submitterName Name of submitter
 * @param itemId Moderation queue item ID
 */
export declare const notifyAdminsPendingContent: (contentType: "employee" | "establishment" | "comment", contentName: string, submitterName: string, itemId: string) => Promise<void>;
/**
 * Notify moderators when a new report is submitted
 * @param reportReason Report reason
 * @param reportedContent Description of reported content
 * @param reportId Report ID
 */
export declare const notifyModeratorsNewReport: (reportReason: string, reportedContent: string, reportId: string) => Promise<void>;
/**
 * Notify employee when their verification is submitted
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
 */
export declare const notifyEmployeeVerificationSubmitted: (employeeLinkedUserId: string, employeeName: string) => Promise<void>;
/**
 * Notify employee when their verification is approved
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
 */
export declare const notifyEmployeeVerificationApproved: (employeeLinkedUserId: string, employeeName: string) => Promise<void>;
/**
 * Notify employee when their verification is rejected
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
 * @param reason Rejection reason from admin
 */
export declare const notifyEmployeeVerificationRejected: (employeeLinkedUserId: string, employeeName: string, reason: string) => Promise<void>;
/**
 * Notify employee when their verification is revoked
 * @param employeeLinkedUserId User ID linked to employee
 * @param employeeName Name of employee
 * @param reason Revocation reason from admin
 */
export declare const notifyEmployeeVerificationRevoked: (employeeLinkedUserId: string, employeeName: string, reason: string) => Promise<void>;
/**
 * Notify admins when a new verification request is submitted
 * @param employeeName Name of employee requesting verification
 * @param verificationId ID of verification request
 */
export declare const notifyAdminsNewVerificationRequest: (employeeName: string, verificationId: string) => Promise<void>;
/**
 * Notify user when their VIP purchase is confirmed
 * @param userId - ID of user who purchased VIP
 * @param tier - VIP tier (bronze, silver, gold, platinum)
 * @param duration - Duration in days
 * @param price - Price paid in THB
 */
export declare const notifyVIPPurchaseConfirmed: (userId: string, tier: string, duration: number, price: number) => Promise<void>;
/**
 * Notify user when admin verifies their VIP payment
 * @param userId - ID of user whose payment was verified
 * @param tier - VIP tier
 * @param expiresAt - Expiration date
 */
export declare const notifyVIPPaymentVerified: (userId: string, tier: string, expiresAt: Date) => Promise<void>;
/**
 * Notify user when admin rejects their VIP payment
 * @param userId - ID of user whose payment was rejected
 * @param tier - VIP tier
 * @param reason - Rejection reason
 */
export declare const notifyVIPPaymentRejected: (userId: string, tier: string, reason: string) => Promise<void>;
/**
 * Notify user when their VIP subscription is cancelled
 * @param userId - ID of user whose subscription was cancelled
 * @param tier - VIP tier
 * @param reason - Cancellation reason
 */
export declare const notifyVIPSubscriptionCancelled: (userId: string, tier: string, reason: string) => Promise<void>;
/**
 * Notify admins when a new edit proposal is submitted (non-privileged users only)
 * @param proposalId - ID of the proposal
 * @param proposerName - Name of user who submitted the proposal
 * @param entityType - Type of entity being edited (employee/establishment)
 * @param entityName - Name of entity being edited
 */
export declare const notifyAdminsNewEditProposal: (proposalId: string, proposerName: string, entityType: string, entityName: string) => Promise<void>;
/**
 * Notify user when their edit proposal is approved
 * @param userId - ID of user who submitted the proposal
 * @param entityType - Type of entity (employee/establishment)
 * @param entityName - Name of entity
 */
export declare const notifyEditProposalApproved: (userId: string, entityType: string, entityName: string) => Promise<void>;
/**
 * Notify user when their edit proposal is rejected
 * @param userId - ID of user who submitted the proposal
 * @param entityType - Type of entity (employee/establishment)
 * @param entityName - Name of entity
 * @param reason - Rejection reason
 */
export declare const notifyEditProposalRejected: (userId: string, entityType: string, entityName: string, reason: string) => Promise<void>;
/**
 * Notify user when they are assigned as establishment owner
 * @param userId - ID of user being assigned
 * @param establishmentName - Name of establishment
 * @param establishmentId - ID of establishment
 * @param role - Owner role (owner/manager)
 */
export declare const notifyEstablishmentOwnerAssigned: (userId: string, establishmentName: string, establishmentId: string, role: string) => Promise<void>;
/**
 * Notify user when they are removed as establishment owner
 * @param userId - ID of user being removed
 * @param establishmentName - Name of establishment
 * @param establishmentId - ID of establishment
 */
export declare const notifyEstablishmentOwnerRemoved: (userId: string, establishmentName: string, establishmentId: string) => Promise<void>;
/**
 * Notify user when their establishment owner permissions are updated
 * @param userId - ID of user whose permissions changed
 * @param establishmentName - Name of establishment
 * @param establishmentId - ID of establishment
 * @param updatedPermissions - Object describing what changed
 */
export declare const notifyEstablishmentOwnerPermissionsUpdated: (userId: string, establishmentName: string, establishmentId: string, updatedPermissions: Record<string, boolean>) => Promise<void>;
/**
 * Notify comment author when their comment is removed by moderator
 * @param userId - ID of comment author
 * @param reason - Removal reason
 * @param entityType - Type of entity (employee/establishment)
 * @param entityName - Name of entity
 */
export declare const notifyCommentRemoved: (userId: string, reason: string, entityType: string, entityName: string) => Promise<void>;
/**
 * Get unread notification count for a user
 * @param userId User ID
 * @returns Unread count or 0 if error
 */
export declare const getUnreadNotificationCount: (userId: string) => Promise<number>;
//# sourceMappingURL=notificationHelper.d.ts.map