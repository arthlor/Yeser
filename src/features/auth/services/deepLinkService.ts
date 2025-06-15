import { logger } from '@/utils/debugConfig';
import { analyticsService } from '@/services/analyticsService';
import { AUTH_CONSTANTS, QueuedOTPToken, UrlProcessingState } from '../utils/authConstants';

// Add OAuth token interface with security improvements
interface QueuedOAuthToken {
  accessToken: string;
  refreshToken: string;
  timestamp: number;
  url: string;
}

// Constants for memory management
const MAX_URL_PROCESSING_ENTRIES = 100;
const MAX_TOKEN_QUEUE_SIZE = 50;
const PERIODIC_CLEANUP_INTERVAL = 60000; // 1 minute

/**
 * Deep Link Service
 * Handles all auth-related deep link processing including:
 * - Magic link confirmation
 * - OTP token queuing for cold start scenarios
 * - OAuth token queuing for cold start scenarios
 * - URL processing state management
 * - Race condition prevention
 * - Enhanced memory leak prevention
 */
export class DeepLinkService {
  private otpTokenQueue: QueuedOTPToken[] = [];
  private oAuthTokenQueue: QueuedOAuthToken[] = [];
  private isProcessingQueue = false;

  // URL processing state management with enhanced cleanup
  private urlProcessingMap = new Map<string, UrlProcessingState>();
  private cleanupTimeoutRefs = new Map<string, ReturnType<typeof setTimeout>>();

