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

export const VERIFICATION_POSE = {
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
} as const;

/**
 * Verification Thresholds
 * Based on Azure Face API confidence scores
 */
export const VERIFICATION_THRESHOLDS = {
  // Auto-approve threshold (≥75% confidence)
  AUTO_APPROVE: 75,

  // Manual review threshold (65-74% confidence)
  MANUAL_REVIEW_MIN: 65,
  MANUAL_REVIEW_MAX: 74,

  // Auto-reject threshold (<65% confidence)
  AUTO_REJECT_MAX: 64
} as const;

/**
 * Rate Limiting
 */
export const VERIFICATION_RATE_LIMIT = {
  // Maximum attempts per time window
  MAX_ATTEMPTS: 3,

  // Time window in hours
  WINDOW_HOURS: 24
} as const;

/**
 * Verification statuses
 */
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MANUAL_REVIEW: 'manual_review',
  REVOKED: 'revoked'
} as const;

/**
 * Get verification decision based on face match score
 * @param score - Face match score (0-100)
 * @returns Verification status and whether it was auto-approved
 */
export function getVerificationDecision(score: number): {
  status: typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];
  autoApproved: boolean;
} {
  if (score >= VERIFICATION_THRESHOLDS.AUTO_APPROVE) {
    return {
      status: VERIFICATION_STATUS.APPROVED,
      autoApproved: true
    };
  }

  if (score >= VERIFICATION_THRESHOLDS.MANUAL_REVIEW_MIN) {
    return {
      status: VERIFICATION_STATUS.MANUAL_REVIEW,
      autoApproved: false
    };
  }

  return {
    status: VERIFICATION_STATUS.REJECTED,
    autoApproved: false
  };
}
