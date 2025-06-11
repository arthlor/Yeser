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
  type: 'magic_link' | 'auth_init' | 'logout';
  timestamp: number;
  promise: Promise<void>;
}

const currentOperations: Map<string, AtomicOperation> = new Map();

// Define the state interface for authentication
export interface AuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean; // For initial auth check and login/signup processes
  // **TOAST INTEGRATION**: Remove error from store state - now handled by toasts
  magicLinkSent: boolean; // Track if magic link was sent
  lastMagicLinkRequest: number | null; // Timestamp of last request
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
        fallback: fallbackMessage 
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

// **RACE CONDITION FIX**: Atomic rate limiting check and update
const atomicMagicLinkRateCheck = (
  get: () => AuthState,
  set: (partial: Partial<AuthState>) => void
): boolean => {
  const operationKey = 'magic_link_rate_check';

  // Check if a magic link operation is already in progress
  if (currentOperations.has(operationKey)) {
    return false; // Operation in progress, deny request
  }

  const state = get();
  const now = Date.now();

  // Check rate limit
  if (state.lastMagicLinkRequest) {
    const timeSinceLastRequest = now - state.lastMagicLinkRequest;
    if (timeSinceLastRequest < MAGIC_LINK_COOLDOWN_MS) {
      return false; // Rate limited
    }
  }

  // Atomically reserve the operation slot and update timestamp
  const operation: AtomicOperation = {
    type: 'magic_link',
    timestamp: now,
    promise: Promise.resolve(), // Will be replaced with actual operation
  };
  currentOperations.set(operationKey, operation);

  // Update last request timestamp immediately to prevent race conditions
  set({ lastMagicLinkRequest: now });

  return true; // Rate limit check passed, operation reserved
};

// **RACE CONDITION FIX**: Clean up atomic operation
const cleanupAtomicOperation = (operationKey: string): void => {
  currentOperations.delete(operationKey);
};

