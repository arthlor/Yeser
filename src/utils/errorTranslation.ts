/**
 * Error Translation Utility
 * Converts technical error messages to user-friendly Turkish messages
 * Ensures users NEVER see technical English error messages
 * Enhanced with proper logging integration
 */

import { logger } from './debugConfig';

export interface TranslatedError {
  userMessage: string;
  technicalMessage: string;
  errorType: 'auth' | 'network' | 'validation' | 'server' | 'unknown';
}

/**
 * Translates technical errors to user-friendly Turkish messages
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

  // Google OAuth Specific Errors (HIGH PRIORITY - these were leaking through)
  if (
    lowerMessage.includes('oauth session failed') ||
    lowerMessage.includes('authsessionfailederror') ||
    lowerMessage.includes('dismiss') ||
    lowerMessage.includes('oauth') ||
    lowerMessage.includes('google sign-in')
  ) {
    return {
      userMessage: 'Google ile giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.',
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
      userMessage: 'Giriş işleminde bir sorun oluştu. Lütfen tekrar deneyin.',
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
      userMessage: 'Giriş bağlantınızın süresi dolmuş. Lütfen yeni bir bağlantı talep edin.',
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
      userMessage: 'Çok fazla deneme yapıldı. Lütfen bir süre bekleyip tekrar deneyin.',
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
      userMessage: 'İnternet bağlantınızı kontrol edin.',
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
      userMessage: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
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
      userMessage: 'Girdiğiniz bilgileri kontrol edin.',
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
      userMessage: 'Bu işlem için yetkiniz bulunmuyor.',
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
    userMessage: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    technicalMessage,
    errorType: 'unknown',
  };
};

/**
 * Ensures error messages are always in Turkish for users
 * Use this for any error that will be displayed to users
 */
export const getUserFriendlyError = (error: Error | string | unknown): string => {
  return translateError(error).userMessage;
};

/**
 * Checks if an error message is in Turkish (safe to show users)
 * @param message - The error message to check
 * @returns true if the message appears to be in Turkish
 */
export const isTurkishErrorMessage = (message: string): boolean => {
  const turkishWords = [
    'giriş',
    'bağlantı',
    'süresi',
    'dolmuş',
    'lütfen',
    'tekrar',
    'deneyin',
    'hata',
    'oluştu',
    'internet',
    'kontrol',
    'edin',
    'çok',
    'fazla',
    'deneme',
  ];

  const lowerMessage = message.toLowerCase();
  return turkishWords.some((word) => lowerMessage.includes(word));
};

/**
 * Safe error display function - converts any technical error to Turkish
 * Use this whenever you need to display an error to users
 * Returns empty string for user cancellations (not errors to show)
 */
export const safeErrorDisplay = (error: Error | string | unknown): string => {
  const message = error instanceof Error ? error.message : String(error);

  // If it's already a Turkish message, use it
  if (isTurkishErrorMessage(message)) {
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

  // Set up global error handlers (React Native specific)
  if (typeof global !== 'undefined') {
    // Handle unhandled promise rejections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).onunhandledrejection = (event: {
      reason: unknown;
      preventDefault?: () => void;
    }) => {
      handleGlobalError(new Error(`Unhandled promise rejection: ${String(event.reason)}`));
      // Prevent default behavior that shows error to users
      if (event.preventDefault) {
        event.preventDefault();
      }
    };

    // Handle uncaught exceptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).onerror = (
      message: string | unknown,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error
    ) => {
      const errorMessage =
        error?.message || (typeof message === 'string' ? message : 'Unknown error');
      handleGlobalError(new Error(errorMessage));
      // Return true to prevent default error handling
      return true;
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

    // Fallback to generic Turkish message
    return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  } catch (translationError) {
    // Even the translation failed - use hardcoded Turkish message
    logger.error('Error translation failed in emergency safety net', {
      error:
        translationError instanceof Error ? translationError.message : String(translationError),
      originalError: error instanceof Error ? error.message : String(error),
      component: 'emergencyErrorSafetyNet',
    });
    return 'Bir hata oluştu. Lütfen tekrar deneyin.';
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
