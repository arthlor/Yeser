import React from 'react';
import * as Linking from 'expo-linking';
import * as Localization from 'expo-localization';

import { logger } from '@/utils/debugConfig';
import { authCoordinator } from '@/features/auth/services/authCoordinator';
import { supabaseService } from '@/utils/supabaseClient';
import { updateTimezone } from '@/features/settings/profileApi';
import { useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import type { Profile } from '@/schemas/profileSchema';

// Process queued OTP tokens when database becomes ready
const processQueuedTokens = async (): Promise<void> => {
  await authCoordinator.processQueuedTokens();
};

// Simple delegate to the centralized auth coordinator
const handleDeepLink = (url: string, databaseReady: boolean = false): void => {
  logger.debug('Deep link received, delegating to authCoordinator:', { url, databaseReady });
  authCoordinator.handleAuthCallback(url, databaseReady).catch((error) => {
    logger.error('Deep link handling failed:', { error: (error as Error).message, url });
  });
};

/**
 * Auth bootstrap hook
 * - Handles deep link processing
 * - Tracks database readiness for OAuth token queue
 * - Syncs timezone on authenticated profile load
 */
export const useAuthBootstrap = (profile?: Profile | null) => {
  const isAuthenticated = useCoreAuthStore((state) => state.isAuthenticated);
  const profileTimezone = profile?.timezone;
  const [databaseReady, setDatabaseReady] = React.useState(false);
  const databaseReadyRef = React.useRef(false);
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync timezone on authenticated profile changes
  React.useEffect(() => {
    if (!profileTimezone || !isAuthenticated) {
      return;
    }

    const deviceTimezone = Localization.getCalendars()[0].timeZone;
    if (deviceTimezone && profileTimezone !== deviceTimezone) {
      logger.debug('Timezone mismatch detected. Syncing profile.', {
        profileTimezone,
        deviceTimezone,
      });
      updateTimezone(deviceTimezone);
    }
  }, [isAuthenticated, profileTimezone]);

  // Monitor Supabase initialization once and process token queue exactly once when ready
  React.useEffect(() => {
    const checkDatabaseReadiness = () => {
      if (!isMountedRef.current) {
        return;
      }

      const isReady = supabaseService.isInitialized();
      if (!isReady || databaseReadyRef.current) {
        return;
      }

      logger.debug('[OAUTH QUEUE] Database ready detected, processing queued tokens');
      databaseReadyRef.current = true;
      setDatabaseReady(true);

      const queueStatus = authCoordinator.getAuthStatus().deepLink;
      if (queueStatus.oauthTokens > 0) {
        logger.debug('[OAUTH QUEUE] Found queued tokens, processing now');
        processQueuedTokens().catch((error) => {
          logger.error('[OTP QUEUE] Failed to process queued tokens:', error as Error);
        });
      }
    };

    checkDatabaseReadiness();
    const readinessInterval = setInterval(checkDatabaseReadiness, 500);

    return () => {
      clearInterval(readinessInterval);
    };
  }, []);

  // Register deep-link listeners once to prevent duplicate callback handling
  React.useEffect(() => {
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      void handleDeepLink(event.url, databaseReadyRef.current);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleDeepLink(url, databaseReadyRef.current);
      }
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  return { databaseReady };
};
