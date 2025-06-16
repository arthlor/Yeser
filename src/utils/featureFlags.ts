/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for gradual rollout of optimizations.
 * Supports environment-based configuration and user-specific rollout.
 */

export interface FeatureFlags {
  // Magic Link Performance Optimizations
  OPTIMIZED_MAGIC_LINK_V1: boolean;
  OPTIMIZED_MAGIC_LINK_V2: boolean;
  BATCHED_STATE_UPDATES: boolean;
  PERFORMANCE_MONITORING: boolean;

  // Development and testing flags
  DEBUG_PERFORMANCE: boolean;
  FORCE_LEGACY_MODE: boolean;
}

// Environment-based feature flag configuration
export const FEATURE_FLAGS: FeatureFlags = {
  // Phase 2: Callback Optimization
  OPTIMIZED_MAGIC_LINK_V1: process.env.EXPO_PUBLIC_FF_OPTIMIZED_MAGIC_LINK_V1 === 'true',

  // Phase 3: Atomic Operation Optimization
  OPTIMIZED_MAGIC_LINK_V2: process.env.EXPO_PUBLIC_FF_OPTIMIZED_MAGIC_LINK_V2 === 'true',

  // Phase 4: State Update Optimization
  BATCHED_STATE_UPDATES: process.env.EXPO_PUBLIC_FF_BATCHED_STATE_UPDATES === 'true',

  // Phase 1: Performance Monitoring
  PERFORMANCE_MONITORING: process.env.EXPO_PUBLIC_FF_PERFORMANCE_MONITORING === 'true' || __DEV__,

  // Development flags
  DEBUG_PERFORMANCE: __DEV__ && process.env.EXPO_PUBLIC_DEBUG_PERFORMANCE === 'true',
  FORCE_LEGACY_MODE: process.env.EXPO_PUBLIC_FORCE_LEGACY_MODE === 'true',
} as const;

/**
 * Get optimization tier for a specific user/email
 * Used for gradual rollout based on user characteristics
 */
export const getUserOptimizationTier = (email: string): 'legacy' | 'v1' | 'v2' => {
  // Force legacy mode if flag is set
  if (FEATURE_FLAGS.FORCE_LEGACY_MODE) {
    return 'legacy';
  }

  // Full rollout check
  if (process.env.EXPO_PUBLIC_OPTIMIZATION_ROLLOUT === 'full') {
    if (FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V2) {
      return 'v2';
    }
    if (FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V1) {
      return 'v1';
    }
  }

  // Gradual rollout based on email hash
  const emailHash = email.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0);
  const bucket = Math.abs(emailHash) % 100;

  // Phase 1: 10% get v1 optimization
  if (process.env.EXPO_PUBLIC_OPTIMIZATION_ROLLOUT === 'phase1' && bucket < 10) {
    return FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V1 ? 'v1' : 'legacy';
  }

  // Phase 2: 50% get v2 optimization
  if (process.env.EXPO_PUBLIC_OPTIMIZATION_ROLLOUT === 'phase2' && bucket < 50) {
    return FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V2 ? 'v2' : 'legacy';
  }

  // Default to feature flag settings
  if (FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V2) {
    return 'v2';
  }
  if (FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V1) {
    return 'v1';
  }

  return 'legacy';
};

/**
 * Check if specific feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return FEATURE_FLAGS[feature];
};

/**
 * Get current feature flag status for debugging
 */
export const getFeatureFlagStatus = (): Record<string, boolean | string> => {
  return {
    ...FEATURE_FLAGS,
    rolloutPhase: process.env.EXPO_PUBLIC_OPTIMIZATION_ROLLOUT || 'none',
    environment: process.env.EXPO_PUBLIC_ENV || 'development',
  };
};