  // Periodic cleanup timer
  private periodicCleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic cleanup to prevent memory leaks
    this.startPeriodicCleanup();
  }

  /**
   * Start periodic cleanup to prevent memory accumulation
   */
  private startPeriodicCleanup(): void {
    if (this.periodicCleanupTimer) {
      clearInterval(this.periodicCleanupTimer);
    }

    this.periodicCleanupTimer = setInterval(() => {
      this.performPeriodicCleanup();
    }, PERIODIC_CLEANUP_INTERVAL);
  }

  /**
   * Comprehensive periodic cleanup to prevent memory leaks
   */
  private performPeriodicCleanup(): void {
    try {
      const now = Date.now();
      let urlEntriesRemoved = 0;
      let timeoutsCleared = 0;

      // Clean up expired URL processing entries
      for (const [url, state] of this.urlProcessingMap.entries()) {
        if (now - state.timestamp > AUTH_CONSTANTS.URL_PROCESSING_CACHE_MS) {
          this.urlProcessingMap.delete(url);
          urlEntriesRemoved++;

          // Clear associated timeout
          const timeoutRef = this.cleanupTimeoutRefs.get(url);
          if (timeoutRef) {
            clearTimeout(timeoutRef);
            this.cleanupTimeoutRefs.delete(url);
            timeoutsCleared++;
          }
        }
      }

      // Enforce maximum size limits as safety nets
      if (this.urlProcessingMap.size > MAX_URL_PROCESSING_ENTRIES) {
        // Remove oldest entries if we exceed limit
        const entries = Array.from(this.urlProcessingMap.entries()).sort(
          ([, a], [, b]) => a.timestamp - b.timestamp
        );

        const entriesToRemove = entries.slice(
          0,
          this.urlProcessingMap.size - MAX_URL_PROCESSING_ENTRIES
        );
        for (const [url] of entriesToRemove) {
          this.urlProcessingMap.delete(url);
          const timeoutRef = this.cleanupTimeoutRefs.get(url);
          if (timeoutRef) {
            clearTimeout(timeoutRef);
            this.cleanupTimeoutRefs.delete(url);
          }
        }
        urlEntriesRemoved += entriesToRemove.length;
      }

      // Clean up token queues and enforce size limits
      this.cleanupExpiredTokens();
      this.enforceTokenQueueLimits();

      if (urlEntriesRemoved > 0 || timeoutsCleared > 0) {
        logger.debug('[CLEANUP] Periodic cleanup completed', {
          urlEntriesRemoved,
          timeoutsCleared,
          remainingUrlEntries: this.urlProcessingMap.size,
          remainingTimeouts: this.cleanupTimeoutRefs.size,
        });
      }
    } catch (error) {
      logger.error('[CLEANUP] Error during periodic cleanup:', error as Error);
    }
  }

  /**
   * Enforce maximum token queue sizes to prevent unbounded growth
   */
  private enforceTokenQueueLimits(): void {
    if (this.otpTokenQueue.length > MAX_TOKEN_QUEUE_SIZE) {
      // Keep only the most recent tokens
      this.otpTokenQueue = this.otpTokenQueue.slice(-MAX_TOKEN_QUEUE_SIZE);
      logger.warn('[CLEANUP] OTP token queue size exceeded limit, trimmed to recent tokens');
    }

    if (this.oAuthTokenQueue.length > MAX_TOKEN_QUEUE_SIZE) {
      // Clear older OAuth tokens immediately for security
      this.clearOAuthTokens(this.oAuthTokenQueue.slice(0, -MAX_TOKEN_QUEUE_SIZE));
      this.oAuthTokenQueue = this.oAuthTokenQueue.slice(-MAX_TOKEN_QUEUE_SIZE);
      logger.warn('[CLEANUP] OAuth token queue size exceeded limit, trimmed to recent tokens');
    }
  }

  /**
   * Securely clear OAuth tokens from memory
   */
  private clearOAuthTokens(tokens: QueuedOAuthToken[]): void {
    for (const token of tokens) {
      // Overwrite token strings with empty values for security
      token.accessToken = '';
      token.refreshToken = '';
    }
  }

  /**
   * Main deep link handler - processes auth callback URLs
   */
  async handleAuthCallback(url: string, databaseReady: boolean = false): Promise<void> {
    try {
      logger.debug('Deep link received:', { url, databaseReady });

      // Prevent duplicate processing
      if (!this.atomicUrlProcessingCheck(url)) {
        return;
      }

      // Parse the URL with error protection
      const parsedUrl = new URL(url);

      // Check if it's a magic link confirmation
      if (this.isMagicLinkPath(parsedUrl.pathname)) {
        logger.debug('Magic link path detected');
        await this.processMagicLinkCallback(parsedUrl, url, databaseReady);
      } else {
        logger.debug('Not a magic link path:', { pathname: parsedUrl.pathname });
      }
    } catch (error) {
      logger.error('Error processing auth callback:', error as Error);
      analyticsService.logEvent('deep_link_error', { error: (error as Error).message });
    } finally {
      this.markUrlProcessingCompleted(url);
    }
  }

  /**
   * Process queued tokens when database becomes ready
   * Now handles both OTP and OAuth tokens with consistent queueing
   */
  async processQueuedTokens(): Promise<void> {
    if (this.isProcessingQueue) {
      logger.debug('[TOKEN QUEUE] Token processing already in progress');
      return;
    }

    this.isProcessingQueue = true;
    const now = Date.now();

    try {
      logger.debug('[TOKEN QUEUE] Processing queued tokens', {
        otpTokens: this.otpTokenQueue.length,
        oAuthTokens: this.oAuthTokenQueue.length,
      });

      // Process OTP tokens first
      while (this.otpTokenQueue.length > 0) {
        const token = this.otpTokenQueue.shift();
        if (!token) {
          break;
        }

        // Check if token has expired
        if (now - token.timestamp > AUTH_CONSTANTS.TOKEN_EXPIRY_MS) {
          logger.warn('[OTP QUEUE] OTP token expired, skipping', {
            age: now - token.timestamp,
            url: token.url,
          });
          continue;
        }

        try {
          logger.debug('[OTP QUEUE] Processing OTP token from queue');
          const { useMagicLinkStore } = await import('../store/magicLinkStore');
          const magicLinkStore = useMagicLinkStore.getState();
          await magicLinkStore.confirmMagicLink(token.tokenHash, token.type);
          logger.debug('[OTP QUEUE] OTP token processed successfully');
          analyticsService.logEvent('otp_queue_success');
          break; // Only process one token at a time
        } catch (error) {
          logger.error('[OTP QUEUE] Failed to process OTP token:', error as Error);
          analyticsService.logEvent('otp_queue_error', { error: (error as Error).message });
        }
      }

      // Process OAuth tokens
      while (this.oAuthTokenQueue.length > 0) {
        const token = this.oAuthTokenQueue.shift();
        if (!token) {
          break;
        }

        // Check if token has expired
        if (now - token.timestamp > AUTH_CONSTANTS.TOKEN_EXPIRY_MS) {
          logger.warn('[OAUTH QUEUE] OAuth token expired, skipping', {
            age: now - token.timestamp,
            url: token.url,
          });
          // Securely clear expired token
          this.clearOAuthTokens([token]);
          continue;
        }

        try {
          logger.debug('[OAUTH QUEUE] Processing OAuth token from queue');
          const { useCoreAuthStore } = await import('../store/coreAuthStore');
          await useCoreAuthStore
            .getState()
            .setSessionFromTokens(token.accessToken, token.refreshToken);
          logger.debug('[OAUTH QUEUE] OAuth token processed successfully');
          analyticsService.logEvent('oauth_queue_success');

          // SECURITY: Immediately clear token after successful use
          this.clearOAuthTokens([token]);
          break; // Only process one token at a time
        } catch (error) {
          logger.error('[OAUTH QUEUE] Failed to process OAuth token:', error as Error);
          analyticsService.logEvent('oauth_queue_error', { error: (error as Error).message });
          // Clear failed token for security
          this.clearOAuthTokens([token]);
        }
      }

      // Clean up expired tokens
      this.cleanupExpiredTokens();
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Get current queue status (for debugging/monitoring)
   */
  getQueueStatus(): {
    otpTokens: number;
    oAuthTokens: number;
    isProcessing: boolean;
    oldestToken?: number;
  } {
    const allTokenTimestamps = [
      ...this.otpTokenQueue.map((t) => t.timestamp),
      ...this.oAuthTokenQueue.map((t) => t.timestamp),
    ];

    const oldestToken = allTokenTimestamps.length > 0 ? Math.min(...allTokenTimestamps) : undefined;

    return {
      otpTokens: this.otpTokenQueue.length,
      oAuthTokens: this.oAuthTokenQueue.length,
      isProcessing: this.isProcessingQueue,
      oldestToken,
    };
  }

  /**
   * Check if a pathname indicates a magic link callback
   */
  private isMagicLinkPath(pathname: string): boolean {
    return ['/auth/callback', '/auth/confirm', '/confirm', '/callback'].includes(pathname);
  }

  /**
   * Process magic link callback and extract tokens
   */
  private async processMagicLinkCallback(
    parsedUrl: URL,
    originalUrl: string,
    databaseReady: boolean
  ): Promise<void> {
    // Extract tokens from URL fragment or query parameters
    const fragment = parsedUrl.hash.substring(1); // Remove the # character
    const fragmentParams = new URLSearchParams(fragment);
    const queryParams = parsedUrl.searchParams;

    // Check for OAuth-style tokens (access_token + refresh_token)
    const accessToken = fragmentParams.get('access_token') || queryParams.get('access_token');
    const refreshToken = fragmentParams.get('refresh_token') || queryParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Handle OAuth-style tokens with robust queueing
      if (databaseReady) {
        logger.debug('OAuth tokens found, processing immediately');
        try {
          const { useCoreAuthStore } = await import('../store/coreAuthStore');
          const coreAuthStore = useCoreAuthStore.getState();
          await coreAuthStore.setSessionFromTokens(accessToken, refreshToken);
          logger.debug('OAuth token authentication completed successfully');
          analyticsService.logEvent('oauth_tokens_processed');

          // SECURITY: Clear tokens from URL parameters after successful processing
          // Note: We can't modify the original URL, but we avoid storing it longer than necessary
        } catch (error) {
          logger.error('OAuth token authentication failed:', {
            error: (error as Error).message,
          });
          analyticsService.logEvent('oauth_tokens_error', { error: (error as Error).message });
        }
      } else {
        // Database not ready - queue OAuth tokens (consistent with OTP handling)
        logger.debug('[OAUTH QUEUE] Database not ready, queueing OAuth tokens');
        const queuedToken = {
          accessToken,
          refreshToken,
          timestamp: Date.now(),
          url: originalUrl,
        };

        // Enforce queue size limit for security
        if (this.oAuthTokenQueue.length >= MAX_TOKEN_QUEUE_SIZE) {
          // Remove oldest token and clear it securely
          const oldestToken = this.oAuthTokenQueue.shift();
          if (oldestToken) {
            this.clearOAuthTokens([oldestToken]);
          }
        }

        this.oAuthTokenQueue.push(queuedToken);
        analyticsService.logEvent('oauth_token_queued');

        logger.debug('[OAUTH QUEUE] OAuth tokens queued for processing when database ready');
      }
      return;
    }

    // Handle OTP-style tokens (fallback for traditional magic links)
    const tokenHash =
      fragmentParams.get('token_hash') ||
      fragmentParams.get('token') ||
      queryParams.get('token_hash') ||
      queryParams.get('token');

    const type = fragmentParams.get('type') || queryParams.get('type') || 'magiclink';

    if (tokenHash) {
      if (databaseReady) {
        // Database is ready, process immediately using MODERN STORE for consistency
        try {
          // 🔥 CRITICAL FIX: Use modern magicLinkStore instead of legacy authStore
          const { useMagicLinkStore } = await import('../store/magicLinkStore');
          const magicLinkStore = useMagicLinkStore.getState();

          await magicLinkStore.confirmMagicLink(tokenHash, type);
          logger.debug('OTP magic link authentication completed successfully via modern store');
          analyticsService.logEvent('magic_link_clicked', { type });
        } catch (error) {
          logger.error('OTP magic link authentication failed:', {
            error: (error as Error).message,
          });
          analyticsService.logEvent('magic_link_otp_error', { error: (error as Error).message });
        }
      } else {
        // Database not ready, queue the token
        logger.debug('[OTP QUEUE] Database not ready, queueing OTP token');
        this.otpTokenQueue.push({
          tokenHash,
          type,
          timestamp: Date.now(),
          url: originalUrl,
        });
        analyticsService.logEvent('otp_token_queued');

        logger.debug('[OTP QUEUE] OTP token queued for processing when database ready');
      }
    } else {
      logger.error('No valid tokens found in magic link URL');
      analyticsService.logEvent('magic_link_invalid');
    }
  }

  /**
   * Atomic URL processing check to prevent duplicates
   */
  private atomicUrlProcessingCheck(url: string): boolean {
    try {
      const existingState = this.urlProcessingMap.get(url);
      const now = Date.now();

      // Check if URL is currently being processed
      if (existingState?.status === 'processing') {
        logger.debug('URL already being processed, ignoring duplicate:', { url });
        return false;
      }

      // Check if URL was recently completed (within cache time)
      if (
        existingState?.status === 'completed' &&
        now - existingState.timestamp < AUTH_CONSTANTS.URL_PROCESSING_CACHE_MS
      ) {
        logger.debug('URL recently processed, ignoring duplicate:', { url });
        return false;
      }

      // Mark URL as being processed atomically
      this.urlProcessingMap.set(url, { status: 'processing', timestamp: now });
      return true;
    } catch (error) {
      logger.error('Error in atomicUrlProcessingCheck:', { error: (error as Error).message, url });
      return false;
    }
  }

  /**
   * Mark URL processing as completed
   */
  private markUrlProcessingCompleted(url: string): void {
    try {
      this.urlProcessingMap.set(url, { status: 'completed', timestamp: Date.now() });

      // Clear existing timeout before setting new one
      const existingTimeout = this.cleanupTimeoutRefs.get(url);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Cleanup old entries to prevent memory leaks
      const timeoutRef = setTimeout(() => {
        const entry = this.urlProcessingMap.get(url);
        if (
          entry?.status === 'completed' &&
          Date.now() - entry.timestamp > AUTH_CONSTANTS.URL_PROCESSING_CACHE_MS
        ) {
          this.urlProcessingMap.delete(url);
          this.cleanupTimeoutRefs.delete(url);
        }
      }, AUTH_CONSTANTS.URL_PROCESSING_CACHE_MS);

      this.cleanupTimeoutRefs.set(url, timeoutRef);
    } catch (error) {
      logger.error('Error in markUrlProcessingCompleted:', {
        error: (error as Error).message,
        url,
      });
    }
  }

  /**
   * Clean up expired tokens from both queues with security enhancements
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();

    // Clean OTP tokens
    const expiredOTPTokens = this.otpTokenQueue.filter(
      (token) => now - token.timestamp > AUTH_CONSTANTS.TOKEN_EXPIRY_MS
    );
    const validOTPTokens = this.otpTokenQueue.filter(
      (token) => now - token.timestamp <= AUTH_CONSTANTS.TOKEN_EXPIRY_MS
    );
    this.otpTokenQueue.length = 0;
    this.otpTokenQueue.push(...validOTPTokens);

    // Clean OAuth tokens with security clearing
    const expiredOAuthTokens = this.oAuthTokenQueue.filter(
      (token) => now - token.timestamp > AUTH_CONSTANTS.TOKEN_EXPIRY_MS
    );
    const validOAuthTokens = this.oAuthTokenQueue.filter(
      (token) => now - token.timestamp <= AUTH_CONSTANTS.TOKEN_EXPIRY_MS
    );

    // Securely clear expired OAuth tokens
    this.clearOAuthTokens(expiredOAuthTokens);

    this.oAuthTokenQueue.length = 0;
    this.oAuthTokenQueue.push(...validOAuthTokens);

    if (expiredOTPTokens.length > 0 || expiredOAuthTokens.length > 0) {
      logger.debug('[CLEANUP] Expired tokens cleaned up', {
        expiredOTP: expiredOTPTokens.length,
        expiredOAuth: expiredOAuthTokens.length,
      });
    }
  }

  /**
   * Force cleanup of all state (for testing/reset) with enhanced security
   */
  cleanup(): void {
    // Securely clear OAuth tokens before removing
    this.clearOAuthTokens(this.oAuthTokenQueue);

    this.otpTokenQueue.length = 0;
    this.oAuthTokenQueue.length = 0;
    this.isProcessingQueue = false;
    this.urlProcessingMap.clear();

    // Clear all timeout references
    for (const timeoutRef of this.cleanupTimeoutRefs.values()) {
      clearTimeout(timeoutRef);
    }
    this.cleanupTimeoutRefs.clear();

    // Stop periodic cleanup timer
    if (this.periodicCleanupTimer) {
      clearInterval(this.periodicCleanupTimer);
      this.periodicCleanupTimer = null;
    }

    logger.debug('[CLEANUP] Complete service cleanup performed');
  }
}

// Export singleton instance
export const deepLinkService = new DeepLinkService();
