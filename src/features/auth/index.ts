/**
 * Auth Feature - Main Index
 *
 * This file provides a unified interface for importing auth functionality.
 *
 * Usage Examples:
 * ```typescript
 * // Import from store (recommended for new code)
 * import { useCoreAuthStore, useGoogleOAuthStore } from '@/features/auth';
 *
 * // Import utilities
 * import { AUTH_CONSTANTS, validateEmail } from '@/features/auth';
 * ```
 */

// Store exports (these work reliably)
export {
  useCoreAuthStore,
  useGoogleOAuthStore,
  useAppleOAuthStore,
  useSessionStore,
  useAuthState,
  useAuthActions,
  useAuthStatus,
  useGoogleOAuth,
  useAppleOAuth,
  shouldEnableQueries,
  // Performance optimized selective hooks
  useCoreAuth,
  useGoogleAuthState,
  useAppleAuthState,
} from './store';

// Re-export store types
export type { CoreAuthState, SessionState } from './store';

/**
 * Feature Metadata
 */
export const AUTH_FEATURE_INFO = {
  name: 'auth',
  version: '3.0.0',
  description: 'Authentication system with OAuth support (Google & Apple)',
  components: {
    hooks: ['useAuth', 'useAuthStatus', 'useAuthState', 'useAuthActions'],
    stores: ['coreAuthStore', 'googleOAuthStore', 'appleOAuthStore', 'sessionStore'],
    services: ['authCoordinator', 'deepLinkService'],
    utils: ['atomicOperations', 'authValidation', 'authConstants'],
    screens: ['LoginScreen', 'SplashScreen'],
  },
  features: [
    'Google OAuth authentication',
    'Apple OAuth authentication',
    'Session persistence',
    'Deep link handling',
    'Backward compatibility',
    'Toast integration',
  ],
  architecture: {
    pattern: 'Modular stores with facade pattern',
    backwardCompatibility: true,
    atomicOperations: true,
    raceConditionPrevention: true,
  },
} as const;
