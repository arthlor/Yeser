import { create } from 'zustand';

import { logger } from '@/utils/debugConfig';
import { atomicOperationManager } from '../utils/atomicOperations';
import { magicLinkService } from '../services/magicLinkService';
import { FEATURE_FLAGS } from '@/utils/featureFlags';
import { PerformanceProfiler } from '@/utils/performanceProfiler';

import type { MagicLinkCredentials } from '@/services/authService';

/**
 * Magic Link State Interface
 * Handles magic link specific operations and state
 */
export interface MagicLinkState {
  // Magic Link State
  isLoading: boolean;
  lastSentEmail: string | null;
  lastSentAt: number | null;
  error: string | null;

  // Magic Link Actions
  sendMagicLink: (
    credentials: MagicLinkCredentials,
    onSuccess?: (message: string) => void,
    onError?: (error: Error) => void
  ) => Promise<void>;
  confirmMagicLink: (tokenHash: string, type?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;

  // Rate Limiting Info
  getRemainingCooldown: () => number;
  canSendMagicLink: () => boolean;
}

/**
 * Magic Link Store
 *
 * Handles all magic link related operations including:
 * - Sending magic links
 * - Confirming magic links
 * - Rate limiting and cooldown management
 * - Error handling specific to magic links
 * - Integration with UI callbacks for toasts
 */
export const useMagicLinkStore = create<MagicLinkState>((set, get) => ({
  // Initial State
  isLoading: false,
  lastSentEmail: null,
  lastSentAt: null,
  error: null,

  // Magic Link Actions
  sendMagicLink: async (
    credentials: MagicLinkCredentials,
    onSuccess?: (message: string) => void,
    onError?: (error: Error) => void
  ) => {
    // 🚀 Feature-flagged optimized implementation
    if (FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V1 || FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V2) {
      const endTimer = PerformanceProfiler.startTimer('magic_link_store_optimized');

      try {
        await magicLinkService.sendMagicLinkOptimized(credentials, {
          onSuccess: (message: string) => {
            set({
              lastSentEmail: credentials.email,
              lastSentAt: Date.now(),
              error: null,
              isLoading: false,
            });
            logger.debug('Magic link store optimized: Success', { email: credentials.email });
            onSuccess?.(message);
          },
          onError: (error: Error) => {
            set({
              error: error.message,
              isLoading: false,
            });
            logger.error('Magic link store optimized: Error', error);
            onError?.(error);
          },
          onStateChange: ({ isLoading, magicLinkSent: _magicLinkSent, error }) => {
            set({
              isLoading,
              error: error || null,
            });
            // Additional state updates handled in success/error callbacks
          },
        });
      } finally {
        endTimer();
      }
      return;
    }

    // 📜 Legacy implementation (fallback)
    const operationKey = `magic_link_${credentials.email}`;

    try {
      await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        'magic_link_send',
        async () => {
          set({ isLoading: true, error: null });

          try {
            // Check rate limiting
            if (!get().canSendMagicLink()) {
              const remainingCooldown = get().getRemainingCooldown();
              const errorMessage = `Please wait ${Math.ceil(remainingCooldown / 1000)} seconds before sending another magic link.`;
              set({ error: errorMessage, isLoading: false });

              // FIXED: Don't throw after calling error callback - let caller handle the error
              if (onError) {
                onError(new Error(errorMessage));
              }
              return; // Exit without throwing
            }

            // Send magic link via service with callbacks that update store state
            await magicLinkService.sendMagicLink(
              credentials,
              (message: string) => {
                // Success callback - Update store state immediately
                set({
                  isLoading: false,
                  lastSentEmail: credentials.email,
                  lastSentAt: Date.now(),
                  error: null,
                });
                logger.debug('Magic link store: Magic link sent successfully', {
                  email: credentials.email,
                  message,
                });

                // Forward success callback to UI if provided
                if (onSuccess) {
                  onSuccess(message);
                }
              },
              (error: Error) => {
                // FIXED: Error callback - don't throw, just update state and forward
                set({ error: error.message, isLoading: false });
                logger.error('Magic link store: Send magic link failed:', error);

                // Forward error callback to UI if provided
                if (onError) {
                  onError(error);
                }
                // Don't throw here - let the service handle promise rejection
              },
              (loading: boolean) => {
                // Loading callback
                set({ isLoading: loading });
              },
              (sent: boolean) => {
                // Magic link sent state callback - this updates the UI state
                // This callback is called by the service when magic link is successfully sent
                logger.debug('Magic link store: Magic link sent state updated', { sent });
              }
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to send magic link';
            set({ error: errorMessage, isLoading: false });
            logger.error('Magic link store: Send magic link error:', error as Error);

            // FIXED: Don't throw again - the error is already handled by the service
            if (onError) {
              onError(error as Error);
            }
          }
        }
      );
    } catch (error) {
      logger.debug('Magic link store: Send magic link operation already in progress', {
        error: (error as Error).message,
      });
      // Don't throw here either - operation conflict is not a user-facing error
      if (onError) {
        onError(new Error('Giriş işlemi devam ediyor. Lütfen bekleyin.'));
      }
    }
  },

  confirmMagicLink: async (tokenHash: string, type: string = 'magiclink') => {
    const operationKey = `confirm_magic_link_${tokenHash.slice(-8)}`;

    try {
      await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        'magic_link_confirm',
        async () => {
          set({ isLoading: true, error: null });

          try {
            // Confirm magic link via service with callbacks
            const result = await magicLinkService.confirmMagicLink(
              tokenHash,
              type,
              (message: string) => {
                // Success callback
                set({ isLoading: false, error: null });
                logger.debug('Magic link store: Magic link confirmed successfully', { message });
              },
              (error: Error) => {
                // Error callback
                set({ error: error.message, isLoading: false });
                logger.error('Magic link store: Confirm magic link failed:', error);
                // FIXED: Don't throw here - let the service handle it
              },
              (loading: boolean) => {
                // Loading callback
                set({ isLoading: loading });
              },
              () => {
                // Magic link sent callback (not used in store)
              }
            );

            if (result && result.user && result.session) {
              // FIXED: Remove manual state update to prevent race condition with auth listener
              // The coreAuthStore auth listener will handle this automatically
              // const coreAuthStore = useCoreAuthStore.getState();
              // coreAuthStore.setAuthState(true, result.user as SupabaseUser);
              logger.debug('Magic link store: Letting auth listener handle state update');
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to confirm magic link';
            set({ error: errorMessage, isLoading: false });
            logger.error('Magic link store: Confirm magic link error:', error as Error);
            // FIXED: Don't throw - error is already handled
          }
        }
      );
    } catch (error) {
      logger.debug('Magic link store: Confirm magic link operation already in progress', {
        error: (error as Error).message,
      });
      // Don't throw for operation conflicts
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      isLoading: false,
      lastSentEmail: null,
      lastSentAt: null,
      error: null,
    });
  },

  // Rate Limiting Utilities
  getRemainingCooldown: () => {
    // FIXED: Use service's rate limiting instead of local state
    return magicLinkService.getMagicLinkCooldownRemaining() * 1000; // Convert to milliseconds
  },

  canSendMagicLink: () => {
    // FIXED: Remove unused email parameter to match actual behavior
    // Always use service's global rate limiting for consistency
    return magicLinkService.canSendMagicLink();
  },
}));

// Export default for backward compatibility
export default useMagicLinkStore;
