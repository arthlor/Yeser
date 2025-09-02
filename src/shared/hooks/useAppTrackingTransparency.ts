import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Device from 'expo-device';

import { logger } from '@/utils/debugConfig';

type PermissionStatus = 'undetermined' | 'denied' | 'granted';

interface TrackingPermissionResponse {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
}

interface UseAppTrackingTransparencyOptions {
  shouldRequest?: boolean;
}

/**
 * Requests App Tracking Transparency permission when app becomes active on iOS 14+.
 * Ensures prompt is not shown during cold launch and avoids duplicate prompts.
 */
export const useAppTrackingTransparency = (
  options: UseAppTrackingTransparencyOptions = {}
): void => {
  const { shouldRequest = true } = options;
  const hasRequestedRef = useRef<boolean>(false);

  const maybeRequestATT = useCallback(async (): Promise<void> => {
    if (!shouldRequest) {
      return;
    }
    if (hasRequestedRef.current) {
      return;
    }
    if (Platform.OS !== 'ios') {
      return;
    }

    // Check if we're in a simulator or development environment where ATT might not work
    if (__DEV__) {
      const isSimulator = Device.isDevice === false;
      if (isSimulator) {
        logger.debug('[ATT] Running in iOS simulator - ATT module may not be available');
        hasRequestedRef.current = true; // Skip ATT in simulator
        return;
      }
      logger.debug('[ATT] Development mode - ATT module may not be available in simulator');
    }

    try {
      // Dynamic import to avoid loading on Android
      let trackingTransparency;
      try {
        trackingTransparency = await import('expo-tracking-transparency');
      } catch (importError) {
        logger.warn('[ATT] Failed to import tracking transparency module, skipping ATT request', {
          error: importError as Error,
        });
        hasRequestedRef.current = true; // Mark as requested to avoid retries
        return;
      }

      // Check if the module is properly loaded
      if (
        !trackingTransparency ||
        typeof trackingTransparency.getTrackingPermissionsAsync !== 'function'
      ) {
        logger.warn('[ATT] Tracking transparency module not properly loaded, skipping ATT request');
        hasRequestedRef.current = true; // Mark as requested to avoid retries
        return;
      }

      const permissions: TrackingPermissionResponse =
        await trackingTransparency.getTrackingPermissionsAsync();

      if (permissions.status === 'undetermined') {
        // Slight delay to avoid overlapping with other system prompts
        setTimeout(async () => {
          try {
            hasRequestedRef.current = true;
            await trackingTransparency.requestTrackingPermissionsAsync();
          } catch (error) {
            logger.error('[ATT] Failed to request tracking permission', error as Error);
          }
        }, 400);
      } else {
        hasRequestedRef.current = true; // Already determined, avoid re-request
      }
    } catch (error) {
      logger.error('[ATT] Failed to read tracking permission', error as Error);
      // Mark as requested to avoid infinite retries
      hasRequestedRef.current = true;
    }
  }, [shouldRequest]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    // Check if we're in development mode and the module might not be available
    if (__DEV__) {
      logger.debug('[ATT] Development mode detected, ATT module availability may vary');
    }

    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      if (nextAppState === 'active') {
        void maybeRequestATT();
      }
    };

    try {
      const subscription = AppState.addEventListener('change', handleAppStateChange);

      // In case the app is already active when this hook mounts
      if (AppState.currentState === 'active') {
        void maybeRequestATT();
      }

      return () => {
        subscription.remove();
      };
    } catch (error) {
      logger.error('[ATT] Failed to set up AppState listener', error as Error);
    }
  }, [maybeRequestATT]);
};
