import { User as SupabaseUser } from '@supabase/supabase-js';
import { create } from 'zustand';

import { logger } from '@/utils/debugConfig';
import { queryClient } from '@/api/queryClient';
import { atomicOperationManager } from '../utils/atomicOperations';
import * as authService from '@/services/authService';
import { notificationService } from '@/services/notificationService';

/**
 * Core Authentication State Interface
 * Handles only the essential authentication state and operations
 */
export interface CoreAuthState {
  // Core State
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean;

  // Auth Listener State (moved from module level to prevent global mutation)
  authListenerSubscription: { unsubscribe: () => void } | null;
  isListenerActive: boolean;

  // Core Actions
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setLoading: (loading: boolean) => void;

  // Internal State Management
  setAuthState: (isAuthenticated: boolean, user: SupabaseUser | null) => void;
}

/**
 * Cancel queries during auth transitions to prevent stale data
 */
const cancelQueriesForAuthTransition = async (): Promise<void> => {
  try {
    await queryClient.cancelQueries();
    logger.debug('Cancelled all queries for auth transition');
  } catch (error) {
    logger.error('Failed to cancel queries during auth transition:', error as Error);
  }
};

/**
 * Complete auth transition cleanup
 */
const completeAuthTransition = (): void => {
  logger.debug('Auth transition completed');
};

/**
 * Determine if queries should be enabled based on user state
 */
export const shouldEnableQueries = (user: SupabaseUser | null): boolean => {
  return !!user;
};

/**
 * Core Auth Store
 *
 * Handles only the essential authentication state and operations.
 * Magic link operations are handled by magicLinkStore.
 * Session management is handled by sessionStore.
 */
export const useCoreAuthStore = create<CoreAuthState>((set, get) => ({
  // Initial State
  isAuthenticated: false,
  user: null,
  isLoading: true, // Start with loading true during initialization

  // Auth Listener State (previously global variables)
  authListenerSubscription: null,
  isListenerActive: false,

  // Core Actions
  initializeAuth: async () => {
    const operationKey = 'auth_init';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'auth_init', async () => {
        logger.debug('Core auth store: Initializing authentication');

        try {
          // Get initial session
          const session = await authService.getCurrentSession();

          // Set initial state based on session
          if (session?.user) {
            set({
              isAuthenticated: true,
              user: session.user,
              isLoading: false,
            });
            logger.debug('Core auth store: User authenticated on initialization', {
              userId: session.user.id,
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
            });
            logger.debug('Core auth store: No authenticated user on initialization');
          }

          // Set up auth state listener (only if not already active for this store instance)
          const currentState = get();
          if (!currentState.isListenerActive) {
            const authListener = authService.onAuthStateChange((event, session) => {
              logger.debug('Core auth store: Auth state changed', { event, hasSession: !!session });

              if (event === 'SIGNED_IN' && session?.user) {
                set({
                  isAuthenticated: true,
                  user: session.user,
                  isLoading: false,
                });
                logger.debug('Core auth store: User signed in', { userId: session.user.id });
              } else if (event === 'SIGNED_OUT') {
                set({
                  isAuthenticated: false,
                  user: null,
                  isLoading: false,
                });
                logger.debug('Core auth store: User signed out');
                // Remove push token on sign out
                const removePushToken = async () => {
                  try {
                    const token = await notificationService.getCurrentDevicePushToken();
                    if (token) {
                      await notificationService.removeTokenFromBackend(token);
                      logger.debug('Core auth store: Removed push token on sign out.');
                    }
                  } catch (error) {
                    logger.warn(
                      'Core auth store: Failed to get or remove push token on sign out.',
                      {
                        error: (error as Error).message,
                      }
                    );
                  }
                };
                removePushToken();
              } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                set({
                  isAuthenticated: true,
                  user: session.user,
                  isLoading: false,
                });
                logger.debug('Core auth store: Token refreshed', { userId: session.user.id });
              }
            });

            // Handle both possible return types from onAuthStateChange
            const subscription =
              'data' in authListener ? authListener.data.subscription : authListener;

            set({
              authListenerSubscription: subscription,
              isListenerActive: true,
            });
            logger.debug('Core auth store: Auth listener established');
          }
        } catch (error) {
          logger.error('Core auth store: Auth initialization failed:', error as Error);
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }
      });
    } catch (error) {
      logger.debug('Core auth store: Auth initialization already in progress', {
        error: (error as Error).message,
      });
    }
  },

  logout: async () => {
    const operationKey = 'logout';

    try {
      await atomicOperationManager.ensureAtomicOperation(operationKey, 'logout', async () => {
        set({ isLoading: true });

        try {
          // Cancel queries before logout
          await cancelQueriesForAuthTransition();

          const { error } = await authService.signOut();

          if (error) {
            logger.error('Core auth store: Logout error:', error);
            set({ isLoading: false });
            completeAuthTransition();
            throw error;
          } else {
            // Cleanup auth listener on logout
            const currentState = get();
            if (currentState.authListenerSubscription) {
              currentState.authListenerSubscription.unsubscribe();
            }

            // Immediately update auth store state for synchronous navigation
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              authListenerSubscription: null,
              isListenerActive: false,
            });

            // Re-initialize auth listener for subsequent logins
            setTimeout(() => {
              logger.debug('Core auth store: Re-initializing auth listener post-logout');
              get().initializeAuth();
            }, 100);

            // Clear all cached data
            queryClient.clear();

            logger.debug('Core auth store: Logout successful');
            completeAuthTransition();
          }
        } catch (error) {
          logger.error('Core auth store: Unexpected logout error:', error as Error);
          set({ isLoading: false });
          throw error;
        }
      });
    } catch (error) {
      logger.debug('Core auth store: Logout operation already in progress', {
        error: (error as Error).message,
      });
      throw error;
    }
  },

  setSessionFromTokens: async (accessToken: string, refreshToken: string) => {
    const operationKey = `session_tokens_${accessToken.slice(-8)}`;

    try {
      await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        'session_tokens',
        async () => {
          set({ isLoading: true });

          try {
            const { user, session, error } = await authService.setSessionFromTokens(
              accessToken,
              refreshToken
            );

            if (error) {
              set({ isLoading: false });
              logger.error('Core auth store: Failed to set session from tokens:', error);
              throw error;
            } else if (user && session) {
              set({
                isAuthenticated: true,
                user: user,
                isLoading: false,
              });
              logger.debug('Core auth store: Session set successfully from tokens', {
                userId: user.id,
              });
            } else {
              set({ isLoading: false });
              const error = new Error('Invalid session data received');
              logger.error('Core auth store: Invalid session data from tokens');
              throw error;
            }
          } catch (error) {
            set({ isLoading: false });
            logger.error('Core auth store: Session from tokens failed:', error as Error);
            throw error;
          }
        }
      );
    } catch (error) {
      logger.debug('Core auth store: Session tokens operation already in progress', {
        error: (error as Error).message,
      });
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setAuthState: (isAuthenticated: boolean, user: SupabaseUser | null) => {
    set({ isAuthenticated, user });
  },
}));

// Export default for backward compatibility
export default useCoreAuthStore;
