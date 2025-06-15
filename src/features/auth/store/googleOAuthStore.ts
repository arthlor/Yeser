import { create } from 'zustand';
import { User as SupabaseUser } from '@supabase/supabase-js';

import { logger } from '@/utils/debugConfig';
import { atomicOperationManager } from '../utils/atomicOperations';
import { googleOAuthService } from '../services/googleOAuthService';
import { useCoreAuthStore } from './coreAuthStore';

import type { GoogleOAuthResult } from '../services/googleOAuthService';

/**
 * Google OAuth State Interface
 * Handles Google OAuth specific operations and state
 */
export interface GoogleOAuthState {
  // Google OAuth State
  isLoading: boolean;
  isInitialized: boolean;
  lastAttemptAt: number | null;
  error: string | null;

  // Google OAuth Actions
  initialize: () => Promise<void>;
  signIn: () => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // Rate Limiting Info
  getRemainingCooldown: () => number;
  canAttemptSignIn: () => boolean;
  isReady: () => boolean;
}

/**
 * Google OAuth Store
 *
 * Handles all Google OAuth related operations including:
 * - Google Sign-In SDK initialization
 * - OAuth sign-in flow
 * - Rate limiting and cooldown management
 * - Error handling specific to Google OAuth
 * - Integration with core auth store
 */
export const useGoogleOAuthStore = create<GoogleOAuthState>((set, get) => ({
  // Initial State
  isLoading: false,
  isInitialized: false,
  lastAttemptAt: null,
  error: null,

  // Google OAuth Actions
  initialize: async () => {
    const operationKey = 'google_oauth_init';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'google_oauth', async () => {
        set({ isLoading: true, error: null });

        try {
          await googleOAuthService.initialize();

          set({
            isInitialized: true,
            isLoading: false,
            error: null,
          });

          logger.debug('Google OAuth store: Initialization successful');
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Google OAuth initialization failed';
          set({
            error: errorMessage,
            isLoading: false,
            isInitialized: false,
          });
          logger.error('Google OAuth store: Initialization failed:', error as Error);
          throw error;
        }
      });
    } catch (error) {
      logger.debug('Google OAuth store: Initialization already in progress', {
        error: (error as Error).message,
      });
      throw error;
    }
  },

  signIn: async () => {
    const operationKey = 'google_oauth_signin';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'google_oauth', async () => {
        set({ isLoading: true, error: null });

        try {
          // Check if service is ready
          if (!get().isReady()) {
            throw new Error('Google OAuth service not ready. Please wait for initialization.');
          }

          // Check rate limiting
          if (!get().canAttemptSignIn()) {
            const remainingTime = get().getRemainingCooldown();
            const error = `Lütfen ${Math.ceil(remainingTime / 1000)} saniye bekleyin ve tekrar deneyin.`;
            set({ error, isLoading: false });
            throw new Error(error);
          }

          set({ lastAttemptAt: Date.now() });

          // Perform Google sign-in
          const result: GoogleOAuthResult = await googleOAuthService.signIn();

          if (result.success && result.requiresCallback) {
            // OAuth flow initiated successfully, waiting for deep link callback
            set({
              isLoading: false, // Stop loading since OAuth flow is now in browser
              error: null,
            });
            logger.debug('Google OAuth store: OAuth flow initiated, waiting for callback');
            // Throw a special error to indicate callback is required (not a real error)
            throw new Error('OAUTH_CALLBACK_REQUIRED');
          } else if (result.success && result.user && result.session) {
            // Direct sign-in successful (ID token exchange method)
            const coreAuthStore = useCoreAuthStore.getState();
            coreAuthStore.setAuthState(true, result.user as SupabaseUser);

            set({
              isLoading: false,
              error: null,
            });

            logger.debug('Google OAuth store: Direct sign-in successful');
          } else if (result.userCancelled) {
            // Handle user cancellation gracefully (no error state)
            set({
              isLoading: false,
              error: null, // Don't show error for cancellation
            });
            logger.debug('Google OAuth store: Sign-in cancelled by user');
          } else {
            const errorMessage = result.error || 'Google ile giriş başarısız oldu';
            set({
              error: errorMessage,
              isLoading: false,
            });
            logger.error('Google OAuth store: Sign-in failed:', { error: errorMessage });
            throw new Error(errorMessage);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Google ile giriş başarısız oldu';
          set({ error: errorMessage, isLoading: false });
          logger.error('Google OAuth store: Sign-in error:', error as Error);
          throw error;
        }
      });
    } catch (error) {
      logger.debug('Google OAuth store: Sign-in operation already in progress', {
        error: (error as Error).message,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      isLoading: false,
      lastAttemptAt: null,
      error: null,
      // Don't reset isInitialized - keep SDK initialized
    });
  },

  // Rate Limiting Utilities
  getRemainingCooldown: () => {
    const { lastAttemptAt } = get();
    if (!lastAttemptAt) {
      return 0;
    }

    const cooldownPeriod = 3000; // 3 seconds (matches service)
    const elapsed = Date.now() - lastAttemptAt;
    return Math.max(0, cooldownPeriod - elapsed);
  },

  canAttemptSignIn: () => {
    const { getRemainingCooldown, isReady } = get();
    return isReady() && getRemainingCooldown() === 0;
  },

  isReady: () => {
    const { isInitialized } = get();
    return isInitialized && googleOAuthService.isReady();
  },
}));

// Export default for backward compatibility
export default useGoogleOAuthStore;
