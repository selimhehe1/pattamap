/**
 * Feature Flags Configuration
 *
 * Centralized feature toggles for enabling/disabling features without code changes.
 * Set via environment variables for easy production control.
 *
 * Usage:
 * ```tsx
 * import { isFeatureEnabled, FEATURES } from '../utils/featureFlags';
 *
 * if (isFeatureEnabled(FEATURES.VIP_SYSTEM)) {
 *   // Show VIP features
 * }
 * ```
 */

/**
 * Available feature flags
 */
export const FEATURES = {
  /** VIP subscription system (badges, priority, payments) */
  VIP_SYSTEM: 'VIP_SYSTEM',
  /** Payment processing (cash verification, future: PromptPay) */
  PAYMENTS: 'PAYMENTS',
  /** Gamification system (XP, levels, badges, missions) */
  GAMIFICATION: 'GAMIFICATION',
  /** Push notifications */
  PUSH_NOTIFICATIONS: 'PUSH_NOTIFICATIONS',
} as const;

export type FeatureFlag = typeof FEATURES[keyof typeof FEATURES];

/**
 * Feature flag configuration from environment variables
 * Default: all features ENABLED unless explicitly disabled
 *
 * To disable VIP in production, set: REACT_APP_FEATURE_VIP_SYSTEM=false
 */
const featureConfig: Record<FeatureFlag, boolean> = {
  [FEATURES.VIP_SYSTEM]: process.env.REACT_APP_FEATURE_VIP_SYSTEM !== 'false',
  [FEATURES.PAYMENTS]: process.env.REACT_APP_FEATURE_PAYMENTS !== 'false',
  [FEATURES.GAMIFICATION]: process.env.REACT_APP_FEATURE_GAMIFICATION !== 'false',
  [FEATURES.PUSH_NOTIFICATIONS]: process.env.REACT_APP_FEATURE_PUSH_NOTIFICATIONS !== 'false',
};

/**
 * Check if a feature is enabled
 * @param feature - Feature flag to check
 * @returns true if feature is enabled
 */
export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return featureConfig[feature] ?? true;
};

/**
 * Hook-friendly feature check (for use in components)
 * @param feature - Feature flag to check
 * @returns true if feature is enabled
 */
export const useFeatureFlag = (feature: FeatureFlag): boolean => {
  // Currently static, but could be made reactive with Context if needed
  return isFeatureEnabled(feature);
};

/**
 * Get all feature flags status (for debugging/admin)
 */
export const getAllFeatureFlags = (): Record<FeatureFlag, boolean> => {
  return { ...featureConfig };
};
