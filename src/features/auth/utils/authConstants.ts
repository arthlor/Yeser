// Auth-related constants
export const AUTH_CONSTANTS = {
  MAGIC_LINK_COOLDOWN_MS: 60 * 1000, // 1 minute between requests
  TOKEN_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes for deep link token expiry
  AUTH_INIT_TIMEOUT_MS: 2000, // 2 seconds for auth initialization timeout
  OPERATION_CLEANUP_INTERVAL_MS: 30 * 1000, // 30 seconds for atomic operation cleanup
  URL_PROCESSING_CACHE_MS: 60 * 1000, // 1 minute for URL processing cache
  QUEUE_PROCESSING_DELAY_MS: 10, // OPTIMIZED: 10ms delay for faster responsiveness
} as const;

// Auth method types
export type AuthMethod = 'magic_link' | 'google_oauth';

// Operation types for atomic operations
export type OperationType =
  | 'magic_link'
  | 'auth_init'
  | 'logout'
  | 'session_tokens'
  | 'confirm_magic_link';

// Deep link callback parameter types
export interface AuthCallbackParams {
  access_token?: string;
  refresh_token?: string;
  token_hash?: string;
  type?: string;
  error?: string;
  error_description?: string;
}

// Magic Link Request interface - FIXED to store callbacks per request
export interface MagicLinkRequest {
  credentials: {
    email: string;
    options?: {
      emailRedirectTo?: string;
      shouldCreateUser?: boolean;
      data?: Record<string, unknown>;
    };
  };
  promise: {
    resolve: () => void;
    reject: (error: Error) => void;
  };
  // Store callbacks with each request to prevent sharing bug
  callbacks: {
    onSuccess: (message: string) => void;
    onError: (error: Error) => void;
    setLoading: (loading: boolean) => void;
    setMagicLinkSent: (sent: boolean) => void;
  };
  timestamp: number;
}

// URL Processing state types
export interface UrlProcessingState {
  status: 'processing' | 'completed';
  timestamp: number;
}

// OTP Token queue interface
export interface QueuedOTPToken {
  tokenHash: string;
  type: string;
  timestamp: number;
  url: string;
}

// Global error handlers interface (for toast integration)
export interface GlobalErrorHandlers {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}
