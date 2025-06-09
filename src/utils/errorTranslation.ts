/**
 * Error Translation Utility
 * Converts technical error messages to user-friendly Turkish messages
 * Ensures users NEVER see technical English error messages
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
  _context?: string
): TranslatedError => {
  const technicalMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = technicalMessage.toLowerCase();

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
 */

// Track if global error monitoring is active
let isGlobalErrorMonitoringActive = false;

/**
 * Initialize global error monitoring to catch system-level errors
 * This prevents any technical errors from bypassing our translation system
 */
export const initializeGlobalErrorMonitoring = () => {
  if (isGlobalErrorMonitoringActive) {
    return; // Already initialized
  }

  // Don't show console errors in production builds
  if (!__DEV__) {
    // Override console.error in production
    // eslint-disable-next-line no-console
    console.error = (...args: unknown[]) => {
      // Log to debug system but don't show to users
      logger.error('Console error intercepted in production:', { 
        args: JSON.stringify(args).substring(0, 1000) 
      });
      
      // Don't call original console.error in production
      // Users should never see console outputs
    };

    // Override console.warn in production  
    // eslint-disable-next-line no-console
    console.warn = (...args: unknown[]) => {
      // Log to debug system but don't show to users
      logger.warn('Console warning intercepted in production:', { 
        args: JSON.stringify(args).substring(0, 1000) 
      });
      
      // Don't call original console.warn in production
    };
  }

  // Global error event handler for unhandled errors
  const handleGlobalError = (error: Error | string, isFatal?: boolean) => {
    // Log technical details for debugging
    logger.error('Global error intercepted:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      isFatal: isFatal || false,
      timestamp: new Date().toISOString(),
    });

    // Prevent error from reaching users by not re-throwing
    // Our error boundaries and stores will handle user-facing errors
  };

  // Set up global error handlers (React Native specific)
  if (typeof global !== 'undefined') {
    // Handle unhandled promise rejections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).onunhandledrejection = (event: { reason: unknown; preventDefault?: () => void }) => {
      handleGlobalError(new Error(`Unhandled promise rejection: ${String(event.reason)}`));
      // Prevent default behavior that shows error to users
      if (event.preventDefault) {
        event.preventDefault();
      }
    };

    // Handle uncaught exceptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).onerror = (message: string | unknown, source?: string, lineno?: number, colno?: number, error?: Error) => {
      const errorMessage = error?.message || (typeof message === 'string' ? message : 'Unknown error');
      handleGlobalError(new Error(errorMessage));
      // Return true to prevent default error handling
      return true;
    };
  }

  isGlobalErrorMonitoringActive = true;
  logger.debug('Global error monitoring initialized');
};

/**
 * Emergency error safety net - for any error that reaches the UI layer
 * This is the final line of defense against technical errors
 */
export const emergencyErrorSafetyNet = (error: unknown): string => {
  try {
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
    logger.error('Error translation failed:', { 
      error: translationError instanceof Error ? translationError.message : String(translationError) 
    });
    return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
}; 