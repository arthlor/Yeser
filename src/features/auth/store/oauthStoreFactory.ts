import { create } from 'zustand';
import { User as SupabaseUser } from '@supabase/supabase-js';
import i18n from '@/i18n';

import { logger } from '@/utils/debugConfig';
import { atomicOperationManager } from '../utils/atomicOperations';
import { useCoreAuthStore } from './coreAuthStore';
import type { OAuthResult } from '../services/expoOAuthBase';
import type { AtomicOperation } from '../utils/atomicOperations';

export interface OAuthState {
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

interface OAuthStoreConfig {
  providerLabel: string;
  operationKeyPrefix: string;
  operationType: AtomicOperation['type'];
  service: {
    initialize: () => Promise<void>;
    signIn: () => Promise<OAuthResult>;
    isReady: () => boolean;
  };
  defaultErrorKey: string;
  setAuthOnDirectSignIn?: boolean;
}

const COOLDOWN_MS = 3000;

export const createOAuthStore = (config: OAuthStoreConfig) =>
  create<OAuthState>((set, get) => ({
    isLoading: false,
    isInitialized: false,
    lastAttemptAt: null,
    error: null,

    initialize: async () => {
      const operationKey = `${config.operationKeyPrefix}_init`;

      try {
        await atomicOperationManager.ensureAtomicOperation(
          operationKey,
          config.operationType,
          async () => {
            set({ isLoading: true, error: null });

            try {
              await config.service.initialize();

              set({
                isInitialized: true,
                isLoading: false,
                error: null,
              });

              logger.debug(`${config.providerLabel} OAuth store: Initialization successful`);
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : `${config.providerLabel} OAuth initialization failed`;
              set({
                error: errorMessage,
                isLoading: false,
                isInitialized: false,
              });
              logger.error(
                `${config.providerLabel} OAuth store: Initialization failed:`,
                error as Error
              );
              throw error;
            }
          }
        );
      } catch (error) {
        logger.debug(`${config.providerLabel} OAuth store: Initialization already in progress`, {
          error: (error as Error).message,
        });
        throw error;
      }
    },

    signIn: async () => {
      const operationKey = `${config.operationKeyPrefix}_signin`;

      try {
        await atomicOperationManager.ensureAtomicOperation(
          operationKey,
          config.operationType,
          async () => {
            set({ isLoading: true, error: null });

            try {
              if (!get().isReady()) {
                throw new Error(
                  `${config.providerLabel} OAuth service not ready. Please wait for initialization.`
                );
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

              const result = await config.service.signIn();

              if (result.success && result.requiresCallback) {
                set({ isLoading: false, error: null });
                logger.debug(`${config.providerLabel} OAuth store: OAuth flow initiated`);
                return;
              }

              if (result.success && result.user && result.session) {
                if (config.setAuthOnDirectSignIn !== false) {
                  const coreAuthStore = useCoreAuthStore.getState();
                  coreAuthStore.setAuthState(true, result.user as SupabaseUser);
                }

                set({ isLoading: false, error: null });
                logger.debug(`${config.providerLabel} OAuth store: Direct sign-in successful`);
                return;
              }

              if (result.userCancelled) {
                set({ isLoading: false, error: null });
                logger.debug(`${config.providerLabel} OAuth store: Sign-in cancelled by user`);
                return;
              }

              const errorMessage = result.error || i18n.t(config.defaultErrorKey);
              set({ error: errorMessage, isLoading: false });
              logger.error(`${config.providerLabel} OAuth store: Sign-in failed`, {
                error: errorMessage,
              });
              throw new Error(errorMessage);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : i18n.t(config.defaultErrorKey);
              set({ error: errorMessage, isLoading: false });
              logger.error(`${config.providerLabel} OAuth store: Sign-in error:`, error as Error);
              throw error;
            }
          }
        );
      } catch (error) {
        logger.debug(`${config.providerLabel} OAuth store: Sign-in operation already in progress`, {
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
      });
    },

    getRemainingCooldown: () => {
      const { lastAttemptAt } = get();
      if (!lastAttemptAt) {
        return 0;
      }
      const elapsed = Date.now() - lastAttemptAt;
      return Math.max(0, COOLDOWN_MS - elapsed);
    },

    canAttemptSignIn: () => {
      const { getRemainingCooldown, isReady } = get();
      return isReady() && getRemainingCooldown() === 0;
    },

    isReady: () => {
      const { isInitialized } = get();
      return isInitialized && config.service.isReady();
    },
  }));
