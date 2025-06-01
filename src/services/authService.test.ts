// src/services/authService.test.ts
import { AuthError, Session, User } from '@supabase/supabase-js';

import { supabase } from '../utils/supabaseClient';
import {
  EmailPasswordCredentials,
  getCurrentSession,
  getCurrentUser,
  onAuthStateChange,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from './authService';

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithOAuth: jest.fn(), // Added for Google Sign-In
      // We will add other methods here as we test them
    },
  },
}));

// Typed mocks
const mockSupabaseSignUp = supabase.auth.signUp as jest.Mock;
const mockSupabaseSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockSupabaseSignOut = supabase.auth.signOut as jest.Mock;
const mockSupabaseGetUser = supabase.auth.getUser as jest.Mock;
const mockSupabaseGetSession = supabase.auth.getSession as jest.Mock;
const mockSupabaseOnAuthStateChange = supabase.auth
  .onAuthStateChange as jest.Mock;
const mockSupabaseSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;

describe('authService - signUpWithEmail', () => {
  const mockCredentials: EmailPasswordCredentials = {
    email: 'test@example.com',
    password: 'password123',
    options: { data: { full_name: 'Test User' } },
  };

  beforeEach(() => {
    // Clear mock history before each test
    mockSupabaseSignUp.mockClear();
  });

  it('should return user and session on successful sign up', async () => {
    const mockUser = { id: 'user-id', email: mockCredentials.email } as User;
    const mockSession = { access_token: 'token', user: mockUser } as Session;

    mockSupabaseSignUp.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await signUpWithEmail(mockCredentials);

    expect(mockSupabaseSignUp).toHaveBeenCalledWith({
      email: mockCredentials.email,
      password: mockCredentials.password,
      options: mockCredentials.options,
    });
    expect(result.user).toEqual(mockUser);
    expect(result.session).toEqual(mockSession);
    expect(result.error).toBeNull();
  });

  it('should return an error if sign up fails', async () => {
    const mockError = {
      message: 'Sign up failed',
      name: 'AuthError',
      status: 400,
    } as AuthError;

    mockSupabaseSignUp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: mockError,
    });

    const result = await signUpWithEmail(mockCredentials);

    expect(mockSupabaseSignUp).toHaveBeenCalledWith({
      email: mockCredentials.email,
      password: mockCredentials.password,
      options: mockCredentials.options,
    });
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toEqual(mockError);
  });

  it('should return null user and session if sign up returns no data and no error', async () => {
    // This tests an unlikely but possible scenario where the API returns no error but also no data.
    mockSupabaseSignUp.mockResolvedValueOnce({
      data: { user: null, session: null }, // Or simply data: null
      error: null,
    });

    const result = await signUpWithEmail(mockCredentials);

    expect(mockSupabaseSignUp).toHaveBeenCalledWith({
      email: mockCredentials.email,
      password: mockCredentials.password,
      options: mockCredentials.options,
    });
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toBeNull(); // Or handle as an implicit error if this state is unexpected
  });

  it('should handle options correctly when passed', async () => {
    const mockUser = { id: 'user-id', email: mockCredentials.email } as User;
    const mockSession = { access_token: 'token', user: mockUser } as Session;

    mockSupabaseSignUp.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    await signUpWithEmail(mockCredentials); // options are included in mockCredentials

    expect(mockSupabaseSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { data: { full_name: 'Test User' } },
      })
    );
  });

  it('should handle calls without options', async () => {
    const credentialsWithoutOptions: EmailPasswordCredentials = {
      email: 'testnooptions@example.com',
      password: 'password123',
    };
    const mockUser = {
      id: 'user-id-no-options',
      email: credentialsWithoutOptions.email,
    } as User;
    const mockSession = { access_token: 'token', user: mockUser } as Session;

    mockSupabaseSignUp.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    await signUpWithEmail(credentialsWithoutOptions);

    expect(mockSupabaseSignUp).toHaveBeenCalledWith({
      email: credentialsWithoutOptions.email,
      password: credentialsWithoutOptions.password,
      options: undefined, // Ensure options is undefined if not provided
    });
  });
});

