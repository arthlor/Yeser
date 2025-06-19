import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/utils/logger';

interface ErrorLog {
  timestamp: string;
  error: {
    message: string;
    name: string;
    stack?: string;
  };
  context: {
    operation: string;
    userId?: string;
    sessionId?: string;
    deviceInfo?: Record<string, unknown>;
    [key: string]: unknown; // Allow additional properties
  };
  metadata: {
    appVersion: string;
    environment: string;
    platform: string;
  };
}

interface GoogleOAuthErrorDetails {
  phase: 'initialization' | 'play_services' | 'signin' | 'token_extraction' | 'supabase_exchange';
  originalError: Error;
  googleSigninStatus?: {
    hasPlayServices?: boolean;
    isConfigured?: boolean;
  };
  supabaseStatus?: {
    isInitialized?: boolean;
    hasSession?: boolean;
  };
  configStatus?: {
    hasWebClientId?: boolean;
    hasIosClientId?: boolean;
    hasAndroidClientId?: boolean;
  };
}

class ProductionLogger {
  private readonly MAX_LOGS = 50;
  private readonly STORAGE_KEY = 'yeser_error_logs';

  /**
   * Log Google OAuth specific errors with detailed context
   */
  async logGoogleOAuthError(details: GoogleOAuthErrorDetails): Promise<void> {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      error: {
        message: details.originalError.message,
        name: details.originalError.name,
        stack: details.originalError.stack,
      },
      context: {
        operation: `google_oauth_${details.phase}`,
        // Add more context as available
      },
      metadata: {
        appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.EXPO_PUBLIC_APP_ENVIRONMENT || 'production',
        platform: 'react-native',
      },
    };

    // Add phase-specific details
    if (details.googleSigninStatus) {
      errorLog.context = {
        ...errorLog.context,
        googleSigninStatus: details.googleSigninStatus,
      };
    }

    if (details.supabaseStatus) {
      errorLog.context = {
        ...errorLog.context,
        supabaseStatus: details.supabaseStatus,
      };
    }

    if (details.configStatus) {
      errorLog.context = {
        ...errorLog.context,
        configStatus: details.configStatus,
      };
    }

    await this.saveErrorLog(errorLog);
    logger.error(`Google OAuth Error [${details.phase}]:`, details.originalError);
  }

  /**
   * Log general authentication errors
   */
  async logAuthError(
    operation: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      context: {
        operation,
        ...context,
      },
      metadata: {
        appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.EXPO_PUBLIC_APP_ENVIRONMENT || 'production',
        platform: 'react-native',
      },
    };

    await this.saveErrorLog(errorLog);
    logger.error(`Auth Error [${operation}]:`, error);
  }

  /**
   * Save error log to local storage
   */
  private async saveErrorLog(errorLog: ErrorLog): Promise<void> {
    try {
      const existingLogs = await this.getErrorLogs();
      const updatedLogs = [errorLog, ...existingLogs].slice(0, this.MAX_LOGS);

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLogs));
    } catch (error) {
      logger.error('Failed to save error log:', error as Error);
    }
  }

  /**
   * Get all stored error logs
   */
  async getErrorLogs(): Promise<ErrorLog[]> {
    try {
      const logsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      logger.error('Failed to retrieve error logs:', error as Error);
      return [];
    }
  }

  /**
   * Clear all error logs
   */
  async clearErrorLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      logger.error('Failed to clear error logs:', error as Error);
    }
  }

  /**
   * Export error logs as formatted string
   */
  async exportErrorLogs(): Promise<string> {
    const logs = await this.getErrorLogs();

    const exportData = {
      exportTimestamp: new Date().toISOString(),
      totalLogs: logs.length,
      logs,
      summary: this.generateErrorSummary(logs),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate summary of error patterns
   */
  private generateErrorSummary(logs: ErrorLog[]): {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    errorsByPhase: Record<string, number>;
    mostRecentError?: ErrorLog;
    oldestError?: ErrorLog;
  } {
    const errorsByOperation: Record<string, number> = {};
    const errorsByPhase: Record<string, number> = {};

    logs.forEach((log) => {
      // Count by operation
      const operation = log.context.operation;
      errorsByOperation[operation] = (errorsByOperation[operation] || 0) + 1;

      // Extract phase from operation if it's a Google OAuth error
      if (operation.startsWith('google_oauth_')) {
        const phase = operation.replace('google_oauth_', '');
        errorsByPhase[phase] = (errorsByPhase[phase] || 0) + 1;
      }
    });

    return {
      totalErrors: logs.length,
      errorsByOperation,
      errorsByPhase,
      mostRecentError: logs[0],
      oldestError: logs[logs.length - 1],
    };
  }
}

// Export singleton instance
export const productionLogger = new ProductionLogger();

// Export types for use in other files
export type { GoogleOAuthErrorDetails, ErrorLog };
