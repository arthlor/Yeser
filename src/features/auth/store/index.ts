/**
 * Auth Store Index
 *
 * Provides a unified interface to all auth-related stores:
 * - Core Auth Store: Essential authentication state
 * - Magic Link Store: Magic link operations
 * - Session Store: Session persistence and management
 */

// Export individual stores
export { useCoreAuthStore, shouldEnableQueries } from './coreAuthStore';
export { useMagicLinkStore } from './magicLinkStore';
export { useGoogleOAuthStore } from './googleOAuthStore';
export { useAppleOAuthStore } from './appleOAuthStore';
export { useSessionStore, sessionUtils } from './sessionStore';

// Export types
export type { CoreAuthState } from './coreAuthStore';
export type { MagicLinkState } from './magicLinkStore';
export type { GoogleOAuthState } from './googleOAuthStore';
export type { AppleOAuthState } from './appleOAuthStore';
export type { SessionState } from './sessionStore';

// Re-export for backward compatibility
export { useCoreAuthStore as useAuthStore } from './coreAuthStore';

/**
 * PERFORMANCE OPTIMIZED: Selective auth hooks to prevent unnecessary re-renders
 * Use these instead of useAuthState when you only need specific pieces of state
 */

/**
 * Core authentication state only (most common use case)
 */
export const useCoreAuth = () => {
  const isAuthenticated = useCoreAuthStore((state) => state.isAuthenticated);
  const user = useCoreAuthStore((state) => state.user);
  const isLoading = useCoreAuthStore((state) => state.isLoading);

  return { isAuthenticated, user, isLoading };
};

/**
 * Magic link state only
 */
export const useMagicLinkState = () => {
  const isLoading = useMagicLinkStore((state) => state.isLoading);
  const error = useMagicLinkStore((state) => state.error);
  const lastSentEmail = useMagicLinkStore((state) => state.lastSentEmail);
  const lastSentAt = useMagicLinkStore((state) => state.lastSentAt);

  return { isLoading, error, lastSentEmail, lastSentAt };
};

/**
 * Google OAuth state only
 */
export const useGoogleAuthState = () => {
  const isLoading = useGoogleOAuthStore((state) => state.isLoading);
  const error = useGoogleOAuthStore((state) => state.error);
  const isInitialized = useGoogleOAuthStore((state) => state.isInitialized);
  const canAttemptSignIn = useGoogleOAuthStore((state) => state.canAttemptSignIn);

  return { isLoading, error, isInitialized, canAttemptSignIn };
};

/**
 * Apple OAuth state only
 */
export const useAppleAuthState = () => {
  const isLoading = useAppleOAuthStore((state) => state.isLoading);
  const error = useAppleOAuthStore((state) => state.error);
  const isInitialized = useAppleOAuthStore((state) => state.isInitialized);
  const canAttemptSignIn = useAppleOAuthStore((state) => state.canAttemptSignIn);

  return { isLoading, error, isInitialized, canAttemptSignIn };
};

/**
 * Combined auth state hook
 * ⚠️ WARNING: This subscribes to ALL auth stores and may cause unnecessary re-renders
 * Consider using selective hooks (useCoreAuth, useMagicLinkState, useGoogleAuthState) instead
 */
export const useAuthState = () => {
  const coreAuth = useCoreAuthStore();
  const magicLink = useMagicLinkStore();
  const googleOAuth = useGoogleOAuthStore();
  const appleOAuth = useAppleOAuthStore();
  const session = useSessionStore();

  return {
    // Core Auth
    isAuthenticated: coreAuth.isAuthenticated,
    user: coreAuth.user,
    isLoading: coreAuth.isLoading,

    // Magic Link
    magicLinkLoading: magicLink.isLoading,
    magicLinkError: magicLink.error,
    lastSentEmail: magicLink.lastSentEmail,
    canSendMagicLink: magicLink.canSendMagicLink,

    // Google OAuth
    googleOAuthLoading: googleOAuth.isLoading,
    googleOAuthError: googleOAuth.error,
    googleOAuthInitialized: googleOAuth.isInitialized,
    canAttemptGoogleSignIn: googleOAuth.canAttemptSignIn,
    googleOAuthReady: googleOAuth.isReady,

    // Apple OAuth
    appleOAuthLoading: appleOAuth.isLoading,
    appleOAuthError: appleOAuth.error,
    appleOAuthInitialized: appleOAuth.isInitialized,
    canAttemptAppleSignIn: appleOAuth.canAttemptSignIn,
    appleOAuthReady: appleOAuth.isReady,

    // Session
    hasPersistedSession: session.hasPersistedSession,
    sessionRestored: session.sessionRestored,
    shouldCheckSession: session.shouldCheckSession,
  };
};

