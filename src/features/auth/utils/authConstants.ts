// Auth-related constants
export const AUTH_CONSTANTS = {
  TOKEN_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes for deep link token expiry
  AUTH_INIT_TIMEOUT_MS: 2000, // 2 seconds for auth initialization timeout
  OPERATION_CLEANUP_INTERVAL_MS: 30 * 1000, // 30 seconds for atomic operation cleanup
  URL_PROCESSING_CACHE_MS: 60 * 1000, // 1 minute for URL processing cache
  QUEUE_PROCESSING_DELAY_MS: 10, // OPTIMIZED: 10ms delay for faster responsiveness
} as const;

// Auth method types
export type AuthMethod = 'google_oauth' | 'apple_oauth';

// Operation types for atomic operations
export type OperationType = 'auth_init' | 'logout' | 'session_tokens';

// Deep link callback parameter types
export interface AuthCallbackParams {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

// URL Processing state types
export interface UrlProcessingState {
  status: 'processing' | 'completed';
  timestamp: number;
}

// Global error handlers interface (for toast integration)
export interface GlobalErrorHandlers {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}
