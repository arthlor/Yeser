// src/services/authService.ts
import { AuthError, Session, User } from '@supabase/supabase-js';

import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorTranslation';

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
const handleAuthError = (error: AuthError, operation: string) => {
  // Log technical details for debugging (never shown to users)
  logger.error(`${operation} error:`, {
    message: error.message,
    status: (error as { status?: number }).status,
    name: (error as { name?: string }).name,
    operation,
  });

  // Always return error with user-friendly message
  return {
    ...error,
    message: safeErrorDisplay(error),
  };
};

// --- Magic Link Authentication ---
export const signInWithMagicLink = async (credentials: MagicLinkCredentials) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: credentials.email,
    options: {
      emailRedirectTo: credentials.options?.emailRedirectTo || 'yeserapp://auth/confirm',
      shouldCreateUser: credentials.options?.shouldCreateUser ?? true,
      data: credentials.options?.data,
    },
  });
  return { data, error };
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

    // 🚨 DEBUG: Test basic network connectivity first
    try {
      const testResponse = await fetch('https://httpbin.org/get', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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

    // 🚨 DEBUG: Test Supabase API connectivity
    try {
      const supabaseHealthCheck = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
        },
      });
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
  const { error } = await supabase.auth.signOut();
  return { error };
};

// --- Get Current Session ---
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    logger.error('Error getting session:', error);
    return null;
  }
  return data.session;
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
  error: AuthError | null;
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
      logger.error('Google Sign-In OAuth Error:', oauthError);
      return { user: null, session: null, error: oauthError };
    }

    if (data?.url) {
      const response = await WebBrowser.openAuthSessionAsync(
        data.url,
        'yeserapp://auth/oauth-callback'
      );

      if (response.type === 'success' && response.url) {
        const hashFragment = response.url.split('#')[1];
        if (!hashFragment) {
          logger.error('Google Sign-In: No hash fragment in redirect URL');
          return {
            user: null,
            session: null,
            error: {
              name: 'AuthInvalidRedirectError',
              message: 'Invalid redirect URL: Missing hash fragment.',
            } as AuthError,
          };
        }

        const params = new URLSearchParams(hashFragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        // You might also want to get 'expires_in', 'token_type', etc., if needed for other purposes
        // const expires_in = params.get('expires_in');
        // const token_type = params.get('token_type');

        if (access_token && refresh_token) {
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (setSessionError) {
            logger.error('Google Sign-In setSession Error:', setSessionError);
            return { user: null, session: null, error: setSessionError };
          }
          // After setSession, onAuthStateChange should fire with SIGNED_IN.
          // The sessionData from setSession contains the user and session.
          logger.debug('Session successfully set after Google Sign-In.');
          return {
            user: sessionData?.user ?? null,
            session: sessionData?.session ?? null,
            error: null,
          };
        } else {
          logger.error('Google Sign-In: Missing tokens in redirect URL');
          return {
            user: null,
            session: null,
            error: {
              name: 'AuthTokenMissingError',
              message: 'OAuth tokens missing in redirect URL.',
            } as AuthError,
          };
        }
      } else if (response.type === 'cancel') {
        logger.debug('Google Sign-In: User cancelled OAuth flow');
        return {
          user: null,
          session: null,
          error: {
            name: 'AuthCancelledError',
            message: 'User cancelled OAuth flow.',
          } as AuthError,
        };
      } else {
        logger.error('Google Sign-In: OAuth session failed', { responseType: response.type });
        return {
          user: null,
          session: null,
          error: {
            name: 'AuthSessionFailedError',
            message: 'OAuth session failed to complete.',
          } as AuthError,
        };
      }
    } else {
      logger.error('Google Sign-In: No OAuth URL returned');
      return {
        user: null,
        session: null,
        error: {
          name: 'AuthURLMissingError',
          message: 'OAuth URL not returned by provider.',
        } as AuthError,
      };
    }
  } catch (err) {
    const error = err as AuthError;
    logger.error('Google Sign-In Exception:', error);
    return { user: null, session: null, error };
  }
};

// Password-based authentication functions removed - using magic link authentication only

// Potentially add other functions like:
// - updateUserAttributes
