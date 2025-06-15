import { logger } from '@/utils/debugConfig';
import { magicLinkService } from './magicLinkService';
import { deepLinkService } from './deepLinkService';

import type { MagicLinkCredentials } from '@/services/authService';

/**
 * Auth Coordinator Service
 * Coordinates different authentication flows and manages overall auth state.
 * Acts as a facade for different auth services and provides a unified API.
 */
export class AuthCoordinator {
  /**
   * Send magic link using the magic link service
   */
  async sendMagicLink(
    credentials: MagicLinkCredentials,
    callbacks: {
      onSuccess: (message: string) => void;
      onError: (error: Error) => void;
      setLoading: (loading: boolean) => void;
      setMagicLinkSent: (sent: boolean) => void;
    }
  ): Promise<void> {
    logger.debug('Auth coordinator: Initiating magic link send', {
      email: credentials.email.charAt(0) + '***',
    });

    return magicLinkService.sendMagicLink(
      credentials,
      callbacks.onSuccess,
      callbacks.onError,
      callbacks.setLoading,
      callbacks.setMagicLinkSent
    );
  }

  /**
   * Confirm magic link using the magic link service
   */
  async confirmMagicLink(
    tokenHash: string,
    type: string = 'magiclink',
    callbacks: {
      onSuccess: (message: string) => void;
      onError: (error: Error) => void;
      setLoading: (loading: boolean) => void;
      setMagicLinkSent: (sent: boolean) => void;
    }
  ): Promise<{ user: unknown; session: unknown } | null> {
    logger.debug('Auth coordinator: Confirming magic link', {
      tokenHash: tokenHash.slice(-8),
      type,
    });

    return magicLinkService.confirmMagicLink(
      tokenHash,
      type,
      callbacks.onSuccess,
      callbacks.onError,
      callbacks.setLoading,
      callbacks.setMagicLinkSent
    );
  }

  /**
   * Handle deep link authentication callback
   */
  async handleAuthCallback(url: string, databaseReady: boolean = false): Promise<void> {
    logger.debug('Auth coordinator: Handling auth callback', { url, databaseReady });
    return deepLinkService.handleAuthCallback(url, databaseReady);
  }

  /**
   * Process queued tokens when database becomes ready
   */
  async processQueuedTokens(): Promise<void> {
    logger.debug('Auth coordinator: Processing queued tokens');
    return deepLinkService.processQueuedTokens();
  }

  /**
   * Check if magic link can be sent (rate limiting)
   */
  canSendMagicLink(): boolean {
    return magicLinkService.canSendMagicLink();
  }

  /**
   * Get remaining cooldown time for magic link
   */
  getMagicLinkCooldownRemaining(): number {
    return magicLinkService.getMagicLinkCooldownRemaining();
  }

  /**
   * Get comprehensive auth status for monitoring/debugging
   */
  getAuthStatus(): {
    magicLink: {
      queueLength: number;
      isProcessing: boolean;
      lastRequestTime: number | null;
      canSendNow: boolean;
    };
    deepLink: {
      otpTokens: number;
      isProcessing: boolean;
      oldestToken?: number;
    };
  } {
    return {
      magicLink: magicLinkService.getQueueStatus(),
      deepLink: deepLinkService.getQueueStatus(),
    };
  }

  /**
   * Reset auth state (for testing/cleanup)
   */
  resetState(): void {
    logger.debug('Auth coordinator: Resetting all auth service states');
    magicLinkService.resetState();
    // Note: deepLinkService doesn't have resetState, only cleanup
  }

  /**
   * Cleanup all auth services (for testing/reset)
   */
  cleanup(): void {
    logger.debug('Auth coordinator: Cleaning up all auth services');
    magicLinkService.cleanup();
    deepLinkService.cleanup();
  }

  /**
   * Validate auth flow readiness
   */
  validateAuthReadiness(): {
    isReady: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check magic link service readiness
    const magicLinkStatus = magicLinkService.getQueueStatus();
    if (magicLinkStatus.isProcessing && magicLinkStatus.queueLength > 5) {
      issues.push('Magic link queue is overloaded');
    }

    // Check deep link service readiness
    const deepLinkStatus = deepLinkService.getQueueStatus();
    if (deepLinkStatus.isProcessing && deepLinkStatus.otpTokens > 3) {
      issues.push('Deep link token queue is overloaded');
    }

    // Check for stale tokens (older than 4 minutes)
    if (deepLinkStatus.oldestToken && Date.now() - deepLinkStatus.oldestToken > 4 * 60 * 1000) {
      issues.push('Deep link tokens are getting stale');
    }

    return {
      isReady: issues.length === 0,
      issues,
    };
  }

  /**
   * Get auth flow metrics for analytics
   */
  getMetrics(): {
    magicLinkQueueLength: number;
    deepLinkQueueLength: number;
    isAnyServiceBusy: boolean;
    canAcceptNewRequests: boolean;
  } {
    const magicLinkStatus = magicLinkService.getQueueStatus();
    const deepLinkStatus = deepLinkService.getQueueStatus();

    return {
      magicLinkQueueLength: magicLinkStatus.queueLength,
      deepLinkQueueLength: deepLinkStatus.otpTokens,
      isAnyServiceBusy: magicLinkStatus.isProcessing || deepLinkStatus.isProcessing,
      canAcceptNewRequests: magicLinkStatus.canSendNow && !magicLinkStatus.isProcessing,
    };
  }
}

// Export singleton instance
export const authCoordinator = new AuthCoordinator();
