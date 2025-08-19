/**
 * Auth Feature - Main Index
 *
 * This file provides a unified interface for importing auth functionality.
 *
 * Usage Examples:
 * ```typescript
 * // Import from store (recommended for new code)
 * import { useCoreAuthStore, useMagicLinkStore } from '@/features/auth';
 *
 * // Import services
 * import { authCoordinator, magicLinkService } from '@/features/auth';
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
  useMagicLinkStore,
  useSessionStore,
  useAuthState,
  useAuthActions,
  useAuthStatus,
  useGoogleOAuth,
  useAppleOAuth,
  useMagicLink,
  shouldEnableQueries,
  // Performance optimized selective hooks
  useCoreAuth,
  useMagicLinkState,
  useGoogleAuthState,
  useAppleAuthState,
} from './store';

// Re-export store types
export type { CoreAuthState, MagicLinkState, SessionState } from './store';

/**
 * Feature Metadata
 */
export const AUTH_FEATURE_INFO = {
  name: 'auth',
  version: '2.0.0',
  description: 'Modular authentication system with magic link support',
  components: {
    hooks: ['useAuth', 'useAuthStatus', 'useMagicLink', 'useAuthState', 'useAuthActions'],
    stores: ['coreAuthStore', 'magicLinkStore', 'sessionStore'],
    services: ['authCoordinator', 'deepLinkService', 'magicLinkService'],
    utils: ['atomicOperations', 'authValidation', 'authConstants'],
    screens: ['LoginScreen', 'SplashScreen'],
  },
  features: [
    'Magic link authentication',
    'Session persistence',
    'Rate limiting',
    'Atomic operations',
    'Deep link handling',
    'Backward compatibility',
    'Toast integration',
    'Analytics tracking',
  ],
  architecture: {
    pattern: 'Modular stores with facade pattern',
    backwardCompatibility: true,
    atomicOperations: true,
    raceConditionPrevention: true,
  },
} as const;
