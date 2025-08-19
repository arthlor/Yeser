// src/store/authStore.ts
/**
 * BACKWARD COMPATIBILITY WRAPPER
 *
 * This file maintains backward compatibility with the existing auth store interface
 * while delegating to the new modular auth stores under the hood.
 *
 * New code should use the modular stores directly from @/features/auth/store
 */

import { User as SupabaseUser } from '@supabase/supabase-js';

import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorTranslation';

// Import the new modular stores
import {
  shouldEnableQueries as newShouldEnableQueries,
  useAppleOAuthStore,
  useCoreAuthStore,
  useGoogleOAuthStore,
  useMagicLinkStore,
  useSessionStore,
} from '@/features/auth/store';

import type { MagicLinkCredentials } from '../services/authService';

/**
 * Legacy Auth State Interface
 * Maintained for backward compatibility
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean;
  magicLinkSent: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  loginWithMagicLink: (credentials: MagicLinkCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  confirmMagicLink: (tokenHash: string, type?: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  resetMagicLinkSent: () => void;
  canSendMagicLink: () => boolean;
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

/**
 * Toast Integration
 * Global error handlers for backward compatibility
 */
interface GlobalErrorHandlers {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

let globalErrorHandlers: GlobalErrorHandlers | null = null;

export const registerGlobalErrorHandlers = (handlers: GlobalErrorHandlers) => {
  globalErrorHandlers = handlers;
  logger.debug('Global error handlers registered for auth store', {});
};

const handleStoreError = (error: unknown, fallbackMessage?: string): void => {
  const message = safeErrorDisplay(error) || fallbackMessage || 'An error occurred';

  if (globalErrorHandlers) {
    globalErrorHandlers.showError(message);
  } else {
    logger.warn('No global error handlers registered, error not displayed to user', { message });
  }
};

const handleStoreSuccess = (message: string): void => {
  if (globalErrorHandlers) {
    globalErrorHandlers.showSuccess(message);
  } else {
    logger.warn('No global error handlers registered, success message not displayed', { message });
  }
};

/**
 * Backward Compatible Auth Store
 *
 * This creates a Zustand store that maintains the old interface
 * while delegating to the new modular stores
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useAuthStoreImpl = create<AuthState>()(
  subscribeWithSelector((set, _get) => {
    // Helper to get current combined state
    const getDerivedState = () => {
      const coreAuth = useCoreAuthStore.getState();
      const magicLink = useMagicLinkStore.getState();

      // Track magic link sent state (derived from magic link store)
      const magicLinkSent = !!magicLink.lastSentEmail && !!magicLink.lastSentAt;

      return {
        isAuthenticated: coreAuth.isAuthenticated,
        user: coreAuth.user,
        isLoading: coreAuth.isLoading || magicLink.isLoading,
        magicLinkSent,
      };
    };

    // Subscribe to changes in modular stores with simple approach
    useCoreAuthStore.subscribe(() => {
      const derived = getDerivedState();
      set((state) => ({
        ...state,
        isAuthenticated: derived.isAuthenticated,
        user: derived.user,
        isLoading: derived.isLoading,
      }));
    });

    useMagicLinkStore.subscribe(() => {
      const derived = getDerivedState();
      set((state) => ({
        ...state,
        isLoading: derived.isLoading,
        magicLinkSent: derived.magicLinkSent,
      }));
    });

    const initialState = getDerivedState();

    return {
      // Initial state from modular stores
      ...initialState,

      // Actions - delegate to appropriate stores
      initializeAuth: async () => {
        try {
          await useCoreAuthStore.getState().initializeAuth();
        } catch (error) {
          handleStoreError(error, 'Failed to initialize authentication');
          throw error;
        }
      },

      loginWithMagicLink: async (credentials: MagicLinkCredentials) => {
        try {
          await useMagicLinkStore.getState().sendMagicLink(credentials);
          handleStoreSuccess('Giriş bağlantısı email adresinize gönderildi!');
        } catch (error) {
          handleStoreError(error, 'Magic link send failed');
          throw error;
        }
      },

      loginWithGoogle: async () => {
        try {
          await useGoogleOAuthStore.getState().signIn();
          handleStoreSuccess('Google ile başarıyla giriş yaptınız!');
        } catch (error) {
          // Handle special case where OAuth callback is required
          if (error instanceof Error && error.message === 'OAUTH_CALLBACK_REQUIRED') {
            // Don't show error - this is expected for OAuth redirect flow
            logger.debug('OAuth callback required - waiting for deep link');
            return; // Don't throw error or show success message
          }

          handleStoreError(error, 'Google login failed');
          throw error;
        }
      },

      loginWithApple: async () => {
        try {
          await useAppleOAuthStore.getState().signIn();
          handleStoreSuccess('Apple ile başarıyla giriş yaptınız!');
        } catch (error) {
          if (error instanceof Error && error.message === 'OAUTH_CALLBACK_REQUIRED') {
            logger.debug('OAuth callback required - waiting for deep link');
            return;
          }
          handleStoreError(error, 'Apple login failed');
          throw error;
        }
      },

      confirmMagicLink: async (tokenHash: string, type?: string) => {
        try {
          await useMagicLinkStore.getState().confirmMagicLink(tokenHash, type);
          handleStoreSuccess('Başarıyla giriş yaptınız!');
        } catch (error) {
          handleStoreError(error, 'Magic link confirmation failed');
          throw error;
        }
      },

      logout: async () => {
        try {
          await useCoreAuthStore.getState().logout();
          // Clear magic link state on logout
          useMagicLinkStore.getState().reset();
          // Clear session state on logout
          useSessionStore.getState().clearPersistedSession();
          handleStoreSuccess('Başarıyla çıkış yaptınız');
        } catch (error) {
          handleStoreError(error, 'Logout failed');
          throw error;
        }
      },

      setLoading: (loading: boolean) => {
        useCoreAuthStore.getState().setLoading(loading);
      },

      resetMagicLinkSent: () => {
        useMagicLinkStore.getState().reset();
      },

      canSendMagicLink: () => {
        // FIXED: Use updated interface that doesn't take email parameter
        return useMagicLinkStore.getState().canSendMagicLink();
      },

      setSessionFromTokens: async (accessToken: string, refreshToken: string) => {
        try {
          await useCoreAuthStore.getState().setSessionFromTokens(accessToken, refreshToken);
        } catch (error) {
          handleStoreError(error, 'Failed to set session from tokens');
          throw error;
        }
      },
    };
  })
);

export const useAuthStore = useAuthStoreImpl;

// Re-export shouldEnableQueries for backward compatibility
export const shouldEnableQueries = newShouldEnableQueries;

// Export default for backward compatibility
export default useAuthStore;
