import { logger } from '@/utils/debugConfig';
import { deepLinkService } from './deepLinkService';

/**
 * Auth Coordinator Service
 * Coordinates different authentication flows and manages overall auth state.
 * Acts as a facade for different auth services and provides a unified API.
 */
export class AuthCoordinator {
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
   * Get comprehensive auth status for monitoring/debugging
   */
  getAuthStatus(): {
    deepLink: {
      oauthTokens: number;
      isProcessing: boolean;
      oldestToken?: number;
    };
  } {
    return {
      deepLink: deepLinkService.getQueueStatus(),
    };
  }

  /**
   * Cleanup all auth services (for testing/reset)
   */
  cleanup(): void {
    logger.debug('Auth coordinator: Cleaning up all auth services');
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

    // Check deep link service readiness
    const deepLinkStatus = deepLinkService.getQueueStatus();
    if (deepLinkStatus.isProcessing && deepLinkStatus.oauthTokens > 3) {
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
    deepLinkQueueLength: number;
    isAnyServiceBusy: boolean;
  } {
    const deepLinkStatus = deepLinkService.getQueueStatus();

    return {
      deepLinkQueueLength: deepLinkStatus.oauthTokens,
      isAnyServiceBusy: deepLinkStatus.isProcessing,
    };
  }
}

// Export singleton instance
export const authCoordinator = new AuthCoordinator();
