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
import i18n from '@/i18n';

interface APIError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

const getLocalizedAPIErrorMessage = (
  key: string,
  defaultValue: string,
  options: Record<string, string | number> = {}
): string => {
  if (!i18n.isInitialized) {
    return Object.entries(options).reduce(
      (message, [name, value]) => message.replace(`{{${name}}}`, String(value)),
      defaultValue
    );
  }

  return String(i18n.t(key, { defaultValue, ...options }));
};

const mapBusinessRuleError = (message: string, operation: string): Error | null => {
  if (message.includes('PAST_ENTRY_REQUIRES_PRO')) {
    return new PermissionError(
      getLocalizedAPIErrorMessage(
        'errors.gratitude.pastEntryRequiresPro',
        'Past entries are a Premium feature.'
      ),
      { operation, code: 'PAST_ENTRY_REQUIRES_PRO' }
    );
  }

  if (message.includes('FREE_DAILY_LIMIT_REACHED')) {
    return new ValidationError(
      getLocalizedAPIErrorMessage(
        'errors.gratitude.freeDailyLimit',
        'Free accounts can add one gratitude per day.'
      ),
      { operation, code: 'FREE_DAILY_LIMIT_REACHED' }
    );
  }

  if (message.includes('MOOD_EDITING_REQUIRES_PRO')) {
    return new PermissionError(
      getLocalizedAPIErrorMessage(
        'errors.gratitude.moodEditingRequiresPro',
        'Mood editing is a Premium feature.'
      ),
      { operation, code: 'MOOD_EDITING_REQUIRES_PRO' }
    );
  }

  if (message.includes('ATTACHMENTS_REQUIRE_PRO')) {
    return new PermissionError(
      getLocalizedAPIErrorMessage(
        'errors.gratitude.attachmentsRequirePro',
        'Media attachments are a Premium feature.'
      ),
      { operation, code: 'ATTACHMENTS_REQUIRE_PRO' }
    );
  }

  const attachmentLimitMatch = message.match(/ATTACHMENT_DAILY_LIMIT_REACHED:(image|audio):(\d+)/);
  if (attachmentLimitMatch) {
    const kind = attachmentLimitMatch[1];
    const cap = Number(attachmentLimitMatch[2]) || 10;
    const key =
      kind === 'image'
        ? 'gratitude.attachments.errors.dailyLimitImage'
        : 'gratitude.attachments.errors.dailyLimitAudio';
    const fallback =
      kind === 'image'
        ? "You have reached today's image limit ({{cap}}/day). Try again tomorrow."
        : "You have reached today's voice note limit ({{cap}}/day). Try again tomorrow.";

    return new ValidationError(getLocalizedAPIErrorMessage(key, fallback, { cap }), {
      operation,
      code: 'ATTACHMENT_DAILY_LIMIT_REACHED',
      kind,
      cap,
    });
  }

  if (message.includes('Entry not found') || message.includes('Attachment not found')) {
    return new ValidationError(
      getLocalizedAPIErrorMessage('errors.db.recordNotFound', 'Record not found.'),
      { operation, code: 'P0002' }
    );
  }

  return null;
};

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

  const businessError = mapBusinessRuleError(error.message || '', operation);
  if (businessError) {
    return businessError;
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
