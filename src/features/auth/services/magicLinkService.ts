import { logger } from '@/utils/debugConfig';
import i18n from '@/i18n';
import { analyticsService } from '@/services/analyticsService';
import * as authService from '@/services/authService';
import { AUTH_CONSTANTS, MagicLinkRequest } from '../utils/authConstants';
import {
  canSendMagicLink,
  getMagicLinkCooldownRemaining,
  validateMagicLinkCredentials,
} from '../utils/authValidation';
import { atomicOperationManager } from '../utils/atomicOperations';
import { PerformanceProfiler } from '@/utils/performanceProfiler';
import { FEATURE_FLAGS, getUserOptimizationTier } from '@/utils/featureFlags';
import {
  convertToModernCallbacks,
  isLegacyCallbacks,
  LegacyMagicLinkCallbacks,
  MagicLinkCallbacks,
} from '../types/magicLinkTypes';

import type { MagicLinkCredentials } from '@/services/authService';

/**
 * Magic Link Service
 * Handles all magic link authentication operations including:
 * - Sending magic links with rate limiting
 * - Confirming magic links
 * - Queue management for concurrent requests
 * - Rate limiting and validation
 */
export class MagicLinkService {
  private magicLinkQueue: MagicLinkRequest[] = [];
  private isProcessingQueue = false;
  private lastSuccessfulMagicLinkTime: number | null = null;
  private queueProcessingTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  /**
   * Send magic link with rate limiting and optimized processing
   * PERFORMANCE OPTIMIZED: Single requests process immediately, only queue when concurrent
   */
  async sendMagicLink(
    credentials: MagicLinkCredentials,
    onSuccess: (message: string) => void,
    onError: (error: Error) => void,
    setLoading: (loading: boolean) => void,
    setMagicLinkSent: (sent: boolean) => void
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Validate credentials first
      const validation = validateMagicLinkCredentials(credentials);
      if (!validation.isValid) {
        const error = new Error(validation.error || 'Invalid credentials');
        onError(error);
        reject(error);
        return;
      }

      // Check rate limiting
      if (!this.canSendMagicLink()) {
        const remainingTime = this.getMagicLinkCooldownRemaining();
        const error = new Error(i18n.t('auth.services.waitSeconds', { seconds: remainingTime }));
        onError(error);
        reject(error);
        return;
      }

      const request: MagicLinkRequest = {
        credentials: {
          ...credentials,
          email: validation.sanitizedEmail || credentials.email,
        },
        promise: { resolve, reject },
        callbacks: {
          onSuccess,
          onError,
          setLoading,
          setMagicLinkSent,
        },
        timestamp: Date.now(),
      };

      // PERFORMANCE OPTIMIZATION: Process immediately if no queue and not processing
      if (!this.isProcessingQueue && this.magicLinkQueue.length === 0) {
        // Process immediately for better responsiveness
        this.processRequestImmediately(request);
      } else {
        // Add to queue only if there's already processing or other requests
        this.magicLinkQueue.push(request);

        // Start processing if not already processing
        if (!this.isProcessingQueue) {
          this.processMagicLinkQueue();
        }
      }
    });
  }

  /**
   * Confirm magic link token
   */
  async confirmMagicLink(
    tokenHash: string,
    type: string = 'magiclink',
    onSuccess: (message: string) => void,
    onError: (error: Error) => void,
    setLoading: (loading: boolean) => void,
    setMagicLinkSent: (sent: boolean) => void
  ): Promise<{ user: unknown; session: unknown } | null> {
    const operationKey = `confirm_magic_link_${tokenHash.slice(-8)}`;

    try {
      return await atomicOperationManager.ensureAtomicOperation(
        operationKey,
        'confirm_magic_link',
        async () => {
          setLoading(true);

          try {
            const { user, session, error } = await authService.confirmMagicLink(tokenHash, type);

            if (error) {
              setLoading(false);
              setMagicLinkSent(false); // Reset so user can request new link
              onError(error instanceof Error ? error : new Error(String(error)));
              return null;
            } else if (user && session) {
              setLoading(false);

              logger.debug(
                'Magic link confirmed successfully - relying on auth listener for state update',
                {
                  userId: session.user?.id,
                  hasSession: !!session,
                }
              );

              onSuccess(i18n.t('auth.login.toasts.loginSuccess'));
              return { user, session };
            } else {
              setLoading(false);
              setMagicLinkSent(false);
              const error = new Error(i18n.t('auth.services.magicLink.invalidLink'));
              onError(error);
              return null;
            }
          } catch (error) {
            setLoading(false);
            setMagicLinkSent(false);
            onError(error instanceof Error ? error : new Error(String(error)));
            return null;
          }
        }
      );
    } catch (error) {
      // Handle atomic operation conflicts (duplicate token confirmation)
      logger.debug('Magic link confirmation already in progress', {
        tokenHash: tokenHash.slice(-8),
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Check if magic link can be sent (rate limiting)
   */
  canSendMagicLink(): boolean {
    return canSendMagicLink(this.lastSuccessfulMagicLinkTime);
  }

  /**
   * Get remaining cooldown time in seconds
   */
  getMagicLinkCooldownRemaining(): number {
    return getMagicLinkCooldownRemaining(this.lastSuccessfulMagicLinkTime);
  }

  /**
   * Get current queue status for monitoring
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    lastRequestTime: number | null;
    canSendNow: boolean;
  } {
    return {
      queueLength: this.magicLinkQueue.length,
      isProcessing: this.isProcessingQueue,
      lastRequestTime: this.lastSuccessfulMagicLinkTime,
      canSendNow: this.canSendMagicLink(),
    };
  }

  /**
   * Reset magic link sent state (for UI management)
   */
  resetState(): void {
    // Don't reset lastSuccessfulMagicLinkTime to maintain rate limiting
    // Only reset queue state if needed
    if (!this.isProcessingQueue && this.magicLinkQueue.length === 0) {
      logger.debug('Magic link service state reset');
    }
  }

  /**
   * 🚀 Phase 2: Optimized Magic Link with Unified Callbacks
   *
   * Feature-flagged optimized implementation that reduces callback overhead
   * while maintaining 100% backward compatibility
   */
  async sendMagicLinkOptimized(
    credentials: MagicLinkCredentials,
    callbacks: MagicLinkCallbacks | LegacyMagicLinkCallbacks
  ): Promise<void> {
    const optimizationTier = getUserOptimizationTier(credentials.email);

    // Fallback to existing implementation if optimizations are disabled
    if (optimizationTier === 'legacy' || !FEATURE_FLAGS.OPTIMIZED_MAGIC_LINK_V1) {
      return this.sendMagicLinkLegacyFallback(credentials, callbacks);
    }

    // Use optimized implementation
    return this.sendMagicLinkOptimizedInternal(credentials, callbacks, optimizationTier);
  }

  /**
   * Legacy fallback method that uses the original implementation
   */
  private async sendMagicLinkLegacyFallback(
    credentials: MagicLinkCredentials,
    callbacks: MagicLinkCallbacks | LegacyMagicLinkCallbacks
  ): Promise<void> {
    if (isLegacyCallbacks(callbacks)) {
      // Use original method with legacy callbacks
      return this.sendMagicLink(
        credentials,
        callbacks.onSuccess,
        callbacks.onError,
        callbacks.setLoading,
        callbacks.setMagicLinkSent
      );
    } else {
      // Convert modern callbacks to legacy format for original method
      const legacyCallbacks = {
        onSuccess: callbacks.onSuccess,
        onError: callbacks.onError,
        setLoading: (loading: boolean) =>
          callbacks.onStateChange({ isLoading: loading, magicLinkSent: false }),
        setMagicLinkSent: (sent: boolean) =>
          callbacks.onStateChange({ isLoading: false, magicLinkSent: sent }),
      };

      return this.sendMagicLink(
        credentials,
        legacyCallbacks.onSuccess,
        legacyCallbacks.onError,
        legacyCallbacks.setLoading,
        legacyCallbacks.setMagicLinkSent
      );
    }
  }

  /**
   * Internal optimized implementation with performance tracking
   */
  private async sendMagicLinkOptimizedInternal(
    credentials: MagicLinkCredentials,
    callbacks: MagicLinkCallbacks | LegacyMagicLinkCallbacks,
    optimizationTier: 'v1' | 'v2'
  ): Promise<void> {
    const endTimer = PerformanceProfiler.startTimer('magic_link_optimized_v1', {
      tier: optimizationTier,
      email: credentials.email.charAt(0) + '***',
    });

    // Convert to unified callbacks if needed
    const unifiedCallbacks = isLegacyCallbacks(callbacks)
      ? convertToModernCallbacks(callbacks)
      : callbacks;

    try {
      if (optimizationTier === 'v2') {
        // Phase 3: Single atomic operation (no store-level atomic overhead)
        await this.sendMagicLinkSingleAtomic(credentials, unifiedCallbacks);
      } else {
        // Phase 2: Optimized callbacks but dual atomic operations
        await this.sendMagicLinkWithOptimizedCallbacks(credentials, unifiedCallbacks);
      }
    } finally {
      endTimer();
    }
  }

  /**
   * Phase 2: Optimized with unified callbacks but dual atomic operations
   */
  private async sendMagicLinkWithOptimizedCallbacks(
    credentials: MagicLinkCredentials,
    callbacks: MagicLinkCallbacks
  ): Promise<void> {
    const operationKey = `magic_link_${credentials.email}`;

    await atomicOperationManager.ensureAtomicOperation(
      operationKey,
      'magic_link_send',
      async () => {
        const endCallbackTimer = PerformanceProfiler.startTimer('magic_link_callback_overhead');

        // Single state update: loading start
        callbacks.onStateChange({ isLoading: true, magicLinkSent: false });

        try {
          // Validation and rate limiting
          const validation = validateMagicLinkCredentials(credentials);
          if (!validation.isValid) {
            callbacks.onStateChange({ isLoading: false, magicLinkSent: false });
            callbacks.onError(new Error(validation.error || 'Invalid credentials'));
            return;
          }

          if (!this.canSendMagicLink()) {
            const remainingTime = this.getMagicLinkCooldownRemaining();
            callbacks.onStateChange({ isLoading: false, magicLinkSent: false });
            callbacks.onError(
              new Error(i18n.t('auth.services.waitSeconds', { seconds: remainingTime }))
            );
            return;
          }

          // API call with timing
          const endApiTimer = PerformanceProfiler.startTimer('magic_link_api_call');
          const { error } = await authService.signInWithMagicLink({
            ...credentials,
            email: validation.sanitizedEmail || credentials.email,
          });
          endApiTimer();

          if (error) {
            callbacks.onStateChange({ isLoading: false, magicLinkSent: false });
            callbacks.onError(error instanceof Error ? error : new Error(String(error)));
          } else {
            this.lastSuccessfulMagicLinkTime = Date.now();
            // Single state update: success
            callbacks.onStateChange({ isLoading: false, magicLinkSent: true });
            callbacks.onSuccess(i18n.t('auth.services.magicLink.linkSent'));

            analyticsService.logEvent('magic_link_sent', {
              email: credentials.email.charAt(0) + '***',
              optimization: 'v1',
            });
          }
        } catch (error) {
          callbacks.onStateChange({ isLoading: false, magicLinkSent: false });
          callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        }

        endCallbackTimer();
      }
    );
  }

  /**
   * 🚀 Phase 3: Single Atomic Operation (Maximum Performance)
   *
   * Eliminates store-level atomic operation overhead by handling
   * everything at the service level
   */
  private async sendMagicLinkSingleAtomic(
    credentials: MagicLinkCredentials,
    callbacks: MagicLinkCallbacks
  ): Promise<void> {
    const operationKey = `magic_link_service_${credentials.email}`;

    return atomicOperationManager.ensureAtomicOperation(
      operationKey,
      'magic_link_send',
      async () => {
        const endTimer = PerformanceProfiler.startTimer('magic_link_single_atomic');

        // Fast validation
        const validation = validateMagicLinkCredentials(credentials);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid credentials');
        }

        // Fast rate limiting check
        if (!this.canSendMagicLink()) {
          const remainingTime = this.getMagicLinkCooldownRemaining();
          throw new Error(i18n.t('auth.services.waitSeconds', { seconds: remainingTime }));
        }

        // Single state update: loading start
        callbacks.onStateChange({ isLoading: true, magicLinkSent: false });

        try {
          // API call (main bottleneck - unavoidable)
          const endApiTimer = PerformanceProfiler.startTimer('magic_link_api_only');
          const { error } = await authService.signInWithMagicLink({
            ...credentials,
            email: validation.sanitizedEmail || credentials.email,
          });
          endApiTimer();

          if (error) {
            callbacks.onStateChange({ isLoading: false, magicLinkSent: false });
            callbacks.onError(error instanceof Error ? error : new Error(String(error)));
          } else {
            this.lastSuccessfulMagicLinkTime = Date.now();
            callbacks.onStateChange({ isLoading: false, magicLinkSent: true });
            callbacks.onSuccess(i18n.t('auth.services.magicLink.linkSent'));

            analyticsService.logEvent('magic_link_sent', {
              email: credentials.email.charAt(0) + '***',
              optimization: 'v2',
            });
          }
        } catch (error) {
          callbacks.onStateChange({ isLoading: false, magicLinkSent: false });
          callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        }

        endTimer();
      }
    );
  }

  /**
   * PERFORMANCE OPTIMIZATION: Process a single request immediately without queue overhead
   */
  private async processRequestImmediately(request: MagicLinkRequest): Promise<void> {
    const endTimer = PerformanceProfiler.startTimer('magic_link_immediate_total', {
      email: request.credentials.email.charAt(0) + '***',
    });

    this.isProcessingQueue = true;
    const { onSuccess, onError, setLoading, setMagicLinkSent } = request.callbacks;

    try {
      // Atomic rate limit check (same logic as queue processing)
      const now = Date.now();
      if (this.lastSuccessfulMagicLinkTime) {
        const timeSinceLastRequest = now - this.lastSuccessfulMagicLinkTime;
        if (timeSinceLastRequest < AUTH_CONSTANTS.MAGIC_LINK_COOLDOWN_MS) {
          const remainingTime = Math.ceil(
            (AUTH_CONSTANTS.MAGIC_LINK_COOLDOWN_MS - timeSinceLastRequest) / 1000
          );
          throw new Error(
            i18n.isInitialized
              ? i18n.t('auth.services.rateLimitMessage', { remainingTime })
              : `Please wait ${remainingTime} seconds and try again.`
          );
        }
      }

      setLoading(true);
      setMagicLinkSent(false);

      const { error } = await authService.signInWithMagicLink(request.credentials);

      if (error) {
        setLoading(false);
        setMagicLinkSent(false);
        const errorObj = error instanceof Error ? error : new Error(String(error));
        onError(errorObj);
        request.promise.reject(errorObj);
      } else {
        // Update timestamp only on successful request
        this.lastSuccessfulMagicLinkTime = now;
        setLoading(false);
        setMagicLinkSent(true);

        const successMessage = i18n.t('auth.services.magicLink.linkSent');
        onSuccess(successMessage);
        request.promise.resolve();

        // Track successful magic link send
        analyticsService.logEvent('magic_link_sent', {
          email: request.credentials.email.charAt(0) + '***', // Masked email
        });
      }
    } catch (error) {
      setLoading(false);
      setMagicLinkSent(false);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError(errorObj);
      request.promise.reject(errorObj);
    } finally {
      this.isProcessingQueue = false;
      endTimer();
    }
  }

  /**
   * Process magic link queue using each request's own callbacks
   */
  private async processMagicLinkQueue(): Promise<void> {
    if (this.isProcessingQueue || this.magicLinkQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const request = this.magicLinkQueue.shift();

    // Safety check
    if (!request) {
      this.isProcessingQueue = false;
      return;
    }

    // Use this request's own callbacks instead of shared ones
    const { onSuccess, onError, setLoading, setMagicLinkSent } = request.callbacks;

    try {
      // Atomic rate limit check
      const now = Date.now();
      if (this.lastSuccessfulMagicLinkTime) {
        const timeSinceLastRequest = now - this.lastSuccessfulMagicLinkTime;
        if (timeSinceLastRequest < AUTH_CONSTANTS.MAGIC_LINK_COOLDOWN_MS) {
          const remainingTime = Math.ceil(
            (AUTH_CONSTANTS.MAGIC_LINK_COOLDOWN_MS - timeSinceLastRequest) / 1000
          );
          throw new Error(
            i18n.isInitialized
              ? i18n.t('auth.services.rateLimitMessage', { remainingTime })
              : `Please wait ${remainingTime} seconds and try again.`
          );
        }
      }

      setLoading(true);
      setMagicLinkSent(false);

      const { error } = await authService.signInWithMagicLink(request.credentials);

      if (error) {
        setLoading(false);
        setMagicLinkSent(false);
        const errorObj = error instanceof Error ? error : new Error(String(error));
        onError(errorObj);
        request.promise.reject(errorObj);
      } else {
        // Update timestamp only on successful request
        this.lastSuccessfulMagicLinkTime = now;
        setLoading(false);
        setMagicLinkSent(true);

        const successMessage = i18n.isInitialized
          ? i18n.t('auth.services.magicLinkSent')
          : 'Sign-in link has been sent to your email!';
        onSuccess(successMessage);
        request.promise.resolve();

        // Track successful magic link send
        analyticsService.logEvent('magic_link_sent', {
          email: request.credentials.email.charAt(0) + '***', // Masked email
        });
      }
    } catch (error) {
      setLoading(false);
      setMagicLinkSent(false);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      onError(errorObj);
      request.promise.reject(errorObj);
    } finally {
      this.isProcessingQueue = false;

      // Clear existing timeout before setting new one
      if (this.queueProcessingTimeoutRef) {
        clearTimeout(this.queueProcessingTimeoutRef);
        this.queueProcessingTimeoutRef = null;
      }

      // Process next request in queue after short delay
      if (this.magicLinkQueue.length > 0) {
        this.queueProcessingTimeoutRef = setTimeout(() => {
          this.processMagicLinkQueue();
          this.queueProcessingTimeoutRef = null;
        }, AUTH_CONSTANTS.QUEUE_PROCESSING_DELAY_MS);
      }
    }
  }

  /**
   * Cleanup method for testing/reset
   */
  cleanup(): void {
    this.magicLinkQueue.length = 0;
    this.isProcessingQueue = false;

    if (this.queueProcessingTimeoutRef) {
      clearTimeout(this.queueProcessingTimeoutRef);
      this.queueProcessingTimeoutRef = null;
    }

    // Don't reset lastSuccessfulMagicLinkTime to maintain rate limiting across cleanup
    logger.debug('Magic link service cleaned up');
  }
}

// Export singleton instance
export const magicLinkService = new MagicLinkService();
