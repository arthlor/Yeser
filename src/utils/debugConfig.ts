/**
 * Debug and logging configuration for the Yeser app
 * Provides structured logging with different levels and conditional output
 * Enhanced with production error tracking integration
 */

/* eslint-disable no-console */

// Import from the new centralized logger to break circular dependency
import { logger } from '@/utils/logger';
export { logger, type LogContext, type LogEntry } from '@/utils/logger';

/**
 * Emergency splash screen recovery for development
 */
export const emergencySplashRecovery = (): void => {
  if (!__DEV__) {
    return;
  }

  logger.warn('Starting emergency splash recovery...', { component: 'splash' });

  setTimeout(() => {
    import('expo-splash-screen').then((SplashScreen) => {
      SplashScreen.hideAsync().catch((error) => {
        logger.error('Emergency recovery failed:', error as Error);
      });
    });
  }, 15000); // Force hide after 15 seconds
};

/**
 * Console override protection
 * Prevents other modules from overriding console methods
 */
export const protectConsole = (): void => {
  if (!__DEV__) {
    const originalMethods = logger.getOriginalConsole();

    // Restore original console methods if they've been overridden
    if (console.error !== originalMethods.error) {
      logger.warn('Console.error was overridden - restoring original method', {
        component: 'logger',
      });
      console.error = originalMethods.error;
    }

    if (console.warn !== originalMethods.warn) {
      logger.warn('Console.warn was overridden - restoring original method', {
        component: 'logger',
      });
      console.warn = originalMethods.warn;
    }

    // Prevent future overrides
    Object.defineProperty(console, 'error', {
      value: originalMethods.error,
      writable: false,
      configurable: false,
    });

    Object.defineProperty(console, 'warn', {
      value: originalMethods.warn,
      writable: false,
      configurable: false,
    });
  }
};
