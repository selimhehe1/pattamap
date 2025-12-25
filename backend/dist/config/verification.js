"use strict";
/**
 * Verification Pose Configuration
 *
 * This defines the fixed pose that employees must replicate
 * for profile verification. The pose serves as:
 * 1. Psychological deterrent (prevents reusing old photos)
 * 2. Proof of intent (shows active participation)
 * 3. Distinctive marker (uncommon in casual photos)
 *
 * Note: The pose itself is NOT technically verified by AI.
 * Only the face is verified via Azure Face API matching.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERIFICATION_STATUS = exports.VERIFICATION_RATE_LIMIT = exports.VERIFICATION_THRESHOLDS = exports.VERIFICATION_POSE = void 0;
exports.getVerificationDecision = getVerificationDecision;
exports.VERIFICATION_POSE = {
    // Pose identifier
    name: 'mini_heart',
    // Emoji representation
    emoji: '🫰',
    // English description
    description: 'Make a mini heart with your thumb and index finger next to your face',
    // Detailed instructions
    instructions: [
        'Touch your thumb and index finger together',
        'Make a small heart shape',
        'Hold it next to your face',
        'Look at the camera',
        'Ensure good lighting'
    ],
    // Example image path (to be added in public assets)
    exampleImagePath: '/assets/verification-mini-heart.jpg',
    // Cultural context
    culturalNote: 'Korean "Finger Heart" gesture - popular in Asian K-pop culture'
};
/**
 * Verification Thresholds
 * Based on Azure Face API confidence scores
 */
exports.VERIFICATION_THRESHOLDS = {
    // Auto-approve threshold (≥75% confidence)
    AUTO_APPROVE: 75,
    // Manual review threshold (65-74% confidence)
    MANUAL_REVIEW_MIN: 65,
    MANUAL_REVIEW_MAX: 74,
    // Auto-reject threshold (<65% confidence)
    AUTO_REJECT_MAX: 64
};
/**
 * Rate Limiting
 */
exports.VERIFICATION_RATE_LIMIT = {
    // Maximum attempts per time window
    MAX_ATTEMPTS: 3,
    // Time window in hours
    WINDOW_HOURS: 24
};
/**
 * Verification statuses
 */
exports.VERIFICATION_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    MANUAL_REVIEW: 'manual_review',
    REVOKED: 'revoked'
};
/**
 * Get verification decision based on face match score
 * @param score - Face match score (0-100)
 * @returns Verification status and whether it was auto-approved
 */
function getVerificationDecision(score) {
    if (score >= exports.VERIFICATION_THRESHOLDS.AUTO_APPROVE) {
        return {
            status: exports.VERIFICATION_STATUS.APPROVED,
            autoApproved: true
        };
    }
    if (score >= exports.VERIFICATION_THRESHOLDS.MANUAL_REVIEW_MIN) {
        return {
            status: exports.VERIFICATION_STATUS.MANUAL_REVIEW,
            autoApproved: false
        };
    }
    return {
        status: exports.VERIFICATION_STATUS.REJECTED,
        autoApproved: false
    };
}
//# sourceMappingURL=verification.js.map