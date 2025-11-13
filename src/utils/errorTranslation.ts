/**
 * Error Translation Utility
 * Converts technical error messages to user-friendly localized messages
 * Ensures users NEVER see raw technical error messages
 * Enhanced with proper logging integration
 */

import { logger } from './debugConfig';
import i18n from '@/i18n';

export interface TranslatedError {
  userMessage: string;
  technicalMessage: string;
  errorType: 'auth' | 'network' | 'validation' | 'server' | 'unknown';
}

/**
 * Translates technical errors to user-friendly localized messages
 * @param error - The error object or message
 * @param context - Additional context about where the error occurred
 * @returns Translated error with user-friendly Turkish message
 */
export const translateError = (
  error: Error | string | unknown,
  context?: string
): TranslatedError => {
  const technicalMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = technicalMessage.toLowerCase();

  // Log technical error for debugging (will go to production logger automatically)
  logger.error('Error being translated:', {
    technicalMessage,
    context,
    component: 'errorTranslation',
  });

  // 🔥 CRITICAL FIX: Handle Supabase/PostgreSQL error objects properly
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as { code: string; message: string; details?: string; hint?: string };

    // PostgreSQL RLS Policy Violations (42501)
    if (dbError.code === '42501') {
      return {
        userMessage: i18n.isInitialized ? i18n.t('errors.auth.noPermission') : 'Permission denied',
        technicalMessage: dbError.message,
        errorType: 'auth',
      };
    }

    // PostgreSQL Foreign Key Violations (23503)
    if (dbError.code === '23503') {
      return {
        userMessage: i18n.isInitialized
          ? i18n.t('errors.db.integrity')
          : 'Database integrity error',
        technicalMessage: dbError.message,
        errorType: 'validation',
      };
    }

    // PostgreSQL Unique Constraint Violations (23505)
    if (dbError.code === '23505') {
      return {
        userMessage: i18n.isInitialized ? i18n.t('errors.validation.generic') : 'Validation error',
        technicalMessage: dbError.message,
        errorType: 'validation',
      };
    }

    // PostgREST errors (PGRST prefix)
    if (dbError.code?.startsWith('PGRST')) {
      if (dbError.code === 'PGRST116') {
        return {
          userMessage: i18n.isInitialized ? i18n.t('errors.db.recordNotFound') : 'Record not found',
          technicalMessage: dbError.message,
          errorType: 'validation',
        };
      }
      return {
        userMessage: i18n.isInitialized ? i18n.t('errors.db.access') : 'Database access error',
        technicalMessage: dbError.message,
        errorType: 'server',
      };
    }

    // General database error fallback
    if (dbError.message) {
      const dbErrorMessage = dbError.message.toLowerCase();

      // Check for specific database error patterns
      if (
        dbErrorMessage.includes('coalesce') &&
        dbErrorMessage.includes('time without time zone')
      ) {
        return {
          userMessage: i18n.isInitialized
            ? i18n.t('errors.db.notificationSchedule')
            : 'We could not update your notification schedule. Please try again.',
          technicalMessage: dbError.message,
          errorType: 'server',
        };
      }

      if (dbErrorMessage.includes('row level security') || dbErrorMessage.includes('policy')) {
        return {
          userMessage: i18n.isInitialized
            ? i18n.t('errors.db.security')
            : 'Security policy violation',
          technicalMessage: dbError.message,
          errorType: 'auth',
        };
      }

      if (dbErrorMessage.includes('foreign key') || dbErrorMessage.includes('constraint')) {
        return {
          userMessage: i18n.isInitialized
            ? i18n.t('errors.db.integrity')
            : 'Database integrity error',
          technicalMessage: dbError.message,
          errorType: 'validation',
        };
      }
    }
  }

  // Google OAuth Specific Errors (HIGH PRIORITY - these were leaking through)
  if (
    lowerMessage.includes('oauth session failed') ||
    lowerMessage.includes('authsessionfailederror') ||
    lowerMessage.includes('dismiss') ||
    lowerMessage.includes('oauth') ||
    lowerMessage.includes('google sign-in')
  ) {
    return {
      userMessage: i18n.isInitialized
        ? i18n.t('errors.auth.googleSigninFailed')
        : 'Google sign-in failed',
      technicalMessage,
      errorType: 'auth',
    };
  }

  // OAuth Cancellation - NOT an error for users
  if (
    lowerMessage.includes('authcancellederror') ||
    lowerMessage.includes('user cancelled') ||
    lowerMessage.includes('cancelled') ||
    lowerMessage.includes('cancel')
  ) {
    // Log as info since cancellation is not really an error
    logger.info('User cancelled authentication', {
      context,
      component: 'errorTranslation',
    });
    return {
      userMessage: '', // Empty message - cancellation is not an error to show users
      technicalMessage,
      errorType: 'auth',
    };
  }

  // OAuth Token/URL Errors
  if (
    lowerMessage.includes('authtokenmissingerror') ||
    lowerMessage.includes('authurlmissingerror') ||
    lowerMessage.includes('authredirecterror') ||
    lowerMessage.includes('oauth tokens missing') ||
    lowerMessage.includes('oauth url not returned') ||
    lowerMessage.includes('invalid redirect url')
  ) {
    return {
      userMessage: i18n.isInitialized
        ? i18n.t('errors.auth.googleSigninFailed')
        : 'Google sign-in failed',
      technicalMessage,
      errorType: 'auth',
    };
  }

  // Authentication Session Errors
  if (
    lowerMessage.includes('auth session missing') ||
    lowerMessage.includes('authsessionmissingerror') ||
    lowerMessage.includes('expired') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('authentication')
  ) {
    return {
      userMessage: i18n.isInitialized ? i18n.t('errors.auth.sessionExpired') : 'Session expired',
      technicalMessage,
      errorType: 'auth',
    };
  }

  // Rate Limiting Errors
  if (
    lowerMessage.includes('rate') ||
    lowerMessage.includes('too many') ||
    lowerMessage.includes('limit') ||
    lowerMessage.includes('429')
  ) {
    return {
      userMessage: i18n.isInitialized ? i18n.t('errors.auth.rateLimited') : 'Rate limited',
      technicalMessage,
      errorType: 'auth',
    };
  }

  // Network Errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('offline')
  ) {
    return {
      userMessage: i18n.isInitialized ? i18n.t('errors.network.generic') : 'Network error',
      technicalMessage,
      errorType: 'network',
    };
  }

  // Server Errors
  if (
    lowerMessage.includes('500') ||
    lowerMessage.includes('502') ||
    lowerMessage.includes('503') ||
    lowerMessage.includes('504') ||
    lowerMessage.includes('internal server') ||
    lowerMessage.includes('service unavailable')
  ) {
    return {
      userMessage: i18n.isInitialized ? i18n.t('errors.server.generic') : 'Server error',
      technicalMessage,
      errorType: 'server',
    };
  }

  // Validation Errors
  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid input') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('format')
  ) {
    return {
      userMessage: i18n.isInitialized ? i18n.t('errors.validation.generic') : 'Validation error',
      technicalMessage,
      errorType: 'validation',
    };
  }

  // Permission Errors
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('401') ||
    lowerMessage.includes('403')
  ) {
    return {
      userMessage: i18n.isInitialized ? i18n.t('errors.permission.generic') : 'Permission error',
      technicalMessage,
      errorType: 'auth',
    };
  }

  // Default fallback for any unknown error
  logger.warn('Unknown error type encountered', {
    technicalMessage: technicalMessage.substring(0, 200), // Limit message length
    context,
    component: 'errorTranslation',
  });

  return {
    userMessage: i18n.isInitialized
      ? i18n.t('errors.unknown.generic')
      : 'An unexpected error occurred',
    technicalMessage,
    errorType: 'unknown',
  };
};

