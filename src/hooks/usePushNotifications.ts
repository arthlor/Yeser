import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Subscription } from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Constants from 'expo-constants';

import { useToast } from '@/providers/ToastProvider';
import { logger } from '@/utils/debugConfig';
import { supabase } from '@/utils/supabaseClient';
import { canOpenSettings } from '@/utils/deviceUtils';
import { removePushToken, savePushToken } from '@/api/profileApi';
import { RootStackParamList } from '@/types/navigation';
import usePushNotificationStore from '@/store/pushNotificationStore';
import { getLastSyncedPushToken, storeLastSyncedPushToken } from '@/utils/tokenStorage';
import useAuthStore from '@/store/authStore';

type NotificationRedirect = {
  stack: keyof RootStackParamList;
  screen: string;
  params?: Record<string, unknown>;
};

function isNotificationRedirect(data: unknown): data is NotificationRedirect {
  const obj = data as Record<string, unknown>;
  return (
    typeof obj?.stack === 'string' &&
    typeof obj?.screen === 'string' &&
    (obj.params === undefined || typeof obj.params === 'object')
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<{
  token: string | null;
  status: Notifications.PermissionStatus;
}> {
  if (!Device.isDevice) {
    logger.warn('Push notifications are not available on simulators.');
    return { token: null, status: Notifications.PermissionStatus.UNDETERMINED };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.info('User has not granted notification permissions.', { status: finalStatus });
      return { token: null, status: finalStatus };
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    logger.info('Expo Push Token retrieved', { token });

    if (Device.osName === 'Android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return { token, status: finalStatus };
  } catch (error) {
    logger.error('Failed to get push token:', error as Error);
    return { token: null, status: Notifications.PermissionStatus.UNDETERMINED };
  }
}

async function saveToken(token: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn('No user found, cannot save push token.');
    return;
  }

  try {
    const deviceInfo = {
      osName: Device.osName,
      osVersion: Device.osVersion,
      deviceName: Device.deviceName,
      appVersion: Constants.expoConfig?.version,
    };

    await savePushToken(token, user.id, deviceInfo);
    logger.info('Push token saved to Supabase successfully.');
  } catch (error) {
    logger.error('Failed to save push token via API:', { error });
  }
}

async function removeToken(token: string): Promise<void> {
  try {
    await removePushToken(token);
    logger.info('Push token removed from Supabase successfully.');
  } catch (error) {
    logger.error('Failed to remove push token via API:', { error });
  }
}

export const usePushNotifications = () => {
  const { expoPushToken, setExpoPushToken } = usePushNotificationStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const { showError: showToastError } = useToast();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  const register = useCallback(async () => {
    const { token, status } = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token); // Always update local state immediately
      const lastToken = await getLastSyncedPushToken();

      // Only sync with the server if the token is new AND the user is logged in.
      if (isAuthenticated && token !== lastToken) {
        logger.info('New token and authenticated user. Syncing with server...', {
          newToken: token,
          lastToken,
        });
        await saveToken(token);
        await storeLastSyncedPushToken(token);
      } else {
        logger.debug('Push token already synced or user not authenticated. No sync needed yet.', {
          isAuthenticated,
          isNewToken: token !== lastToken,
        });
      }
    } else if (status !== 'granted') {
      const canOpen = await canOpenSettings();
      const message = canOpen
        ? 'Bildirim izinleri alınamadı. Ayarlardan etkinleştirebilirsiniz.'
        : 'Bildirimler için izin vermediniz.';
      showToastError(message);
    }
  }, [showToastError, setExpoPushToken, isAuthenticated]);

  const unregister = useCallback(async () => {
    if (expoPushToken) {
      await removeToken(expoPushToken);
      await storeLastSyncedPushToken(''); // Clear the last synced token
      setExpoPushToken(null);
    }
  }, [expoPushToken, setExpoPushToken]);

  // This effect will re-run the registration logic if the user logs in
  // after the initial registration has already occurred.
  useEffect(() => {
    if (isAuthenticated && expoPushToken) {
      register();
    }
  }, [isAuthenticated, expoPushToken, register]);

  useEffect(() => {
    register();

    notificationListener.current = Notifications.addNotificationReceivedListener(setNotification);
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      logger.debug('Notification response received:', { response });
      const data = response.notification.request.content.data;

      if (isNotificationRedirect(data?.redirect)) {
        const { stack, screen, params } = data.redirect;

        // Use a switch statement for type-safe navigation
        switch (stack) {
          case 'MainApp':
            navigation.navigate('MainApp', { screen, params });
            break;
          case 'Auth':
            // The Auth stack does not accept nested screen parameters.
            // We navigate to the stack itself. If a specific screen is needed,
            // it should be a top-level screen in the RootStackParamList.
            navigation.navigate('Auth');
            break;
          default:
            // Log a warning for unhandled stacks.
            // This prevents runtime errors for unexpected payloads.
            logger.warn(
              `Received a push notification with an unhandled redirect stack: "${stack}"`
            );
            break;
        }
      }
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        register();
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.remove();
    };
  }, [register, navigation]);

  return {
    expoPushToken,
    notification,
    register,
    unregister,
  };
};
