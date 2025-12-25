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
export declare const VERIFICATION_POSE: {
    readonly name: "mini_heart";
    readonly emoji: "🫰";
    readonly description: "Make a mini heart with your thumb and index finger next to your face";
    readonly instructions: readonly ["Touch your thumb and index finger together", "Make a small heart shape", "Hold it next to your face", "Look at the camera", "Ensure good lighting"];
    readonly exampleImagePath: "/assets/verification-mini-heart.jpg";
    readonly culturalNote: "Korean \"Finger Heart\" gesture - popular in Asian K-pop culture";
};
/**
 * Verification Thresholds
 * Based on Azure Face API confidence scores
 */
export declare const VERIFICATION_THRESHOLDS: {
    readonly AUTO_APPROVE: 75;
    readonly MANUAL_REVIEW_MIN: 65;
    readonly MANUAL_REVIEW_MAX: 74;
    readonly AUTO_REJECT_MAX: 64;
};
/**
 * Rate Limiting
 */
export declare const VERIFICATION_RATE_LIMIT: {
    readonly MAX_ATTEMPTS: 3;
    readonly WINDOW_HOURS: 24;
};
/**
 * Verification statuses
 */
export declare const VERIFICATION_STATUS: {
    readonly PENDING: "pending";
    readonly APPROVED: "approved";
    readonly REJECTED: "rejected";
    readonly MANUAL_REVIEW: "manual_review";
    readonly REVOKED: "revoked";
};
/**
 * Get verification decision based on face match score
 * @param score - Face match score (0-100)
 * @returns Verification status and whether it was auto-approved
 */
export declare function getVerificationDecision(score: number): {
    status: typeof VERIFICATION_STATUS[keyof typeof VERIFICATION_STATUS];
    autoApproved: boolean;
};
//# sourceMappingURL=verification.d.ts.map