/**
 * Ensures error messages are always localized for users
 * Use this for any error that will be displayed to users
 */
export const getUserFriendlyError = (error: Error | string | unknown): string => {
  return translateError(error).userMessage;
};

/**
 * Checks if an error message appears already localized (rough heuristic)
 * @param message - The error message to check
 * @returns true if the message appears to be in Turkish
 */
export const isLocalizedErrorMessage = (message: string): boolean => {
  const keywords = [
    // Turkish
    'giriş',
    'bağlantı',
    'süresi',
    'dolmuş',
    'lütfen',
    'tekrar',
    'deneyin',
    'internet',
    'kontrol',
    'hata',
    // English
    'please',
    'try again',
    'error',
    'connection',
    'permission',
    'server',
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some((word) => lowerMessage.includes(word));
};

/**
 * Safe error display function - converts any technical error to Turkish
 * Use this whenever you need to display an error to users
 * Returns empty string for user cancellations (not errors to show)
 */
export const safeErrorDisplay = (error: Error | string | unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  // If it's already a localized message, use it
  if (isLocalizedErrorMessage(message)) {
    return message;
  }

  // Otherwise, translate it
  const translated = getUserFriendlyError(error);

  // Don't show cancellation messages to users
  if (translated === '') {
    return '';
  }

  return translated;
};

/**
 * Global Error Prevention System
 * Prevents ANY technical error from reaching users
 * Enhanced to work with the proper logging system
 */

// Track if global error monitoring is active
let isGlobalErrorMonitoringActive = false;

/**
 * Initialize global error monitoring to catch system-level errors
 * This prevents any technical errors from bypassing our translation system
 * Enhanced to work properly with the logger system
 */
export const initializeGlobalErrorMonitoring = (): void => {
  if (isGlobalErrorMonitoringActive) {
    return; // Already initialized
  }

  // Initialize console protection (prevents other modules from overriding console)
  if (!__DEV__) {
    import('./debugConfig')
      .then(({ protectConsole }) => {
        protectConsole();
      })
      .catch((error) => {
        logger.warn('Failed to protect console methods', {
          error: error instanceof Error ? error.message : String(error),
          component: 'globalErrorHandler',
        });
      });
  }

  // Global error event handler for unhandled errors
  const handleGlobalError = (error: Error | string, isFatal?: boolean): void => {
    // Use logger which will automatically handle production logging
    logger.error('Global error intercepted', {
      error: error instanceof Error ? error.message : String(error),
      isFatal: isFatal || false,
      timestamp: new Date().toISOString(),
      component: 'globalErrorHandler',
    });
  };

  // Set up global error handlers (React Native specific) with proper typing
  if (typeof globalThis !== 'undefined') {
    // Extend globalThis with minimal handler typings without using any
    const g = globalThis as unknown as {
      onunhandledrejection?: (event: { reason: unknown; preventDefault?: () => void }) => void;
      onerror?: (
        message: string | unknown,
        source?: string,
        lineno?: number,
        colno?: number,
        error?: Error
      ) => boolean | void;
    };

    g.onunhandledrejection = (event) => {
      handleGlobalError(new Error(`Unhandled promise rejection: ${String(event.reason)}`));
      if (event.preventDefault) {
        event.preventDefault();
      }
    };

    g.onerror = (message, _source, _lineno, _colno, error) => {
      const errorMessage =
        error?.message || (typeof message === 'string' ? message : 'Unknown error');
      handleGlobalError(new Error(errorMessage));
      return true; // prevent default error handling
    };
  }

  isGlobalErrorMonitoringActive = true;

  // Log initialization in development only
  if (__DEV__) {
    logger.debug('Global error monitoring initialized safely', {
      component: 'globalErrorHandler',
    });
  } else {
    logger.info('Production error monitoring initialized', {
      component: 'globalErrorHandler',
    });
  }
};

/**
 * Emergency error safety net - for any error that reaches the UI layer
 * This is the final line of defense against technical errors
 */
export const emergencyErrorSafetyNet = (error: unknown): string => {
  try {
    // Log the emergency case
    logger.warn('Emergency error safety net activated', {
      error: error instanceof Error ? error.message : String(error),
      component: 'emergencyErrorSafetyNet',
    });

    // Attempt normal translation
    const result = safeErrorDisplay(error);

    // If translation worked, return it
    if (result && typeof result === 'string' && result.trim() !== '') {
      return result;
    }

    // Fallback to generic localized message (uses current i18n language)
    return i18n.isInitialized ? i18n.t('errors.unknown.generic') : 'An unexpected error occurred';
  } catch (translationError) {
    // Even the translation failed - use generic localized message
    logger.error('Error translation failed in emergency safety net', {
      error:
        translationError instanceof Error ? translationError.message : String(translationError),
      originalError: error instanceof Error ? error.message : String(error),
      component: 'emergencyErrorSafetyNet',
    });
    return i18n.isInitialized ? i18n.t('errors.unknown.generic') : 'An unexpected error occurred';
  }
};

/**
 * Get error logging statistics for debugging
 */
export const getErrorStatistics = (): {
  recentErrors: number;
  errorTypes: Record<string, number>;
  lastError?: string;
} => {
  try {
    const recentLogs = logger.getRecentLogs(100);
    const errorLogs = recentLogs.filter((log) => log.level === 'ERROR');

    const errorTypes: Record<string, number> = {};
    errorLogs.forEach((log) => {
      const component = log.context?.component || 'unknown';
      errorTypes[component] = (errorTypes[component] || 0) + 1;
    });

    return {
      recentErrors: errorLogs.length,
      errorTypes,
      lastError: errorLogs[0]?.message,
    };
  } catch (error) {
    logger.error('Failed to get error statistics', error as Error);
    return {
      recentErrors: 0,
      errorTypes: {},
    };
  }
};