/**
 * Auth actions hook
 * Provides access to all auth actions in a single hook
 */
export const useAuthActions = () => {
  const coreAuth = useCoreAuthStore();
  const magicLink = useMagicLinkStore();
  const googleOAuth = useGoogleOAuthStore();
  const appleOAuth = useAppleOAuthStore();
  const session = useSessionStore();

  return {
    // Core Auth Actions
    initializeAuth: coreAuth.initializeAuth,
    logout: coreAuth.logout,
    setSessionFromTokens: coreAuth.setSessionFromTokens,

    // Magic Link Actions
    sendMagicLink: magicLink.sendMagicLink,
    confirmMagicLink: magicLink.confirmMagicLink,
    clearMagicLinkError: magicLink.clearError,
    resetMagicLink: magicLink.reset,

    // Google OAuth Actions
    initializeGoogleOAuth: googleOAuth.initialize,
    signInWithGoogle: googleOAuth.signIn,
    clearGoogleOAuthError: googleOAuth.clearError,
    resetGoogleOAuth: googleOAuth.reset,

    // Apple OAuth Actions
    initializeAppleOAuth: appleOAuth.initialize,
    signInWithApple: appleOAuth.signIn,
    clearAppleOAuthError: appleOAuth.clearError,
    resetAppleOAuth: appleOAuth.reset,

    // Session Actions
    markSessionRestored: session.markSessionRestored,
    clearPersistedSession: session.clearPersistedSession,
    updateSessionCheck: session.updateSessionCheck,
  };
};

/**
 * Lightweight auth status hook
 * For components that only need to know if user is authenticated
 */
export const useAuthStatus = () => {
  const isAuthenticated = useCoreAuthStore((state) => state.isAuthenticated);
  const isLoading = useCoreAuthStore((state) => state.isLoading);
  const user = useCoreAuthStore((state) => state.user);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
};

/**
 * Magic link specific hook
 * For components that only deal with magic link operations
 */
export const useMagicLink = () => {
  const magicLink = useMagicLinkStore();

  return {
    isLoading: magicLink.isLoading,
    error: magicLink.error,
    lastSentEmail: magicLink.lastSentEmail,
    lastSentAt: magicLink.lastSentAt,
    sendMagicLink: magicLink.sendMagicLink,
    confirmMagicLink: magicLink.confirmMagicLink,
    clearError: magicLink.clearError,
    reset: magicLink.reset,
    getRemainingCooldown: magicLink.getRemainingCooldown,
    canSendMagicLink: magicLink.canSendMagicLink,
  };
};

/**
 * Google OAuth specific hook
 * For components that only deal with Google OAuth operations
 */
export const useGoogleOAuth = () => {
  const googleOAuth = useGoogleOAuthStore();

  return {
    isLoading: googleOAuth.isLoading,
    isInitialized: googleOAuth.isInitialized,
    error: googleOAuth.error,
    lastAttemptAt: googleOAuth.lastAttemptAt,
    initialize: googleOAuth.initialize,
    signIn: googleOAuth.signIn,
    clearError: googleOAuth.clearError,
    reset: googleOAuth.reset,
    getRemainingCooldown: googleOAuth.getRemainingCooldown,
    canAttemptSignIn: googleOAuth.canAttemptSignIn,
    isReady: googleOAuth.isReady,
  };
};

/**
 * Apple OAuth specific hook
 */
export const useAppleOAuth = () => {
  const appleOAuth = useAppleOAuthStore();

  return {
    isLoading: appleOAuth.isLoading,
    isInitialized: appleOAuth.isInitialized,
    error: appleOAuth.error,
    lastAttemptAt: appleOAuth.lastAttemptAt,
    initialize: appleOAuth.initialize,
    signIn: appleOAuth.signIn,
    clearError: appleOAuth.clearError,
    reset: appleOAuth.reset,
    getRemainingCooldown: appleOAuth.getRemainingCooldown,
    canAttemptSignIn: appleOAuth.canAttemptSignIn,
    isReady: appleOAuth.isReady,
  };
};

/**
 * Unified Auth Hooks
 *
 * Convenience hooks that combine multiple stores for common use cases
 */

import { useCoreAuthStore } from './coreAuthStore';
import { useMagicLinkStore } from './magicLinkStore';
import { useGoogleOAuthStore } from './googleOAuthStore';
import { useAppleOAuthStore } from './appleOAuthStore';
import { useSessionStore } from './sessionStore';
