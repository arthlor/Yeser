// src/services/authService.ts
import { AuthError, Session } from '@supabase/supabase-js';

import { supabaseService } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import { getSupabaseClient } from './session';

// Define a type for our custom, simplified error shape
type SimpleAuthError = {
  name: string;
  message: string;
};

// Helper function to handle auth errors consistently
const handleAuthError = (error: AuthError | SimpleAuthError, operation: string) => {
  // Log technical details for debugging (never shown to users)
  logger.error(`${operation} error:`, {
    message: error.message,
    name: error.name,
    operation,
  });

  // Always return a user-friendly message, regardless of error shape
  return {
    name: error.name,
    message: safeErrorDisplay(error),
  };
};

// --- Handle OAuth Token Session ---
export const setSessionFromTokens = async (accessToken: string, refreshToken: string) => {
  try {
    const supabase = await getSupabaseClient();

    logger.debug('OAuth token session setup attempt', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
    });

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      const errorDetails = error as Error & {
        name?: string;
        status?: number | string;
        cause?: unknown;
        stack?: string;
      };

      logger.error('OAuth setSession error details:', {
        message: error.message,
        name: errorDetails.name,
        status: errorDetails.status,
        cause: errorDetails.cause,
        stack: errorDetails.stack,
        isNetworkError: error.message.includes('Network') || error.message.includes('fetch'),
        errorType: 'SUPABASE_SET_SESSION_ERROR',
      });

      return {
        user: null,
        session: null,
        error: handleAuthError(error, 'OAuth token session setup'),
      };
    }

    logger.debug('OAuth token session setup successful', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
      userId: data?.user?.id,
      sessionExpiry: data?.session?.expires_at,
    });

    return { user: data?.user, session: data?.session, error: null };
  } catch (err) {
    const error = err as AuthError;

    logger.error('OAuth token session setup catch-all error:', {
      message: error.message,
      name: error.name,
      type: typeof error,
      isErrorObject: error instanceof Error,
      errorType: 'OAUTH_TOKEN_SETUP_EXCEPTION',
    });

    return {
      user: null,
      session: null,
      error: handleAuthError(error, 'OAuth token session setup'),
    };
  }
};

// --- Sign Out ---
export const signOut = async () => {
  try {
    const supabase = await getSupabaseClient();

    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: handleAuthError(error, 'signOut') };
    }
    return { error: null };
  } catch (err) {
    const error = err as AuthError;
    return { error: handleAuthError(error, 'signOut') };
  }
};

// --- Get Current Session ---
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      handleAuthError(error, 'getCurrentSession');
      return null;
    }
    return data.session;
  } catch (err) {
    const error = err as AuthError;
    handleAuthError(error, 'getCurrentSession');
    return null;
  }
};

// --- Auth State Change Listener ---
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  // Only setup listener if client is already initialized
  if (!supabaseService.isInitialized()) {
    logger.warn('Auth state change listener requested but Supabase client not initialized');
    return { unsubscribe: () => {} };
  }

  const client = supabaseService.getClient();
  return client.auth.onAuthStateChange(callback);
};

// --- Google OAuth Authentication ---
export const signInWithGoogleIdToken = async (idToken: string) => {
  try {
    const supabase = await getSupabaseClient();

    logger.debug('Google OAuth: Exchanging ID token with Supabase');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: handleAuthError(error, 'Google OAuth ID token exchange'),
      };
    }

    logger.debug('Google OAuth: Token exchange successful', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
    });

    return { user: data?.user, session: data?.session, error: null };
  } catch (err) {
    const error = err as AuthError;
    return {
      user: null,
      session: null,
      error: handleAuthError(error, 'Google OAuth ID token exchange'),
    };
  }
};
