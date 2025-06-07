/**
 * Debug and logging configuration for the Yeser app
 * Provides structured logging with different levels and conditional output
 */

// Performance polyfill for React Native
const getPerformanceNow = (): (() => number) => {
  if (typeof performance !== 'undefined' && performance.now) {
    return () => performance.now();
  }
  // Fallback for React Native
  return () => Date.now();
};

const performanceNow = getPerformanceNow();

interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  [key: string]: any; // Allow any other string keys
}

class Logger {
  private logLevel: number = __DEV__ ? 0 : 2; // DEBUG in dev, WARN+ in prod

  private formatMessage(level: string, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    if (context) {
      return `${prefix} ${message}`;
    }

    return `${prefix} ${message}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.logLevel <= 0) {
      console.log(this.formatMessage('DEBUG', message, context), context);
    }
  }

  info(message: string, context?: LogContext) {
    if (this.logLevel <= 1) {
      console.info(this.formatMessage('INFO', message, context), context);
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.logLevel <= 2) {
      console.warn(this.formatMessage('WARN', message, context), context);
    }
  }

  error(message: string, context?: LogContext | Error) {
    if (this.logLevel <= 3) {
      if (context instanceof Error) {
        // Handle Error objects separately
        console.error(this.formatMessage('ERROR', message), context);
      } else {
        // Handle LogContext objects
        console.error(this.formatMessage('ERROR', message, context), context);
      }
    }
  }

  // Analytics integration
  trackEvent(event: string, properties?: Record<string, unknown>) {
    this.debug(`Analytics Event: ${event}`, { extra: properties });
    // Future: Send to analytics service
  }
}

export const logger = new Logger();
