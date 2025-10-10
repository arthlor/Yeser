/**
 * Core logger implementation
 * Extracted to break circular dependency between debugConfig and productionLogger
 */

/* eslint-disable no-console */

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
}

interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: LogContext;
  timestamp: string;
  environment: 'development' | 'production';
}

class Logger {
  private logLevel: number = __DEV__ ? 0 : 2; // DEBUG in dev, WARN+ in prod
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 100;

  // Store original console methods to prevent override conflicts
  private originalConsole = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    log: console.log.bind(console),
  };

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;

    if (context?.component) {
      return `${prefix} [${context.component}] ${message}`;
    }

    return `${prefix} ${message}`;
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.unshift(entry);
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer = this.logBuffer.slice(0, this.MAX_BUFFER_SIZE);
    }
  }

  private async logToProduction(
    level: 'ERROR' | 'WARN',
    message: string,
    context?: LogContext | Error
  ): Promise<void> {
    if (!__DEV__ && (level === 'ERROR' || level === 'WARN')) {
      try {
        // Lazy load productionLogger to break circular dependency
        const { productionLogger } = await import('@/services/productionLogger');

        if (context instanceof Error) {
          await productionLogger.logAuthError('general_error', context, {
            originalMessage: message,
            component: 'logger',
          });
        } else {
          await productionLogger.logAuthError('general_error', new Error(message), {
            ...context,
            component: context?.component || 'logger',
          });
        }
      } catch (productionLogError) {
        // Fail silently to prevent logging loops
        this.originalConsole.warn('Production logging failed:', productionLogError);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'DEBUG',
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: __DEV__ ? 'development' : 'production',
    };

    this.addToBuffer(entry);

    if (this.logLevel <= 0) {
      this.originalConsole.debug(this.formatMessage('DEBUG', message, context), context);
    }
  }

  info(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'INFO',
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: __DEV__ ? 'development' : 'production',
    };

    this.addToBuffer(entry);

    if (this.logLevel <= 1) {
      this.originalConsole.info(this.formatMessage('INFO', message, context), context);
    }
  }

  warn(message: string, context?: LogContext): void {
    const entry: LogEntry = {
      level: 'WARN',
      message,
      context,
      timestamp: new Date().toISOString(),
      environment: __DEV__ ? 'development' : 'production',
    };

    this.addToBuffer(entry);

    if (this.logLevel <= 2) {
      if (context) {
        this.originalConsole.warn(this.formatMessage('WARN', message, context), context);
      } else {
        this.originalConsole.warn(this.formatMessage('WARN', message));
      }
    }

    // Log warnings to production in background
    this.logToProduction('WARN', message, context);
  }

  error(message: string, context?: LogContext | Error): void {
    const entry: LogEntry = {
      level: 'ERROR',
      message,
      context:
        context instanceof Error ? { error: context.message, stack: context.stack } : context,
      timestamp: new Date().toISOString(),
      environment: __DEV__ ? 'development' : 'production',
    };

    this.addToBuffer(entry);

    if (this.logLevel <= 3) {
      if (context instanceof Error) {
        // Handle Error objects separately
        this.originalConsole.error(this.formatMessage('ERROR', message), context);
      } else {
        // Handle LogContext objects
        this.originalConsole.error(this.formatMessage('ERROR', message, context), context);
      }
    }

    // Always log errors to production
    this.logToProduction('ERROR', message, context);
  }

  // Analytics integration
  trackEvent(event: string, properties?: Record<string, unknown>): void {
    this.debug(`Analytics Event: ${event}`, { extra: properties });
    // Future: Send to analytics service
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logBuffer.slice(0, count);
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(
      {
        exportTime: new Date().toISOString(),
        environment: __DEV__ ? 'development' : 'production',
        totalLogs: this.logBuffer.length,
        logs: this.logBuffer,
      },
      null,
      2
    );
  }

  // Clear log buffer
  clearBuffer(): void {
    this.logBuffer = [];
  }

  // Set log level dynamically
  setLogLevel(level: number): void {
    this.logLevel = level;
    this.info(`Log level changed to ${level}`, { component: 'logger' });
  }

  // Get original console methods (for override protection)
  getOriginalConsole() {
    return this.originalConsole;
  }
}

export const logger = new Logger();
export type { LogContext, LogEntry };
