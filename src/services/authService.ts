// src/services/authService.ts
import { AuthError, Session, User } from '@supabase/supabase-js';

import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorTranslation';
import { robustFetch } from '@/utils/robustFetch';

// Define a type for our custom, simplified error shape
type SimpleAuthError = {
  name: string;
  message: string;
};

// Type guard to check if an object is a Supabase AuthError
const isAuthError = (error: unknown): error is AuthError => {
  return typeof error === 'object' && error !== null && '__isAuthError' in error;
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

// --- Magic Link Authentication ---
export const signInWithMagicLink = async (credentials: MagicLinkCredentials) => {
  try {
    // Final defensive email sanitization in case any invisible chars slipped through
    const emailForSupabase = credentials.email.trim().toLowerCase().replace(/[\u200B-\u200D\uFEFF]/g, '');

    const { data, error } = await supabase.auth.signInWithOtp({
      email: emailForSupabase,
      options: {
        emailRedirectTo: credentials.options?.emailRedirectTo || 'yeserapp://auth/confirm',
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
    logger.debug('OAuth token session setup attempt', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0,
    });

    // 🚨 FIX: Use robust fetch for enhanced network reliability
    try {
      const testResponse = await robustFetch('https://httpbin.org/get', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        retries: 2,
      });
      logger.debug('Network connectivity test:', {
        status: testResponse.status,
        canReachInternet: testResponse.ok,
      });
    } catch (networkError) {
      logger.error('Basic network connectivity failed:', {
        error: networkError instanceof Error ? networkError.message : String(networkError),
        type: 'NETWORK_CONNECTIVITY_ISSUE',
      });
    }

    // 🚨 FIX: Use robust fetch for Supabase API connectivity test
    try {
      const supabaseHealthCheck = await robustFetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`,
        {
          method: 'GET',
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json',
          },
          timeout: 10000,
          retries: 2,
        }
      );
      logger.debug('Supabase API connectivity test:', {
        status: supabaseHealthCheck.status,
        canReachSupabase: supabaseHealthCheck.status < 500,
      });
    } catch (supabaseError) {
      logger.error('Supabase API connectivity failed:', {
        error: supabaseError instanceof Error ? supabaseError.message : String(supabaseError),
        type: 'SUPABASE_CONNECTIVITY_ISSUE',
      });
    }

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
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // Log the error but return null as per original logic
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

// --- On Auth State Change ---
// This function allows you to subscribe to auth changes (SIGNED_IN, SIGNED_OUT, USER_UPDATED, etc.)
// The callback will receive an event string and a session object (or null)
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  const { data: authListener } = supabase.auth.onAuthStateChange(callback);
  return authListener?.subscription;
  // To unsubscribe: subscription.unsubscribe()
};

// --- Sign In with Google (OAuth) ---
export const signInWithGoogle = async (): Promise<{
  user: User | null;
  session: Session | null;
  error: (AuthError | SimpleAuthError) | null;
}> => {
  try {
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'yeserapp://auth/oauth-callback',
        skipBrowserRedirect: true,
      },
    });

    if (oauthError) {
      return {
        user: null,
        session: null,
        error: handleAuthError(oauthError, 'signInWithGoogle (OAuth setup)'),
      };
    }

    if (data?.url) {
      const response = await WebBrowser.openAuthSessionAsync(
        data.url,
        'yeserapp://auth/oauth-callback'
      );

      if (response.type === 'success' && response.url) {
        const hashFragment = response.url.split('#')[1];
        if (!hashFragment) {
          const error: SimpleAuthError = {
            name: 'AuthInvalidRedirectError',
            message: 'Google Sign-In: No hash fragment in redirect URL',
          };
          return {
            user: null,
            session: null,
            error: handleAuthError(error, 'signInWithGoogle (URL parsing)'),
          };
        }

        const params = new URLSearchParams(hashFragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            return {
              user: null,
              session: null,
              error: handleAuthError(sessionError, 'signInWithGoogle (setSession)'),
            };
          }

          // At this point, the onAuthStateChange listener will fire with SIGNED_IN
          // and the user/session will be updated globally.
          return { user: null, session: null, error: null }; // Success
        } else {
          const error: SimpleAuthError = {
            name: 'AuthTokensMissingError',
            message: 'Google Sign-In: Tokens not found in redirect URL',
          };
          return {
            user: null,
            session: null,
            error: handleAuthError(error, 'signInWithGoogle (token parsing)'),
          };
        }
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        // User cancelled the OAuth flow
        // Return a standard error object that authStore can identify
        return {
          user: null,
          session: null,
          error: { name: 'AuthCancelledError', message: 'User cancelled Google Sign-In' },
        };
      }
    }
    // Fallback if no URL is returned
    const error: SimpleAuthError = {
      name: 'AuthURLMissingError',
      message: 'Google Sign-In: No URL returned from Supabase',
    };
    return {
      user: null,
      session: null,
      error: handleAuthError(error, 'signInWithGoogle (no URL)'),
    };
  } catch (err) {
    if (isAuthError(err)) {
      return {
        user: null,
        session: null,
        error: handleAuthError(err, 'signInWithGoogle (catch-all)'),
      };
    }
    const error: SimpleAuthError = {
      name: 'UnknownAuthError',
      message:
        err instanceof Error ? err.message : 'An unknown error occurred during Google Sign-In',
    };
    return {
      user: null,
      session: null,
      error: handleAuthError(error, 'signInWithGoogle (catch-all)'),
    };
  }
};

// Password-based authentication functions removed - using magic link authentication only

// Potentially add other functions like:
// - updateUserAttributes
