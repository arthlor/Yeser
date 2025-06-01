// src/services/authService.ts
import { AuthError, Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '../utils/supabaseClient';

// Custom interface for email/password credentials, as UserCredentials might not be exported or match needed structure
export interface EmailPasswordCredentials {
  email: string;
  password: string;
  options?: { data?: Record<string, unknown>; emailRedirectTo?: string }; // For additional signup options like 'data'
}

// --- Sign Up ---
export const signUpWithEmail = async (
  credentials: EmailPasswordCredentials
) => {
  // For Supabase, signUp typically takes an object with email, password, and optionally options (like data for user_metadata)
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: credentials.options,
  });
  const { user, session } = data || {};
  return { user, session, error };
};

// --- Sign In ---
export const signInWithEmail = async (
  credentials: EmailPasswordCredentials
) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  const { user, session } = data || {};
  return { user, session, error };
};

// --- Sign Out ---
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// --- Get Current User ---
export const getCurrentUser = async (): Promise<{
  user: User | null;
  error: AuthError | null;
}> => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  // console.error for errors is good for debugging, but the service should just return the error.
  // The caller (e.g., UI or store) can decide how to handle/log it.
  return { user, error };
};

// --- Get Current Session ---
export const getCurrentSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error.message);
    return null;
  }
  return data.session;
};

// --- On Auth State Change ---
// This function allows you to subscribe to auth changes (SIGNED_IN, SIGNED_OUT, USER_UPDATED, etc.)
// The callback will receive an event string and a session object (or null)
export const onAuthStateChange = (
  callback: (event: string, session: Session | null) => void
) => {
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
        redirectTo: process.env.EXPO_PUBLIC_REDIRECT_URI, // Ensure this is configured in your .env
        skipBrowserRedirect: true, // Important for Expo to handle the redirect manually
      },
    });

    if (oauthError) {
      console.error('Google Sign-In OAuth Error:', oauthError.message);
      return { user: null, session: null, error: oauthError };
    }

    if (data?.url) {
      const response = await WebBrowser.openAuthSessionAsync(
        data.url,
        process.env.EXPO_PUBLIC_REDIRECT_URI
      );

      if (response.type === 'success' && response.url) {
        const hashFragment = response.url.split('#')[1];
        if (!hashFragment) {
          console.error('Google Sign-In: No hash fragment in redirect URL');
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
          const { data: sessionData, error: setSessionError } =
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

          if (setSessionError) {
            console.error(
              'Error setting session after Google Sign-In:',
              setSessionError.message
            );
            return { user: null, session: null, error: setSessionError };
          }
          // After setSession, onAuthStateChange should fire with SIGNED_IN.
          // The sessionData from setSession contains the user and session.
          console.log('Session successfully set after Google Sign-In.');
          return {
            user: sessionData?.user ?? null,
            session: sessionData?.session ?? null,
            error: null,
          };
        } else {
          console.error(
            'Google Sign-In: access_token or refresh_token missing in redirect URL fragment'
          );
          return {
            user: null,
            session: null,
            error: {
              name: 'AuthMissingTokenError',
              message: 'Access token or refresh token missing in redirect.',
            } as AuthError,
          };
        }
      } else if (response.type === 'cancel' || response.type === 'dismiss') {
        console.log('Google Sign-In cancelled by user.');
        return {
          user: null,
          session: null,
          error: {
            name: 'AuthCancelledError',
            message: 'Google Sign-In cancelled by user.',
          } as AuthError,
        };
      } else {
        // Handles response.type === 'error' or other unexpected types
        console.error('Google Sign-In WebBrowser Error:', response);
        let errorMessage =
          'An unexpected error occurred during Google Sign-In with WebBrowser.';
        if (response.type === 'error') {
          // response is WebBrowserAuthSessionErrorResult (Android launch error) OR WebBrowserAuthSessionCompleteResult (error in URL)
          if ('message' in response && typeof response.message === 'string') {
            // This is for WebBrowserAuthSessionErrorResult (Android launch error)
            errorMessage = response.message;
          } else if ('url' in response && typeof response.url === 'string') {
            // This is for WebBrowserAuthSessionCompleteResult with type 'error' (error in URL params)
            const details = [];
            // Check if errorCode and errorMessage exist and are part of the response object
            const respWithPossibleErrorDetails = response as {
              errorCode?: string | null;
              errorMessage?: string | null;
            };
            if (respWithPossibleErrorDetails.errorCode)
              details.push(`Code: ${respWithPossibleErrorDetails.errorCode}`);
            if (respWithPossibleErrorDetails.errorMessage)
              details.push(
                `Message: ${respWithPossibleErrorDetails.errorMessage}`
              );
            if (details.length > 0) {
              errorMessage = `OAuth error: ${details.join(', ')}. URL: ${response.url}`;
            } else {
              errorMessage = `OAuth error in redirect URL: ${response.url}`;
            }
          }
        }
        return {
          user: null,
          session: null,
          error: {
            name: 'AuthBrowserError',
            message: errorMessage,
          } as AuthError,
        };
      }
    }
    // Fallback if no URL and no initial error from signInWithOAuth
    return {
      user: null,
      session: null,
      error: {
        name: 'AuthUnknownError',
        message: 'Unknown error: No URL provided for Google Sign-In.',
      } as AuthError,
    };
  } catch (err: unknown) {
    let errorMessage = 'An unexpected error occurred.';
    if (
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      typeof (err as { message: unknown }).message === 'string'
    ) {
      errorMessage = (err as { message: string }).message;
    } else if (typeof err === 'string') {
      errorMessage = err;
    }
    console.error('Unexpected error in signInWithGoogle:', errorMessage);
    return {
      user: null,
      session: null,
      error: {
        name: 'AuthCatchError',
        message: errorMessage,
      } as AuthError,
    };
  }
};

// Potentially add other functions like:
// - passwordReset
// - updateUserAttributes
