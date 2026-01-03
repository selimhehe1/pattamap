/**
 * Verification Pose Configuration
 *
 * This defines the fixed pose that employees must replicate
 * for profile verification. The pose serves as:
 * 1. Psychological deterrent (prevents reusing old photos)
 * 2. Proof of intent (shows active participation)
 * 3. Distinctive marker (uncommon in casual photos)
 *
 * Note: Verification is done manually by admins.
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
