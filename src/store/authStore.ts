// src/store/authStore.ts
import { User as SupabaseUser } from '@supabase/supabase-js';

import { create } from 'zustand';

import * as authService from '../services/authService'; // Import all from authService
import { logger } from '@/utils/debugConfig';

import type { EmailPasswordCredentials } from '../services/authService';

// Define the state interface for authentication
export interface AuthState {
  isAuthenticated: boolean;
  user: SupabaseUser | null;
  isLoading: boolean; // For initial auth check and login/signup processes
  error: string | null;
  initializeAuth: () => Promise<void>; // New action to setup listener and check session
  loginWithEmail: (credentials: EmailPasswordCredentials) => Promise<void>; // Updated login action
  loginWithGoogle: () => Promise<void>; // New action for Google login
  signUpWithEmail: (credentials: EmailPasswordCredentials) => Promise<void>; // New signup action
  logout: () => Promise<void>; // Updated logout action
  setLoading: (loading: boolean) => void;
  setError: (errorMessage: string | null) => void;
  clearError: () => void;
}

let authListenerSubscription: { unsubscribe: () => void } | null = null;

// Create the Zustand store
const useAuthStore = create<AuthState>((set, _get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true, // Start with loading true for initial auth check
  error: null,

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
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: null,
          });
        } else if (event === 'USER_UPDATED' && session?.user) {
          set({ user: session.user });
        } else if (event === 'PASSWORD_RECOVERY') {
          // Handle password recovery if needed
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh if needed
        } else if (event === 'INITIAL_SESSION' && !session) {
          // No active session on startup
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      });
    } catch (e: unknown) {
      logger.error('Error in initializeAuth:', e as Error);
      let errorMessage = 'Failed to initialize auth';
      if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
      ) {
        errorMessage = (e as { message: string }).message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  loginWithEmail: async (credentials) => {
    set({ isLoading: true, error: null });
    const { user, error } = await authService.signInWithEmail(credentials);
    if (user && !error) {
      // State will be updated by onAuthStateChange listener for SIGNED_IN
      // set({ isAuthenticated: true, user, isLoading: false, error: null });
    } else {
      set({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error?.message || 'Login failed',
      });
    }
  },

  signUpWithEmail: async (credentials) => {
    set({ isLoading: true, error: null });
    const { user, error } = await authService.signUpWithEmail(credentials);
    if (user && !error) {
      // State will be updated by onAuthStateChange listener for SIGNED_IN (if auto-confirm is on)
      // Or user needs to confirm email
      // set({ isLoading: false, error: null }); // User might not be authenticated yet
      logger.debug('Sign up successful, user needs to confirm email or is auto-confirmed.');
      set({ isLoading: false }); // Let onAuthStateChange handle user state
    } else {
      set({ isLoading: false, error: error?.message || 'Sign up failed' });
    }
  },

  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    const { error } = await authService.signInWithGoogle();
    if (error) {
      set({ isLoading: false, error: error.message || 'Google login failed' });
    } else {
      // On successful initiation of OAuth, Supabase handles the redirect.
      // The onAuthStateChange listener will handle the SIGNED_IN event when the user returns to the app.
      // isLoading will be set to false by the onAuthStateChange handler or if an error occurs.
      logger.debug('Google login initiated. Waiting for OAuth callback.');
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    const { error } = await authService.signOut();
    if (error) {
      set({ isLoading: false, error: error.message || 'Logout failed' });
    } else {
      // State will be updated by onAuthStateChange listener for SIGNED_OUT
      // set({ isAuthenticated: false, user: null, isLoading: false, error: null });
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
}));

export default useAuthStore;
