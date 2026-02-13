import { logger } from '@/utils/debugConfig';
import {
  AppError,
  AuthError,
  NetworkError,
  PermissionError,
  ServerError,
  UnknownError,
  ValidationError,
} from '@/shared/errors';

interface APIError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

/**
 * Standardized error handling for API operations
 */
export const handleAPIError = (error: Error, operation: string): Error => {
  logger.error(`API Error in ${operation}:`, error);

  const errorWithExtras = error as APIError;

  if (error instanceof AppError) {
    return error;
  }

  if (isNetworkError(error)) {
    return new NetworkError('Network error', { operation });
  }

  if (errorWithExtras?.code === 'PGRST116') {
    return new ValidationError('Resource not found', { operation, code: errorWithExtras.code });
  }

  if (errorWithExtras?.status === 401) {
    return new AuthError('Authentication required', { operation, status: errorWithExtras.status });
  }

  if (errorWithExtras?.status === 403) {
    return new PermissionError('Access denied', { operation, status: errorWithExtras.status });
  }

  if (errorWithExtras?.status && errorWithExtras.status >= 500) {
    return new ServerError('Server error occurred. Please try again.', {
      operation,
      status: errorWithExtras.status,
    });
  }

  return new UnknownError(error?.message || `Failed to ${operation}`, { operation });
};

/**
 * Type guard for network errors
 */
export const isNetworkError = (error: unknown): boolean => {
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string };
    return (
      err.code === 'NETWORK_ERROR' ||
      !!err.message?.includes('network') ||
      !!err.message?.includes('fetch')
    );
  }
  return false;
};

/**
 * Retry configuration for TanStack Query
 */
export const getRetryConfig = () => ({
  retry: (failureCount: number, error: unknown) => {
    // Don't retry on client errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const err = error as { status?: number };
      if (err.status && err.status >= 400 && err.status < 500) {
        return false;
      }
    }

    // Retry up to 3 times for server errors and network issues
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s (max)
    return Math.min(1000 * 2 ** attemptIndex, 8000);
  },
});
