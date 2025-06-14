// src/store/authStore.ts
import { AuthError, User as SupabaseUser } from '@supabase/supabase-js';

import { create } from 'zustand';

import * as authService from '../services/authService'; // Import all from authService
import { queryClient } from '@/api/queryClient';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorTranslation';

import type { MagicLinkCredentials } from '../services/authService';

// Rate limiting constants
const MAGIC_LINK_COOLDOWN_MS = 60 * 1000; // 1 minute between requests

// **RACE CONDITION FIX**: Promise-based magic link request queue
interface MagicLinkRequest {
  credentials: MagicLinkCredentials;
  promise: {
    resolve: () => void;
    reject: (error: Error) => void;
  };
  timestamp: number;
}

const magicLinkQueue: MagicLinkRequest[] = [];
let isProcessingMagicLink = false;
let lastSuccessfulMagicLinkTime: number | null = null;

// **MEMORY LEAK FIX**: Store timeout reference for proper cleanup
let queueProcessingTimeoutRef: ReturnType<typeof setTimeout> | null = null;

// **RACE CONDITION FIX**: Atomic magic link request processor
const processMagicLinkQueue = async (
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState
): Promise<void> => {
  if (isProcessingMagicLink || magicLinkQueue.length === 0) {
    return;
  }

  isProcessingMagicLink = true;
  const request = magicLinkQueue.shift();

  // Safety check - should never happen due to length check above, but prevents ESLint error
  if (!request) {
    isProcessingMagicLink = false;
    return;
  }

  try {
    // Atomic rate limit check
    const now = Date.now();
    if (lastSuccessfulMagicLinkTime) {
      const timeSinceLastRequest = now - lastSuccessfulMagicLinkTime;
      if (timeSinceLastRequest < MAGIC_LINK_COOLDOWN_MS) {
        const remainingTime = Math.ceil((MAGIC_LINK_COOLDOWN_MS - timeSinceLastRequest) / 1000);
        throw new Error(`Lütfen ${remainingTime} saniye bekleyin ve tekrar deneyin.`);
      }
    }

    set({ isLoading: true, magicLinkSent: false });

    const { error } = await authService.signInWithMagicLink(request.credentials);

    if (error) {
      set({
        isLoading: false,
        magicLinkSent: false,
      });
      // **TOAST INTEGRATION**: Show error via toast
      handleStoreError(error, 'Magic link send failed');
      request.promise.reject(error instanceof Error ? error : new Error(String(error)));
    } else {
      // Update timestamp only on successful request
      lastSuccessfulMagicLinkTime = now;
      set({
        isLoading: false,
        magicLinkSent: true,
      });
      // **TOAST INTEGRATION**: Show success message
      handleStoreSuccess('Giriş bağlantısı email adresinize gönderildi!');
      request.promise.resolve();
    }
  } catch (error) {
    set({
      isLoading: false,
      magicLinkSent: false,
    });
    // **TOAST INTEGRATION**: Show error via toast
    handleStoreError(error, 'Magic link send failed');
    request.promise.reject(error instanceof Error ? error : new Error(String(error)));
  } finally {
    isProcessingMagicLink = false;

    // **MEMORY LEAK FIX**: Clear existing timeout before setting new one
    if (queueProcessingTimeoutRef) {
      clearTimeout(queueProcessingTimeoutRef);
      queueProcessingTimeoutRef = null;
    }

    // Process next request in queue after short delay
    if (magicLinkQueue.length > 0) {
      queueProcessingTimeoutRef = setTimeout(() => {
        processMagicLinkQueue(set, get);
        queueProcessingTimeoutRef = null;
      }, 100);
    }
  }
};

