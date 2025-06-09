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

// Define the state interface for authentication
export interface AuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean; // For initial auth check and login/signup processes
  error: string | null;
  magicLinkSent: boolean; // Track if magic link was sent
  lastMagicLinkRequest: number | null; // Timestamp of last request
  initializeAuth: () => Promise<void>; // New action to setup listener and check session
  loginWithMagicLink: (credentials: MagicLinkCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>; // New action for Google login
  confirmMagicLink: (tokenHash: string, type?: string) => Promise<void>;
  logout: () => Promise<void>; // Updated logout action
  setLoading: (loading: boolean) => void;
  setError: (errorMessage: string | null) => void;
  clearError: () => void;
  resetMagicLinkSent: () => void;
  canSendMagicLink: () => boolean; // Check if rate limit allows sending
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
}

let authListenerSubscription: { unsubscribe: () => void } | null = null;

// Helper function to handle errors consistently
const handleStoreError = (error: unknown): string => {
  return safeErrorDisplay(error);
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
    set({ isLoading: true, error: null });
    try {
      const session = await authService.getCurrentSession();
      if (session && session.user) {
        set({ isAuthenticated: true, user: session.user, isLoading: false });
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }

      // Unsubscribe from any existing listener before creating a new one
      authListenerSubscription?.unsubscribe();

      // Subscribe to auth state changes
      authListenerSubscription = authService.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          set({
            isAuthenticated: true,
            user: session.user,
            isLoading: false,
            error: null,
            magicLinkSent: false,
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: null,
            magicLinkSent: false,
          });
        } else if (event === 'USER_UPDATED' && session?.user) {
          set({ user: session.user });
        } else if (event === 'INITIAL_SESSION' && !session) {
          // No active session on startup
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      });
    } catch (error) {
      logger.error('Error in initializeAuth:', error as Error);
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: handleStoreError(error),
      });
    }
  },

  canSendMagicLink: () => {
    const state = get();
    if (!state.lastMagicLinkRequest) {
      return true;
    }
    
    const timeSinceLastRequest = Date.now() - state.lastMagicLinkRequest;
    return timeSinceLastRequest >= MAGIC_LINK_COOLDOWN_MS;
  },

  loginWithMagicLink: async (credentials) => {
    const state = get();
    
    // Check client-side rate limiting
    if (!state.canSendMagicLink()) {
      const remainingTime = Math.ceil((MAGIC_LINK_COOLDOWN_MS - (Date.now() - (state.lastMagicLinkRequest || 0))) / 1000);
      set({
        error: `Lütfen ${remainingTime} saniye bekleyin ve tekrar deneyin.`,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true, error: null, magicLinkSent: false });
    
    try {
      const { error } = await authService.signInWithMagicLink(credentials);
      
      if (error) {
        set({
          isLoading: false,
          error: handleStoreError(error),
          magicLinkSent: false,
        });
      } else {
        set({
          isLoading: false,
          error: null,
          magicLinkSent: true,
          lastMagicLinkRequest: Date.now(),
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: handleStoreError(error),
        magicLinkSent: false,
      });
    }
  },

  confirmMagicLink: async (tokenHash, type = 'magiclink') => {
    set({ isLoading: true, error: null });
    try {
      const { user, session, error } = await authService.confirmMagicLink(tokenHash, type);
      if (error) {
        set({
          isLoading: false,
          error: handleStoreError(error),
          magicLinkSent: false, // Reset so user can request new link
        });
      } else if (user && session) {
        // Auth state change listener will handle the state update
        logger.debug('Magic link confirmed successfully');
      } else {
        set({
          isLoading: false,
          error: 'Geçersiz giriş bağlantısı. Lütfen yeni bir bağlantı talep edin.',
          magicLinkSent: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: handleStoreError(error),
        magicLinkSent: false,
      });
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await authService.signInWithGoogle();
      
      if (error) {
        if ((error as AuthError).name === 'AuthCancelledError') {
          // Don't treat cancellation as an error - it's a normal user action
          set({
            isLoading: false,
            error: null, // Clear error since cancellation is not an error
          });
          logger.debug('Google OAuth cancelled by user');
        } else {
          // Handle actual errors (not cancellations)
          const translatedError = handleStoreError(error);
          set({
            isLoading: false,
            error: translatedError,
          });
        }
      } else {
        // Success case - auth state change listener will handle the state update
        logger.debug('Google login initiated. Waiting for OAuth callback.');
        set({ isLoading: false });
      }
    } catch (error) {
      // Handle any unexpected errors during the OAuth process
      const translatedError = handleStoreError(error);
      set({
        isLoading: false,
        error: translatedError || 'Giriş işleminde beklenmeyen bir hata oluştu.',
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    const { error } = await authService.signOut();
    if (error) {
      logger.error('Logout error:', error);
      set({ isLoading: false, error: handleStoreError(error) });
    } else {
      // Clear all cached data
      queryClient.clear();
      logger.debug('Logout successful');
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (errorMessage) => {
    set({ error: errorMessage, isLoading: false });
  },

  clearError: () => {
    set({ error: null });
  },

  resetMagicLinkSent: () => set({ magicLinkSent: false }),

  // --- Handle OAuth-style Magic Link Tokens ---
  setSessionFromTokens: async (accessToken: string, refreshToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user, session, error } = await authService.setSessionFromTokens(accessToken, refreshToken);
      if (error) {
        set({
          isLoading: false,
          error: handleStoreError(error),
          magicLinkSent: false, // Reset magic link state so user can request new one
        });
      } else if (user && session) {
        // Auth state change listener will handle the state update
        logger.debug('OAuth token authentication successful');
      } else {
        set({
          isLoading: false,
          error: 'Geçersiz giriş bilgileri. Lütfen yeni bir bağlantı talep edin.',
          magicLinkSent: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: handleStoreError(error),
        magicLinkSent: false,
      });
    }
  },
}));

export default useAuthStore;
