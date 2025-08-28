import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

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

    try {
      const permissions: TrackingPermissionResponse = await getTrackingPermissionsAsync();

      if (permissions.status === 'undetermined') {
        // Slight delay to avoid overlapping with other system prompts
        setTimeout(async () => {
          try {
            hasRequestedRef.current = true;
            await requestTrackingPermissionsAsync();
          } catch (error) {
            logger.error('[ATT] Failed to request tracking permission', error as Error);
          }
        }, 400);
      } else {
        hasRequestedRef.current = true; // Already determined, avoid re-request
      }
    } catch (error) {
      logger.error('[ATT] Failed to read tracking permission', error as Error);
    }
  }, [shouldRequest]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      if (nextAppState === 'active') {
        void maybeRequestATT();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // In case the app is already active when this hook mounts
    if (AppState.currentState === 'active') {
      void maybeRequestATT();
    }

    return () => {
      subscription.remove();
    };
  }, [maybeRequestATT]);
};