describe('authService - signInWithEmail', () => {
  const mockCredentials: EmailPasswordCredentials = {
    email: 'test@example.com',
    password: 'password123',
  };

  const mockSupabaseSignIn = supabase.auth.signInWithPassword as jest.Mock;

  beforeEach(() => {
    mockSupabaseSignIn.mockClear();
  });

  it('should return user and session on successful sign in', async () => {
    const mockUser = { id: 'user-id', email: mockCredentials.email } as User;
    const mockSession = { access_token: 'token', user: mockUser } as Session;

    mockSupabaseSignIn.mockResolvedValueOnce({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const result = await signInWithEmail(mockCredentials);

    expect(mockSupabaseSignIn).toHaveBeenCalledWith({
      email: mockCredentials.email,
      password: mockCredentials.password,
    });
    expect(result.user).toEqual(mockUser);
    expect(result.session).toEqual(mockSession);
    expect(result.error).toBeNull();
  });

  it('should return an error if sign in fails', async () => {
    const mockError = {
      message: 'Invalid credentials',
      name: 'AuthApiError',
      status: 400,
    } as AuthError;

    mockSupabaseSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: mockError,
    });

    const result = await signInWithEmail(mockCredentials);

    expect(mockSupabaseSignIn).toHaveBeenCalledWith({
      email: mockCredentials.email,
      password: mockCredentials.password,
    });
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toEqual(mockError);
  });

  it('should return null user and session if sign in returns no data and no error', async () => {
    mockSupabaseSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: null,
    });

    const result = await signInWithEmail(mockCredentials);

    expect(mockSupabaseSignIn).toHaveBeenCalledWith({
      email: mockCredentials.email,
      password: mockCredentials.password,
    });
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe('authService - signOut', () => {
  beforeEach(() => {
    mockSupabaseSignOut.mockClear();
  });

  it('should return no error on successful sign out', async () => {
    mockSupabaseSignOut.mockResolvedValueOnce({ error: null });

    const result = await signOut();

    expect(mockSupabaseSignOut).toHaveBeenCalledTimes(1);
    expect(result.error).toBeNull();
  });

  it('should return an error if sign out fails', async () => {
    const mockError = {
      message: 'Sign out failed',
      name: 'AuthApiError',
      status: 500,
    } as AuthError;
    mockSupabaseSignOut.mockResolvedValueOnce({ error: mockError });

    const result = await signOut();

    expect(mockSupabaseSignOut).toHaveBeenCalledTimes(1);
    expect(result.error).toEqual(mockError);
  });
});

describe('authService - getCurrentUser', () => {
  beforeEach(() => {
    mockSupabaseGetUser.mockClear();
  });

  it('should return a user object if a user is authenticated', async () => {
    const mockUser = { id: 'user-id', email: 'test@example.com' } as User;
    mockSupabaseGetUser.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const result = await getCurrentUser();

    expect(mockSupabaseGetUser).toHaveBeenCalledTimes(1);
    expect(result.user).toEqual(mockUser);
    expect(result.error).toBeNull();
  });

  it('should return null if no user is authenticated', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const result = await getCurrentUser();

    expect(mockSupabaseGetUser).toHaveBeenCalledTimes(1);
    expect(result.user).toBeNull();
    expect(result.error).toBeNull();
  });

  it('should return an error if fetching the user fails', async () => {
    const mockError = {
      message: 'Failed to fetch user',
      name: 'AuthApiError',
      status: 500,
    } as AuthError;
    mockSupabaseGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: mockError,
    });

    const result = await getCurrentUser();

    expect(mockSupabaseGetUser).toHaveBeenCalledTimes(1);
    expect(result.user).toBeNull();
    expect(result.error).toEqual(mockError);
  });
});

