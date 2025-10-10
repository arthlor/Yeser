import { create } from 'zustand';

import { logger } from '@/utils/debugConfig';
import { atomicOperationManager } from '../utils/atomicOperations';
import { appleOAuthService } from '../services';
import i18n from '@/i18n';

export interface AppleOAuthState {
  isLoading: boolean;
  isInitialized: boolean;
  lastAttemptAt: number | null;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: () => Promise<void>;
  clearError: () => void;
  reset: () => void;

  getRemainingCooldown: () => number;
  canAttemptSignIn: () => boolean;
  isReady: () => boolean;
}

export const useAppleOAuthStore = create<AppleOAuthState>((set, get) => ({
  isLoading: false,
  isInitialized: false,
  lastAttemptAt: null,
  error: null,

  initialize: async () => {
    const operationKey = 'apple_oauth_init';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'google_oauth', async () => {
        set({ isLoading: true, error: null });

        try {
          await appleOAuthService.initialize();
          set({ isInitialized: true, isLoading: false, error: null });
          logger.debug('Apple OAuth store: Initialization successful');
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Apple OAuth initialization failed';
          set({ error: errorMessage, isLoading: false, isInitialized: false });
          logger.error('Apple OAuth store: Initialization failed:', error as Error);
          throw error;
        }
      });
    } catch (error) {
      logger.debug('Apple OAuth store: Initialization already in progress', {
        error: (error as Error).message,
      });
      throw error;
    }
  },

  signIn: async () => {
    const operationKey = 'apple_oauth_signin';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'google_oauth', async () => {
        set({ isLoading: true, error: null });

        try {
          if (!get().isReady()) {
            throw new Error('Apple OAuth service not ready. Please wait for initialization.');
          }

          if (!get().canAttemptSignIn()) {
            const remainingTime = get().getRemainingCooldown();
            const error = i18n.t('auth.services.waitSeconds', {
              seconds: Math.ceil(remainingTime / 1000),
            });
            set({ error, isLoading: false });
            throw new Error(error);
          }

          set({ lastAttemptAt: Date.now() });

          const result = await appleOAuthService.signIn();

          if (result.success && result.requiresCallback) {
            set({ isLoading: false, error: null });
            logger.debug('Apple OAuth store: OAuth flow initiated, waiting for callback');
            return;
          } else if (result.success && result.user && result.session) {
            set({ isLoading: false, error: null });
            logger.debug('Apple OAuth store: Direct sign-in successful');
          } else if (result.userCancelled) {
            set({ isLoading: false, error: null });
            logger.debug('Apple OAuth store: Sign-in cancelled by user');
          } else {
            const errorMessage = result.error || i18n.t('auth.services.appleFailed');
            set({ error: errorMessage, isLoading: false });
            logger.error('Apple OAuth store: Sign-in failed:', { error: errorMessage });
            throw new Error(errorMessage);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : i18n.t('auth.services.appleFailed');
          set({ error: errorMessage, isLoading: false });
          logger.error('Apple OAuth store: Sign-in error:', error as Error);
          throw error;
        }
      });
    } catch (error) {
      logger.debug('Apple OAuth store: Sign-in operation already in progress', {
        error: (error as Error).message,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({ isLoading: false, lastAttemptAt: null, error: null });
  },

  getRemainingCooldown: () => {
    const { lastAttemptAt } = get();
    if (!lastAttemptAt) {
      return 0;
    }
    const cooldownPeriod = 3000;
    const elapsed = Date.now() - lastAttemptAt;
    return Math.max(0, cooldownPeriod - elapsed);
  },

  canAttemptSignIn: () => {
    const { getRemainingCooldown, isReady } = get();
    return isReady() && getRemainingCooldown() === 0;
  },

  isReady: () => {
    const { isInitialized } = get();
    return isInitialized && appleOAuthService.isReady();
  },
}));

export default useAppleOAuthStore;