// **TOAST INTEGRATION**: Global error provider singleton pattern
// This allows auth store to access toast functionality without React hooks
interface GlobalErrorHandlers {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

let globalErrorHandlers: GlobalErrorHandlers | null = null;

// Function to register global error handlers (called by AppProviders)
export const registerGlobalErrorHandlers = (handlers: GlobalErrorHandlers) => {
  globalErrorHandlers = handlers;
  logger.debug('Global error handlers registered for auth store');
};

// **RACE CONDITION FIX**: Add atomic operation tracking
interface AtomicOperation {
  type:
    | 'magic_link'
    | 'auth_init'
    | 'logout'
    | 'session_tokens'
    | 'confirm_magic_link'
    | 'google_oauth';
  timestamp: number;
  promise: Promise<void>;
}

const currentOperations: Map<string, AtomicOperation> = new Map();

// **RACE CONDITION FIX**: Enhanced cleanup utility
const cleanupAtomicOperation = (key: string) => {
  const operation = currentOperations.get(key);
  if (operation && Date.now() - operation.timestamp > 30000) {
    // Clean up operations older than 30 seconds (prevent memory leaks)
    logger.warn(`Cleaning up stale atomic operation: ${key}`, {
      type: operation.type,
      age: Date.now() - operation.timestamp,
    });
  }
  currentOperations.delete(key);
};

// **RACE CONDITION FIX**: Prevent concurrent operations helper
const ensureAtomicOperation = async <T>(
  key: string,
  type: AtomicOperation['type'],
  operation: () => Promise<T>
): Promise<T> => {
  if (currentOperations.has(key)) {
    logger.debug(`Atomic operation ${key} already in progress, waiting...`);
    await currentOperations.get(key)?.promise;
    // If operation completed successfully, return early to prevent duplicate execution
    if (!currentOperations.has(key)) {
      throw new Error(`Operation ${key} already completed by concurrent call`);
    }
  }

  const operationPromise = operation();
  currentOperations.set(key, {
    type,
    timestamp: Date.now(),
    promise: operationPromise as Promise<void>,
  });

  try {
    const result = await operationPromise;
    return result;
  } finally {
    cleanupAtomicOperation(key);
  }
};

// Define the state interface for authentication
export interface AuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean; // For initial auth check and login/signup processes
  // **TOAST INTEGRATION**: Remove error from store state - now handled by toasts
  magicLinkSent: boolean; // Track if magic link was sent
  initializeAuth: () => Promise<void>; // New action to setup listener and check session
  loginWithMagicLink: (credentials: MagicLinkCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>; // New action for Google login
  confirmMagicLink: (tokenHash: string, type?: string) => Promise<void>;
  logout: () => Promise<void>; // Updated logout action
  setLoading: (loading: boolean) => void;
  // **TOAST INTEGRATION**: Remove error setters - replaced by toast handlers
  resetMagicLinkSent: () => void;
  canSendMagicLink: () => boolean; // Check if rate limit allows sending
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

let authListenerSubscription: { unsubscribe: () => void } | null = null;
// **RACE CONDITION FIX**: Add listener management state
let isListenerActive = false;

// **RACE CONDITION FIX**: Query coordination during auth state transitions
let isAuthStateTransitioning = false;

// **RACE CONDITION FIX**: Cancel ongoing queries during auth transitions
const cancelQueriesForAuthTransition = async (): Promise<void> => {
  try {
    // Cancel all ongoing queries before auth state change
    await queryClient.cancelQueries();

    // Mark that auth state is transitioning to prevent new query enables
    isAuthStateTransitioning = true;

    logger.debug('Queries cancelled for auth state transition');
  } catch (error) {
    logger.error('Failed to cancel queries during auth transition:', error as Error);
  }
};

// **RACE CONDITION FIX**: Complete auth transition and allow queries
const completeAuthTransition = (): void => {
  isAuthStateTransitioning = false;
  logger.debug('Auth state transition completed, queries re-enabled');
};

// **RACE CONDITION FIX**: Check if queries should be enabled (stable auth state)
export const shouldEnableQueries = (user: SupabaseUser | null): boolean => {
  // Don't enable queries during auth state transitions
  if (isAuthStateTransitioning) {
    return false;
  }

  // Only enable when user is present and authenticated
  return !!user?.id;
};

// **TOAST INTEGRATION**: Helper function to handle errors via toast system
const handleStoreError = (error: unknown, fallbackMessage?: string): void => {
  const errorMessage = safeErrorDisplay(error);

  // Only show error if it's not empty (cancellations return empty string)
  if (errorMessage && errorMessage.trim() !== '') {
    if (globalErrorHandlers?.showError) {
      globalErrorHandlers.showError(errorMessage);
    } else {
      // Fallback to console if handlers not registered yet
      logger.error('Auth error (no toast handlers available):', {
        error: errorMessage,
        fallback: fallbackMessage,
      });
    }
  }
};

// **TOAST INTEGRATION**: Helper function to show success messages
const handleStoreSuccess = (message: string): void => {
  if (globalErrorHandlers?.showSuccess) {
    globalErrorHandlers.showSuccess(message);
  } else {
    // Fallback to console if handlers not registered yet
    logger.info('Auth success (no toast handlers available):', { message });
  }
};

// Create the Zustand store
const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true, // Start with loading true for initial auth check
  magicLinkSent: false,

  initializeAuth: async () => {
    // **RACE CONDITION FIX**: Prevent multiple concurrent initializations
    const operationKey = 'auth_init';
    if (currentOperations.has(operationKey)) {
      logger.debug('Auth initialization already in progress, skipping');
      return;
    }

    const initPromise = (async () => {
      const startTime = Date.now();
      logger.debug('[COLD START DEBUG] Starting auth initialization...', {
        extra: { timestamp: startTime },
      });

      set({ isLoading: true });
      try {
        // 🚨 FORCE QUIT FIX: Add simple timeout to detect AsyncStorage deadlocks
        // If getCurrentSession hangs for more than 2 seconds, it's likely an AsyncStorage deadlock
        // Reduced from 5 seconds to 2 seconds for faster recovery
        logger.debug('[COLD START DEBUG] About to call getCurrentSession...', {
          extra: {
            timestamp: Date.now(),
            elapsed: Date.now() - startTime,
          },
        });

        const sessionPromise = authService.getCurrentSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            logger.warn(
              '[COLD START DEBUG] Auth initialization timeout triggered after 2 seconds - likely AsyncStorage deadlock'
            );
            reject(new Error('Auth initialization timeout - possible AsyncStorage deadlock'));
          }, 2000); // Reduced from 5000ms to 2000ms for faster recovery
        });

        const session = await Promise.race([sessionPromise, timeoutPromise]);
        logger.debug('[COLD START DEBUG] getCurrentSession completed', {
          extra: {
            timestamp: Date.now(),
            elapsed: Date.now() - startTime,
            hasSession: !!session,
            hasUser: !!session?.user,
          },
        });

        if (session) {
          set({ isAuthenticated: true, user: session.user, isLoading: false });
        } else {
          set({ isAuthenticated: false, user: null, isLoading: false });
        }

        // **RACE CONDITION FIX**: Atomic auth listener management
        // Prevent concurrent listener setup by checking inside atomic operation
        if (isListenerActive && authListenerSubscription) {
          logger.debug('Auth listener already active within atomic operation, skipping');
          return;
        }

        // Cleanup any existing listener atomically
        if (authListenerSubscription) {
          authListenerSubscription.unsubscribe();
          authListenerSubscription = null;
          isListenerActive = false;
        }

        // Set flag immediately to prevent race condition
        isListenerActive = true;

        // Subscribe to auth state changes
        const authListener = authService.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            // **RACE CONDITION FIX**: Cancel queries before auth state change
            await cancelQueriesForAuthTransition();

            set({
              isAuthenticated: true,
              user: session.user,
              isLoading: false,
              magicLinkSent: false,
            });

            // **RACE CONDITION FIX**: Complete transition after state update
            setTimeout(() => completeAuthTransition(), 100);
          } else if (event === 'SIGNED_OUT') {
            // **RACE CONDITION FIX**: Cancel queries before logout
            await cancelQueriesForAuthTransition();

            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              magicLinkSent: false,
            });

            // **RACE CONDITION FIX**: Complete transition after state update
            setTimeout(() => completeAuthTransition(), 100);
          } else if (event === 'USER_UPDATED' && session?.user) {
            set({ user: session.user });
          } else if (event === 'INITIAL_SESSION' && !session) {
            // No active session on startup
            set({ isAuthenticated: false, user: null, isLoading: false });
            completeAuthTransition(); // No need to cancel queries for initial state
          }
        });

        // Store the subscription - handle Supabase union return type
        if ('data' in authListener && authListener.data?.subscription) {
          authListenerSubscription = {
            unsubscribe: () => authListener.data.subscription.unsubscribe(),
          };
        } else if ('unsubscribe' in authListener) {
          authListenerSubscription = authListener;
        }

        logger.debug('Auth listener setup complete within atomic operation');
      } catch (error) {
        logger.error('Error in initializeAuth:', error as Error);

        // 🚨 FORCE QUIT FIX: Detect AsyncStorage deadlock timeouts
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('timeout') || errorMessage.includes('deadlock')) {
          logger.warn(
            'Detected AsyncStorage deadlock during auth initialization - app may be stuck on splash'
          );
          // Set loading to false so AppState listener can detect the stuck state
          set({
            isAuthenticated: false,
            user: null,
            isLoading: true, // Keep loading true so AppState listener can detect stuck state
            magicLinkSent: false,
          });
        } else {
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            magicLinkSent: false,
          });
        }

        handleStoreError(error, 'Auth initialization failed');
      }
    })();

    currentOperations.set(operationKey, {
      type: 'auth_init',
      timestamp: Date.now(),
      promise: initPromise,
    });

    try {
      await initPromise;
    } finally {
      cleanupAtomicOperation(operationKey);
    }
  },

  canSendMagicLink: () => {
    // **RACE CONDITION FIX**: Check queue-based rate limiting
    if (isProcessingMagicLink) {
      return false; // Request currently being processed
    }

    if (!lastSuccessfulMagicLinkTime) {
      return true;
    }

    const timeSinceLastRequest = Date.now() - lastSuccessfulMagicLinkTime;
    return timeSinceLastRequest >= MAGIC_LINK_COOLDOWN_MS;
  },

  loginWithMagicLink: async (credentials) => {
    // **RACE CONDITION FIX**: Use promise-based queuing for atomic rate limiting
    return new Promise<void>((resolve, reject) => {
      const request: MagicLinkRequest = {
        credentials,
        promise: { resolve, reject },
        timestamp: Date.now(),
      };

      // Add to queue
      magicLinkQueue.push(request);

      // Start processing if not already processing
      if (!isProcessingMagicLink) {
        processMagicLinkQueue(set, get);
      }
    });
  },

  confirmMagicLink: async (tokenHash, type = 'magiclink') => {
    // 🚨 RACE CONDITION FIX: Use atomic operation protection
    const operationKey = `confirm_magic_link_${tokenHash.slice(-8)}`;

    try {
      await ensureAtomicOperation(operationKey, 'confirm_magic_link', async () => {
        set({ isLoading: true });
        try {
          const { user, session, error } = await authService.confirmMagicLink(tokenHash, type);
          if (error) {
            set({
              isLoading: false,
              magicLinkSent: false, // Reset so user can request new link
            });
            // **TOAST INTEGRATION**: Show error via toast
            handleStoreError(error, 'Magic link confirmation failed');
          } else if (user && session) {
            // 🚨 SINGLE SOURCE UPDATE: Remove dual-update pattern, use auth listener only
            set({
              isLoading: false,
              magicLinkSent: false,
            });

            logger.debug(
              'Magic link confirmed successfully - relying on auth listener for state update',
              {
                userId: session.user?.id,
                hasSession: !!session,
              }
            );

            // **TOAST INTEGRATION**: Show success message
            handleStoreSuccess('Başarıyla giriş yaptınız!');

            // Auth state change listener will handle the authentication state update
          } else {
            set({
              isLoading: false,
              magicLinkSent: false,
            });
            // **TOAST INTEGRATION**: Show error via toast
            handleStoreError(
              new Error('Geçersiz giriş bağlantısı. Lütfen yeni bir bağlantı talep edin.'),
              'Invalid magic link'
            );
          }
        } catch (error) {
          set({
            isLoading: false,
            magicLinkSent: false,
          });
          // **TOAST INTEGRATION**: Show error via toast
          handleStoreError(error, 'Magic link confirmation failed');
        }
      });
    } catch (error) {
      // Handle atomic operation conflicts (duplicate token confirmation)
      logger.debug('Magic link confirmation already in progress', {
        tokenHash: tokenHash.slice(-8),
        error: (error as Error).message,
      });
    }
  },

  loginWithGoogle: async () => {
    // 🚨 RACE CONDITION FIX: Use atomic operation protection
    const operationKey = 'google_oauth';

    try {
      await ensureAtomicOperation(operationKey, 'google_oauth', async () => {
        // Check if already authenticated inside atomic operation
        const currentState = get();
        if (currentState.isAuthenticated && currentState.user && !currentState.isLoading) {
          logger.warn('Google OAuth attempted while user already authenticated - ignoring', {
            userId: currentState.user.id,
            isAuthenticated: currentState.isAuthenticated,
            isLoading: currentState.isLoading,
          });

          // Show user-friendly message and return early
          handleStoreSuccess('Zaten giriş yapmış durumdasınız!');
          return;
        }

        logger.debug('Google OAuth starting', {
          isAuthenticated: currentState.isAuthenticated,
          hasUser: !!currentState.user,
          isLoading: currentState.isLoading,
          scenario: 'post_logout_or_fresh_login',
        });

        set({ isLoading: true });

        // 🚨 CRITICAL FIX: Add timeout watchdog to prevent infinite loading
        const watchdogTimer = setTimeout(() => {
          logger.warn('Google OAuth timeout - forcing reset to prevent infinite loading');
          set({
            isLoading: false,
            magicLinkSent: false,
          });
          handleStoreError(
            new Error('Google giriş işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.'),
            'Google OAuth timeout'
          );
        }, 30000); // 30 second timeout

        try {
          const { error } = await authService.signInWithGoogle();

          // Clear watchdog timer on completion
          clearTimeout(watchdogTimer);

          if (error) {
            if ((error as AuthError).name === 'AuthCancelledError') {
              // Don't treat cancellation as an error - it's a normal user action
              set({ isLoading: false });
              logger.debug('Google OAuth cancelled by user');
            } else {
              // Handle actual errors (not cancellations)
              set({ isLoading: false });

              // 🚨 CRITICAL FIX: Enhanced error handling for re-authentication scenarios
              logger.error('Google OAuth error after logout scenario:', {
                errorMessage: (error as Error).message,
                errorName: (error as Error).name,
                timestamp: Date.now().toString(),
                scenario: 'post_logout_google_oauth',
              });

              // **TOAST INTEGRATION**: Show error via toast
              handleStoreError(error, 'Google login failed');
            }
          } else {
            // 🚨 CRITICAL FIX: Reset loading state when OAuth completes successfully
            // Don't leave app in loading state waiting for auth listener
            set({ isLoading: false });
            logger.debug('Google OAuth completed successfully');
          }
        } catch (error) {
          // Clear watchdog timer on error
          clearTimeout(watchdogTimer);
          set({ isLoading: false });
          // **TOAST INTEGRATION**: Show error via toast
          handleStoreError(error, 'Google login failed');
        }
      });
    } catch (error) {
      // Handle atomic operation conflicts (concurrent calls)
      logger.debug('Google OAuth operation already in progress', {
        error: (error as Error).message,
      });
    }
  },

  logout: async () => {
    // **RACE CONDITION FIX**: Use enhanced atomic operation system
    const operationKey = 'logout';

    try {
      await ensureAtomicOperation(operationKey, 'logout', async () => {
        set({ isLoading: true });

        // 🚨 RACE CONDITION FIX: Cancel any ongoing auth operations before logout
        if (currentOperations.has('google_oauth')) {
          logger.debug('Cancelling ongoing Google OAuth during logout');
          currentOperations.delete('google_oauth');
        }
        if (currentOperations.has('session_tokens')) {
          logger.debug('Cancelling ongoing session token processing during logout');
          // Remove all session token operations
          for (const [key] of currentOperations) {
            if (key.startsWith('session_tokens_')) {
              currentOperations.delete(key);
            }
          }
        }
        if (currentOperations.has('confirm_magic_link')) {
          logger.debug('Cancelling ongoing magic link confirmation during logout');
          // Remove all magic link confirmations
          for (const [key] of currentOperations) {
            if (key.startsWith('confirm_magic_link_')) {
              currentOperations.delete(key);
            }
          }
        }

        try {
          // **RACE CONDITION FIX**: Cancel queries before logout
          await cancelQueriesForAuthTransition();

          const { error } = await authService.signOut();
          if (error) {
            logger.error('Logout error:', error);
            set({ isLoading: false });
            // **RACE CONDITION FIX**: Complete transition on error
            completeAuthTransition();
            // **TOAST INTEGRATION**: Show error via toast
            handleStoreError(error, 'Logout failed');
          } else {
            // 🚨 CRITICAL FIX: Immediately update auth store state for synchronous navigation
            // Clear authenticated state before cleaning up listener
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              magicLinkSent: false,
            });

            // **RACE CONDITION FIX**: Properly cleanup auth listener on logout
            if (authListenerSubscription) {
              authListenerSubscription.unsubscribe();
              authListenerSubscription = null;
              isListenerActive = false;
            }

            // 🚨 CRITICAL FIX: Re-initialize auth listener for subsequent logins
            // This ensures clean state for Google OAuth re-authentication
            setTimeout(() => {
              logger.debug('Re-initializing auth listener post-logout for clean re-authentication');
              get().initializeAuth();
            }, 100); // Small delay to ensure cleanup is complete

            // Clear all cached data
            queryClient.clear();

            // 🚨 CRITICAL FIX: Additional cleanup for Google OAuth re-authentication
            // Reset any lingering magic link state that could interfere with OAuth
            set((state) => ({
              ...state,
              isAuthenticated: false,
              user: null,
              isLoading: false,
              magicLinkSent: false,
            }));

            logger.debug('Logout successful - comprehensive state cleanup completed', {
              isAuthenticated: false,
              hasUser: false,
              hasSession: false,
              magicLinkSent: false,
            });

            // **TOAST INTEGRATION**: Show success message
            handleStoreSuccess('Başarıyla çıkış yaptınız');

            // **RACE CONDITION FIX**: Complete auth transition
            completeAuthTransition();

            // Auth state change listener was already cleaned up, so immediate state update is critical
          }
        } catch (error) {
          logger.error('Unexpected logout error:', error as Error);
          set({ isLoading: false });
          // **TOAST INTEGRATION**: Show error via toast
          handleStoreError(error, 'Logout failed');
        }
      });
    } catch (error) {
      // Handle atomic operation conflicts (concurrent logout attempts)
      logger.debug('Logout operation already in progress', { error: (error as Error).message });
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  resetMagicLinkSent: () => set({ magicLinkSent: false }),

  // --- Handle OAuth-style Magic Link Tokens ---
  setSessionFromTokens: async (accessToken: string, refreshToken: string) => {
    // 🚨 RACE CONDITION FIX: Use atomic operation protection with token-based key
    const tokenKey = `${accessToken.slice(-8)}_${refreshToken.slice(-8)}`;
    const operationKey = `session_tokens_${tokenKey}`;

    try {
      await ensureAtomicOperation(operationKey, 'session_tokens', async () => {
        set({ isLoading: true });
        try {
          const { user, session, error } = await authService.setSessionFromTokens(
            accessToken,
            refreshToken
          );
          if (error) {
            set({
              isLoading: false,
              magicLinkSent: false, // Reset magic link state so user can request new one
            });
            // **TOAST INTEGRATION**: Show error via toast
            handleStoreError(error, 'Session setup failed');
          } else if (user && session) {
            // 🚨 SINGLE SOURCE UPDATE: Remove dual-update pattern, use auth listener only
            set({
              isLoading: false,
              magicLinkSent: false,
            });

            logger.debug(
              'OAuth token authentication successful - relying on auth listener for state update',
              {
                userId: session.user?.id,
                hasSession: !!session,
              }
            );

            // **TOAST INTEGRATION**: Show success message
            handleStoreSuccess('Başarıyla giriş yaptınız!');

            // Auth state change listener will handle the authentication state update
          } else {
            set({
              isLoading: false,
              magicLinkSent: false,
            });
            // **TOAST INTEGRATION**: Show error via toast
            handleStoreError(
              new Error('Geçersiz giriş bilgileri. Lütfen yeni bir bağlantı talep edin.'),
              'Invalid session tokens'
            );
          }
        } catch (error) {
          set({
            isLoading: false,
            magicLinkSent: false,
          });
          // **TOAST INTEGRATION**: Show error via toast
          handleStoreError(error, 'Session setup failed');
        }
      });
    } catch (error) {
      // Handle atomic operation conflicts (duplicate token processing)
      logger.debug('Session token processing already in progress', {
        tokenKey,
        error: (error as Error).message,
      });
    }
  },
}));

export default useAuthStore;