// Create the Zustand store
const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true, // Start with loading true for initial auth check
  error: null,
  magicLinkSent: false,
  lastMagicLinkRequest: null,

  initializeAuth: async () => {
    // **RACE CONDITION FIX**: Prevent multiple concurrent initializations
    const operationKey = 'auth_init';
    if (currentOperations.has(operationKey)) {
      logger.debug('Auth initialization already in progress, skipping');
      return;
    }

    const initPromise = (async () => {
      set({ isLoading: true });
      try {
        const session = await authService.getCurrentSession();
        if (session && session.user) {
          set({ isAuthenticated: true, user: session.user, isLoading: false });
        } else {
          set({ isAuthenticated: false, user: null, isLoading: false });
        }

        // **RACE CONDITION FIX**: Properly manage auth listener subscription
        if (isListenerActive && authListenerSubscription) {
          logger.debug('Auth listener already active, skipping subscription setup');
          return;
        }

        // Unsubscribe from any existing listener before creating a new one
        if (authListenerSubscription) {
          authListenerSubscription.unsubscribe();
          isListenerActive = false;
        }

        // Subscribe to auth state changes
        authListenerSubscription = authService.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
            set({
              isAuthenticated: true,
              user: session.user,
              isLoading: false,
              magicLinkSent: false,
            });
          } else if (event === 'SIGNED_OUT') {
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              magicLinkSent: false,
            });
          } else if (event === 'USER_UPDATED' && session?.user) {
            set({ user: session.user });
          } else if (event === 'INITIAL_SESSION' && !session) {
            // No active session on startup
            set({ isAuthenticated: false, user: null, isLoading: false });
          }
        });

        isListenerActive = true;
        logger.debug('Auth listener subscribed successfully');
      } catch (error) {
        logger.error('Error in initializeAuth:', error as Error);
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
        // **TOAST INTEGRATION**: Show error via toast instead of setting in state
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
    const state = get();

    // **RACE CONDITION FIX**: Check for ongoing operations
    if (currentOperations.has('magic_link_rate_check')) {
      return false; // Operation in progress
    }

    if (!state.lastMagicLinkRequest) {
      return true;
    }

    const timeSinceLastRequest = Date.now() - state.lastMagicLinkRequest;
    return timeSinceLastRequest >= MAGIC_LINK_COOLDOWN_MS;
  },

  loginWithMagicLink: async (credentials) => {
    // **RACE CONDITION FIX**: Use atomic rate limiting check
    if (!atomicMagicLinkRateCheck(get, set)) {
      const state = get();
      const remainingTime = Math.ceil(
        (MAGIC_LINK_COOLDOWN_MS - (Date.now() - (state.lastMagicLinkRequest || 0))) / 1000
      );
      // **TOAST INTEGRATION**: Show rate limit error via toast
      handleStoreError(
        new Error(`Lütfen ${remainingTime} saniye bekleyin ve tekrar deneyin.`),
        'Rate limit exceeded'
      );
      set({ isLoading: false });
      return;
    }

    const operationKey = 'magic_link_rate_check';

    set({ isLoading: true, magicLinkSent: false });

    try {
      const { error } = await authService.signInWithMagicLink(credentials);

      if (error) {
        set({
          isLoading: false,
          magicLinkSent: false,
        });
        // **TOAST INTEGRATION**: Show error via toast
        handleStoreError(error, 'Magic link send failed');
      } else {
        set({
          isLoading: false,
          magicLinkSent: true,
          // lastMagicLinkRequest already set in atomicMagicLinkRateCheck
        });
        // **TOAST INTEGRATION**: Show success message
        handleStoreSuccess('Giriş bağlantısı email adresinize gönderildi!');
      }
    } catch (error) {
      set({
        isLoading: false,
        magicLinkSent: false,
      });
      // **TOAST INTEGRATION**: Show error via toast
      handleStoreError(error, 'Magic link send failed');
    } finally {
      // **RACE CONDITION FIX**: Always clean up atomic operation
      cleanupAtomicOperation(operationKey);
    }
  },

  confirmMagicLink: async (tokenHash, type = 'magiclink') => {
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
        // Auth state change listener will handle the state update
        logger.debug('Magic link confirmed successfully');
        // **TOAST INTEGRATION**: Show success message
        handleStoreSuccess('Başarıyla giriş yaptınız!');
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
  },

  loginWithGoogle: async () => {
    set({ isLoading: true });

    try {
      const { error } = await authService.signInWithGoogle();

      if (error) {
        if ((error as AuthError).name === 'AuthCancelledError') {
          // Don't treat cancellation as an error - it's a normal user action
          set({ isLoading: false });
          logger.debug('Google OAuth cancelled by user');
        } else {
          // Handle actual errors (not cancellations)
          set({ isLoading: false });
          // **TOAST INTEGRATION**: Show error via toast
          handleStoreError(error, 'Google login failed');
        }
      } else {
        // Success will be handled by auth state change listener
        logger.debug('Google OAuth initiated successfully');
      }
    } catch (error) {
      set({ isLoading: false });
      // **TOAST INTEGRATION**: Show error via toast
      handleStoreError(error, 'Google login failed');
    }
  },

  logout: async () => {
    // **RACE CONDITION FIX**: Prevent multiple concurrent logouts
    const operationKey = 'logout';
    if (currentOperations.has(operationKey)) {
      logger.debug('Logout already in progress, skipping');
      return;
    }

    const logoutPromise = (async () => {
      set({ isLoading: true });
      try {
        const { error } = await authService.signOut();
        if (error) {
          logger.error('Logout error:', error);
          set({ isLoading: false });
          // **TOAST INTEGRATION**: Show error via toast
          handleStoreError(error, 'Logout failed');
        } else {
          // **RACE CONDITION FIX**: Properly cleanup auth listener on logout
          if (authListenerSubscription) {
            authListenerSubscription.unsubscribe();
            authListenerSubscription = null;
            isListenerActive = false;
          }

          // Clear all cached data
          queryClient.clear();
          logger.debug('Logout successful');
          // **TOAST INTEGRATION**: Show success message
          handleStoreSuccess('Başarıyla çıkış yaptınız');
        }
      } catch (error) {
        logger.error('Unexpected logout error:', error as Error);
        set({ isLoading: false });
        // **TOAST INTEGRATION**: Show error via toast
        handleStoreError(error, 'Logout failed');
      }
    })();

    currentOperations.set(operationKey, {
      type: 'logout',
      timestamp: Date.now(),
      promise: logoutPromise,
    });

    try {
      await logoutPromise;
    } finally {
      cleanupAtomicOperation(operationKey);
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  resetMagicLinkSent: () => set({ magicLinkSent: false }),

  // --- Handle OAuth-style Magic Link Tokens ---
  setSessionFromTokens: async (accessToken: string, refreshToken: string) => {
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
        // Auth state change listener will handle the state update
        logger.debug('OAuth token authentication successful');
        // **TOAST INTEGRATION**: Show success message
        handleStoreSuccess('Başarıyla giriş yaptınız!');
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
  },
}));

export default useAuthStore;
