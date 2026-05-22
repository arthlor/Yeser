import * as Notifications from 'expo-notifications';
import type { NavigationContainerRef } from '@react-navigation/native';
import React from 'react';

import { logger } from '@/utils/logger';
import type { RootStackParamList } from '@/types/navigation';

type NotificationData = {
  screen?: string;
  userId?: string;
  ts?: number;
};

const getNotificationData = (
  response: Notifications.NotificationResponse | null | undefined
): NotificationData | null => {
  const raw = response?.notification.request.content.data;
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  return raw as NotificationData;
};

const navigateToDailyEntry = (
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>
) => {
  if (!navigationRef.current?.isReady()) {
    return false;
  }

  navigationRef.current.navigate('MainApp', {
    screen: 'MainAppTabs',
    params: {
      screen: 'DailyEntryTab',
    },
  });

  return true;
};

/**
 * Handles push notification taps and cold-start launches from a reminder.
 */
export const useNotificationResponse = (
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>,
  isNavigationReady: boolean,
  isMainAppReady: boolean
) => {
  const pendingNavigationRef = React.useRef(false);
  const handledResponseIdsRef = React.useRef<Set<string>>(new Set());

  const handleNotificationResponse = React.useCallback(
    (response: Notifications.NotificationResponse | null | undefined) => {
      const data = getNotificationData(response);
      if (data?.screen !== 'DailyEntryTab') {
        return;
      }

      const responseId = response?.notification.request.identifier;
      if (responseId && handledResponseIdsRef.current.has(responseId)) {
        return;
      }

      if (responseId) {
        handledResponseIdsRef.current.add(responseId);
      }

      if (!isMainAppReady) {
        pendingNavigationRef.current = true;
        return;
      }

      const didNavigate = navigateToDailyEntry(navigationRef);
      if (didNavigate) {
        pendingNavigationRef.current = false;
        logger.debug('Navigated to DailyEntryTab from notification tap');
      } else {
        pendingNavigationRef.current = true;
      }
    },
    [isMainAppReady, navigationRef]
  );

  React.useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    return () => subscription.remove();
  }, [handleNotificationResponse]);

  React.useEffect(() => {
    if (!isNavigationReady) {
      return;
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handleNotificationResponse(response);
    });
  }, [handleNotificationResponse, isNavigationReady]);

  React.useEffect(() => {
    if (!isMainAppReady || !pendingNavigationRef.current) {
      return;
    }

    const didNavigate = navigateToDailyEntry(navigationRef);
    if (didNavigate) {
      pendingNavigationRef.current = false;
      logger.debug('Flushed pending notification navigation to DailyEntryTab');
    }
  }, [isMainAppReady, navigationRef]);
};
