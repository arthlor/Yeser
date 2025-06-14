// src/services/authService.ts
import { AuthError, Session, User } from '@supabase/supabase-js';

import { supabaseService } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorTranslation';

// Define a type for our custom, simplified error shape
type SimpleAuthError = {
  name: string;
  message: string;
};

// Magic link credentials interface
export interface MagicLinkCredentials {
  email: string;
  options?: {
    emailRedirectTo?: string;
    shouldCreateUser?: boolean;
    data?: Record<string, unknown>;
  };
}

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

// Helper function to ensure Supabase client is initialized
const ensureSupabaseClient = async () => {
  try {
    await supabaseService.initializeLazy();
    return supabaseService.getClient();
  } catch (error) {
    logger.error('[COLD START] Failed to initialize Supabase client:', error as Error);
    throw new Error('Database connection failed. Please try again.');
  }
};

// --- Magic Link Authentication ---
export const signInWithMagicLink = async (credentials: MagicLinkCredentials) => {
  try {
    const supabase = await ensureSupabaseClient();

    // Final defensive email sanitization in case any invisible chars slipped through
    const emailForSupabase = credentials.email
      .trim()
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, '');

    // **PRODUCTION-READY URL SCHEME**: Use correct URL scheme matching app.config.js
    const getRedirectUrl = () => {
      const env = process.env.EXPO_PUBLIC_ENV || 'development';
      if (env === 'development') {
        return 'yeser-dev://auth/callback';
      } else if (env === 'preview') {
        return 'yeser-preview://auth/callback';
      } else {
        return 'yeser://auth/callback'; // Production URL scheme
      }
    };

    const { data, error } = await supabase.auth.signInWithOtp({
      email: emailForSupabase,
      options: {
        emailRedirectTo: credentials.options?.emailRedirectTo || getRedirectUrl(),
        shouldCreateUser: credentials.options?.shouldCreateUser ?? true,
        data: credentials.options?.data,
      },
    });

    if (error) {
      return { data: null, error: handleAuthError(error, 'signInWithMagicLink') };
    }
    return { data, error: null };
  } catch (err) {
    const error = err as AuthError;
    return { data: null, error: handleAuthError(error, 'signInWithMagicLink') };
  }
};

// --- Handle Magic Link Confirmation ---
export const confirmMagicLink = async (tokenHash: string, type: string = 'magiclink') => {
  try {
    const supabase = await ensureSupabaseClient();

    logger.debug('Magic link confirmation attempt', { type });

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'magiclink' | 'recovery' | 'invite' | 'email_change',
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: handleAuthError(error, 'Magic link confirmation'),
      };
    }

    logger.debug('Magic link confirmation successful', {
      hasUser: !!data?.user,
      hasSession: !!data?.session,
    });

    return { user: data?.user, session: data?.session, error: null };
  } catch (err) {
    const error = err as AuthError;
    return { user: null, session: null, error: handleAuthError(error, 'Magic link confirmation') };
  }
};

// --- Handle OAuth-style Magic Link Tokens ---
export const setSessionFromTokens = async (accessToken: string, refreshToken: string) => {
  try {
    const supabase = await ensureSupabaseClient();

    logger.debug('OAuth token session setup attempt', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
    });

    // 🚨 PERFORMANCE FIX: Remove unnecessary network connectivity tests
    // These tests were adding 2-4+ seconds of delay to magic link auth
    // The Supabase session setup will fail naturally if there are network issues

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      // 🚨 FIX: Enhanced error logging with proper typing instead of any
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

    // 🚨 DEBUG: Catch-all error logging
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
    const supabase = await ensureSupabaseClient();

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
    const supabase = await ensureSupabaseClient();

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

// --- Google OAuth ---
export const signInWithGoogle = async (): Promise<{
  user: User | null;
  session: Session | null;
  error: (AuthError | SimpleAuthError) | null;
}> => {
  try {
    const supabase = await ensureSupabaseClient();

    // **PRODUCTION-READY URL SCHEME**: Use correct URL scheme matching app.config.js
    const getRedirectUrl = () => {
      const env = process.env.EXPO_PUBLIC_ENV || 'development';
      if (env === 'development') {
        return 'yeser-dev://auth/callback';
      } else if (env === 'preview') {
        return 'yeser-preview://auth/callback';
      } else {
        return 'yeser://auth/callback'; // Production URL scheme
      }
    };

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
        // No need for additional scopes - basic profile info is sufficient
      },
    });

    if (error) {
      return { user: null, session: null, error: handleAuthError(error, 'Google OAuth') };
    }

    // For OAuth, we initiate the process but actual session is handled by callback
    return { user: null, session: null, error: null };
  } catch (err) {
    const error = err as AuthError;
    return { user: null, session: null, error: handleAuthError(error, 'Google OAuth') };
  }
};

// Password-based authentication functions removed - using magic link authentication only

// Potentially add other functions like:
// - updateUserAttributes