describe('authService - getCurrentSession', () => {
  beforeEach(() => {
    mockSupabaseGetSession.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error for cleaner test output
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('should return a session object if a session is active', async () => {
    const mockUser = { id: 'user-id', email: 'test@example.com' } as User;
    const mockSession = {
      access_token: 'active-token',
      user: mockUser,
      expires_in: 3600,
      token_type: 'bearer',
    } as Session;
    mockSupabaseGetSession.mockResolvedValueOnce({
      data: { session: mockSession },
      error: null,
    });

    const result = await getCurrentSession();

    expect(mockSupabaseGetSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockSession);
  });

  it('should return null if no session is active', async () => {
    mockSupabaseGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const result = await getCurrentSession();

    expect(mockSupabaseGetSession).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  it('should return null if fetching the session fails', async () => {
    const mockError = {
      message: 'Failed to fetch session',
      name: 'AuthApiError',
      status: 500,
    } as AuthError;
    mockSupabaseGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: mockError,
    });

    const result = await getCurrentSession();

    expect(mockSupabaseGetSession).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      'Error getting session:',
      mockError.message
    );
  });
});

describe('authService - onAuthStateChange', () => {
  let mockUserCallback: (event: string, session: Session | null) => void;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    mockSupabaseOnAuthStateChange.mockClear(); // Reset call count before each test
    mockSupabaseOnAuthStateChange.mockImplementation(callback => {
      // Capture the callback provided by the SUT (System Under Test)
      mockUserCallback = callback;
      // Return the structure expected by the SUT
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    // Ensure mockUserCallback is a Jest mock function if we want to check its calls directly
    // For this setup, we are capturing the SUT's callback into mockUserCallback and then calling it.
    // If testCallback is the one we want to check, that's fine.
    mockUnsubscribe.mockClear();
  });

  it('should register the callback and trigger it on SIGNED_IN event', () => {
    const testCallback = jest.fn();
    onAuthStateChange(testCallback);

    expect(mockSupabaseOnAuthStateChange).toHaveBeenCalledTimes(1);

    // Simulate Supabase triggering the callback for a SIGNED_IN event
    const mockUser = { id: 'user-id', email: 'test@example.com' } as User;
    const mockSession = {
      access_token: 'active-token',
      user: mockUser,
    } as Session;
    // Manually invoke the captured callback
    if (mockUserCallback) mockUserCallback('SIGNED_IN', mockSession);

    expect(testCallback).toHaveBeenCalledWith('SIGNED_IN', mockSession);
  });

  it('should register the callback and trigger it on SIGNED_OUT event', () => {
    const testCallback = jest.fn();
    onAuthStateChange(testCallback);

    expect(mockSupabaseOnAuthStateChange).toHaveBeenCalledTimes(1);

    // Simulate Supabase triggering the callback for a SIGNED_OUT event
    if (mockUserCallback) mockUserCallback('SIGNED_OUT', null);

    expect(testCallback).toHaveBeenCalledWith('SIGNED_OUT', null);
  });

  it('should return a subscription object with an unsubscribe method', () => {
    const testCallback = jest.fn();
    const subscription = onAuthStateChange(testCallback);

    expect(subscription).toBeDefined();
    expect(subscription?.unsubscribe).toBeDefined();
    expect(typeof subscription?.unsubscribe).toBe('function');

    // Call unsubscribe
    subscription?.unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should handle null being returned for subscription data (edge case)', () => {
    // Simulate Supabase returning null for the subscription data part
    mockSupabaseOnAuthStateChange.mockReturnValueOnce({ data: null });
    const testCallback = jest.fn();
    const subscription = onAuthStateChange(testCallback);
  });

  it('should register the callback and trigger it on SIGNED_IN event', () => {
    const testCallback = jest.fn();
    onAuthStateChange(testCallback);

    expect(mockSupabaseOnAuthStateChange).toHaveBeenCalledTimes(1);

    // Simulate Supabase triggering the callback for a SIGNED_IN event
    const mockUser = { id: 'user-id', email: 'test@example.com' } as User;
    const mockSession = {
      access_token: 'active-token',
      user: mockUser,
    } as Session;
    // Manually invoke the captured callback
    if (mockUserCallback) mockUserCallback('SIGNED_IN', mockSession);

    expect(testCallback).toHaveBeenCalledWith('SIGNED_IN', mockSession);
  });

  it('should register the callback and trigger it on SIGNED_OUT event', () => {
    const testCallback = jest.fn();
    onAuthStateChange(testCallback);

    expect(mockSupabaseOnAuthStateChange).toHaveBeenCalledTimes(1);

    // Simulate Supabase triggering the callback for a SIGNED_OUT event
    if (mockUserCallback) mockUserCallback('SIGNED_OUT', null);

    expect(testCallback).toHaveBeenCalledWith('SIGNED_OUT', null);
  });

  it('should return a subscription object with an unsubscribe method', () => {
    const mockUnsubscribe = jest.fn();
    // Simulate Supabase returning a subscription object
    mockSupabaseOnAuthStateChange.mockReturnValueOnce({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const testCallback = jest.fn();
    const subscriptionData = onAuthStateChange(testCallback);
    // The actual subscription object is nested within the returned 'data' property from supabase.auth.onAuthStateChange
    // and our service function returns this 'data.subscription'
    const subscription = subscriptionData; // In our service, we return data.subscription directly

    expect(subscription).toBeDefined();
    if (subscription) {
      expect(subscription.unsubscribe).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
      // Call unsubscribe to ensure the mock is called if it's part of the returned object
      subscription.unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    } else {
      // This case should ideally not be hit if Supabase behaves as expected
      // and our mock is set up correctly for this test.
      throw new Error(
        'Subscription was not defined, check mock setup for onAuthStateChange.'
      );
    }
  });
});

describe('authService - signInWithGoogle', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSupabaseSignInWithOAuth.mockClear();
    // Suppress console.warn and console.error for cleaner test output, but allow checking calls
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should return FeatureDisabledError if supabase.auth.signInWithOAuth provides a URL (WebBrowser part is disabled)', async () => {
    const mockOAuthUrl =
      'https://supabase.io/auth/v1/authorize?provider=google';
    mockSupabaseSignInWithOAuth.mockResolvedValueOnce({
      data: { url: mockOAuthUrl, provider: 'google' },
      error: null,
    });

    const result = await signInWithGoogle();

    expect(mockSupabaseSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: process.env.EXPO_PUBLIC_REDIRECT_URI,
        skipBrowserRedirect: true,
      },
    });
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toEqual({
      name: 'FeatureDisabledError',
      message: 'Google Sign-In is currently disabled.',
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'signInWithGoogle is currently disabled as WebBrowser has been removed.'
    );
  });

  it('should return OAuth error if supabase.auth.signInWithOAuth returns an error', async () => {
    const mockOAuthError = {
      name: 'OAuthError',
      message: 'Failed to sign in with Google',
    } as AuthError;
    mockSupabaseSignInWithOAuth.mockResolvedValueOnce({
      data: null,
      error: mockOAuthError,
    });

    const result = await signInWithGoogle();

    expect(mockSupabaseSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toEqual(mockOAuthError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Google Sign-In OAuth Error:',
      mockOAuthError.message
    );
  });

  it('should return AuthUnknownError if no URL and no error is returned from supabase.auth.signInWithOAuth', async () => {
    mockSupabaseSignInWithOAuth.mockResolvedValueOnce({
      data: { url: null }, // or simply data: null
      error: null,
    });

    const result = await signInWithGoogle();

    expect(mockSupabaseSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toEqual({
      name: 'AuthUnknownError',
      message: 'Unknown error: No URL provided for Google Sign-In.',
    });
  });

  it('should return AuthCatchError if supabase.auth.signInWithOAuth throws an unexpected error', async () => {
    const unexpectedErrorMessage = 'Unexpected Supabase Error';
    mockSupabaseSignInWithOAuth.mockRejectedValueOnce(
      new Error(unexpectedErrorMessage)
    );

    const result = await signInWithGoogle();

    expect(mockSupabaseSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(result.error).toEqual({
      name: 'AuthCatchError',
      message: unexpectedErrorMessage,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unexpected error in signInWithGoogle:',
      unexpectedErrorMessage
    );
  });
});
