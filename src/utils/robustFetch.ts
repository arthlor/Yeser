import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { logger } from './debugConfig';

interface FetchOptions extends globalThis.RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  fallbackUrls?: string[];
  isSimulator?: boolean;
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * 🚀 ROBUST FETCH: Simulator-aware network request handler
 * Addresses iOS Simulator network connectivity issues with comprehensive fallbacks
 */
export class RobustFetch {
  private static networkState: NetworkState = {
    isConnected: true,
    isInternetReachable: null,
    type: null,
  };

  private static isSimulator = Platform.OS === 'ios' && __DEV__;

  /**
   * Initialize network state monitoring
   */
  static initialize(): void {
    NetInfo.addEventListener((state) => {
      this.networkState = {
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      };
    });
  }

  /**
   * Enhanced fetch with simulator-specific optimizations
   */
  static async fetch(url: string, options: FetchOptions = {}): Promise<globalThis.Response> {
    const {
      timeout = this.isSimulator ? 15000 : 10000, // Longer timeout for simulator
      retries = this.isSimulator ? 5 : 3, // More retries for simulator
      retryDelay = 1000,
      fallbackUrls = [],
      ...fetchOptions
    } = options;

    // Check network connectivity first
    await this.ensureNetworkConnectivity();

    const urls = [url, ...fallbackUrls];
    let lastError: Error = new Error('All fetch attempts failed');

    for (const currentUrl of urls) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Add simulator-specific headers
          const enhancedOptions = this.enhanceOptionsForSimulator(fetchOptions);

          const response = await this.fetchWithTimeout(currentUrl, enhancedOptions, timeout);

          // Success - log and return
          if (attempt > 0) {
            logger.debug('Network request succeeded after retry', {
              url: currentUrl,
              attempt: attempt + 1,
              status: response.status,
              isSimulator: this.isSimulator,
            });
          }

          return response;
        } catch (error) {
          lastError = error as Error;

          logger.debug('Network request failed', {
            url: currentUrl,
            attempt: attempt + 1,
            error: lastError.message,
            isSimulator: this.isSimulator,
            networkState: this.networkState,
          });

          // Don't retry on client errors (4xx)
          if (this.isClientError(error)) {
            throw error;
          }

          // Wait before retry (with jitter for simulator)
          if (attempt < retries) {
            const delay = this.calculateRetryDelay(attempt, retryDelay);
            await this.sleep(delay);
          }
        }
      }
    }

    // All attempts failed
    throw this.enhanceErrorForSimulator(lastError, url);
  }

  /**
   * Ensure network connectivity with simulator-specific checks
   */
  private static async ensureNetworkConnectivity(): Promise<void> {
    if (!this.isSimulator) {
      return; // Skip for real devices
    }

    try {
      // Quick connectivity test for simulator
      const testResponse = await this.fetchWithTimeout(
        'https://httpbin.org/status/200',
        { method: 'HEAD' },
        5000
      );

      if (!testResponse.ok) {
        throw new Error('Simulator network connectivity test failed');
      }
    } catch (error) {
      logger.warn('Simulator connectivity issue detected:', {
        error: (error as Error).message,
        advice: 'Try restarting simulator or checking Mac network connection',
      });

      // Don't throw - let the actual request attempt
    }
  }

  /**
   * Fetch with timeout support
   */
  private static async fetchWithTimeout(
    url: string,
    options: globalThis.RequestInit,
    timeout: number
  ): Promise<globalThis.Response> {
    const controller = new globalThis.AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if ((error as Error).name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Enhance fetch options for simulator environment
   */
  private static enhanceOptionsForSimulator(
    options: globalThis.RequestInit
  ): globalThis.RequestInit {
    if (!this.isSimulator) {
      return options;
    }

    return {
      ...options,
      headers: {
        'User-Agent': 'YeserApp/1.0 (iOS Simulator)',
        Accept: 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        ...options.headers,
      },
      // Simulator-specific optimizations
      keepalive: false, // Disable keep-alive in simulator
      cache: 'no-cache', // Prevent cache issues
    };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private static calculateRetryDelay(attempt: number, baseDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add jitter for simulator
    const maxDelay = this.isSimulator ? 8000 : 5000;

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Check if error is a client error (4xx)
   */
  private static isClientError(error: unknown): boolean {
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      return status >= 400 && status < 500;
    }
    return false;
  }

  /**
   * Enhance error with simulator-specific advice
   */
  private static enhanceErrorForSimulator(error: Error, url: string): Error {
    if (!this.isSimulator) {
      return error;
    }

    const enhancedError = new Error(
      `${error.message}\n\n🔧 iOS Simulator Network Troubleshooting:\n` +
        '• Reset Simulator: Device → Erase All Content and Settings\n' +
        '• Restart Simulator: Hardware → Restart\n' +
        '• Check Mac network connection\n' +
        '• Try: npx expo start --clear\n' +
        `• Test URL in Safari: ${url}`
    );

    enhancedError.name = 'SimulatorNetworkError';
    enhancedError.stack = error.stack;

    return enhancedError;
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test network connectivity to common endpoints
   */
  static async testConnectivity(): Promise<{
    canReachGoogle: boolean;
    canReachSupabase: boolean;
    networkState: NetworkState;
    recommendations: string[];
  }> {
    const results = {
      canReachGoogle: false,
      canReachSupabase: false,
      networkState: this.networkState,
      recommendations: [] as string[],
    };

    // Test Google connectivity
    try {
      await this.fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 5000,
        retries: 1,
      });
      results.canReachGoogle = true;
    } catch (error) {
      logger.debug('Google connectivity test failed', {
        extra: { error: (error as Error).message },
      });
    }

    // Test Supabase connectivity
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        await this.fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          },
          timeout: 5000,
          retries: 1,
        });
        results.canReachSupabase = true;
      }
    } catch (error) {
      logger.debug('Supabase connectivity test failed', {
        extra: { error: (error as Error).message },
      });
    }

    // Generate recommendations
    if (!results.canReachGoogle && !results.canReachSupabase) {
      results.recommendations.push(
        'Complete network failure detected',
        'Check Mac internet connection',
        'Restart iOS Simulator',
        'Reset Network Settings in Simulator'
      );
    } else if (!results.canReachSupabase) {
      results.recommendations.push(
        'Supabase connectivity issue',
        'Check environment variables',
        'Verify Supabase project status'
      );
    }

    return results;
  }
}

// Initialize on import
RobustFetch.initialize();

// Export convenience method
export const robustFetch = RobustFetch.fetch.bind(RobustFetch);
export const testNetworkConnectivity = RobustFetch.testConnectivity.bind(RobustFetch);
