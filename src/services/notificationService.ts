import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import { Alert, Linking, Platform } from 'react-native';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import i18n from '@/i18n';
import type { LanguageStoreState } from '@/store/languageStore';
import { useLanguageStore } from '@/store/languageStore';
import { config } from '@/utils/config';
import type { Database } from '@/types/supabase.types';
import { supabaseService } from '@/utils/supabaseClient';
import { logger } from '@/utils/logger';

const ANDROID_CHANNEL_ID = 'daily-reminder-channel';
const EXPO_PROJECT_ID = config.eas.projectId;

const ensureSupabaseClient = async (): Promise<SupabaseClient<Database>> => {
  await supabaseService.initializeLazy();
  return supabaseService.getClient();
};

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'provisional';

interface NotificationRegistrationResult {
  token: string | null;
  status: NotificationPermissionStatus;
  canAskAgain?: boolean;
}

interface NotificationOperationResult<T = void> {
  ok: boolean;
  data?: T;
  error?: Error;
}

// Configure notification handling for different app states
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show notification even in foreground
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Sets up the notification channel for Android.
 * On Android, a channel is required to send notifications.
 */
async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      // Localized channel name
      name: i18n.isInitialized ? i18n.t('notifications.dailyRemindersTitle') : 'Daily Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

/**
 * Registers the device for push notifications, requests permissions,
 * and returns the Expo Push Token.
 * @returns Object with token and permission status details
 */
async function registerForPushNotificationsAsync(): Promise<NotificationRegistrationResult> {
  await setupAndroidChannel();

  const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
  // Map to a broader union that may include 'provisional' on iOS
  let finalStatus: NotificationPermissionStatus = existingStatus as NotificationPermissionStatus;
  let finalCanAskAgain = canAskAgain;

  if (existingStatus !== 'granted') {
    const { status, canAskAgain: newCanAskAgain } = await Notifications.requestPermissionsAsync();
    finalStatus = status as NotificationPermissionStatus;
    finalCanAskAgain = newCanAskAgain;
  }

  // Treat 'provisional' as acceptable permission on iOS
  if (finalStatus !== 'granted' && finalStatus !== 'provisional') {
    logger.warn('Push notification permission denied.', {
      status: finalStatus,
      canAskAgain: finalCanAskAgain,
    });
    return {
      token: null,
      status: finalStatus,
      canAskAgain: finalCanAskAgain,
    };
  }

  try {
    const token = await getExpoProjectPushToken();
    return {
      token,
      status: finalStatus,
    };
  } catch (error) {
    logger.error('Failed to get push token:', error as Error);
    return {
      token: null,
      status: finalStatus,
    };
  }
}

/**
 * Saves the user's push token and timezone to the Supabase backend.
 * @param token The Expo Push Token.
 * @returns An object indicating success or failure.
 */
async function saveTokenToBackend(token: string): Promise<NotificationOperationResult<void>> {
  try {
    const client = await ensureSupabaseClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return { ok: false, error: new Error('User not authenticated.') };
    }

    const timezone = Localization.getCalendars()[0]?.timeZone ?? 'UTC';
    const { language } = useLanguageStore.getState() as LanguageStoreState;

    const { error: registerError } = await client.rpc('register_push_token', {
      p_token: token,
      p_timezone: timezone,
      p_token_type: 'expo',
    });

    if (registerError) {
      logger.error('Error saving push token:', registerError);
      return { ok: false, error: mapPostgrestError(registerError) };
    }

    const { error: languageError } = await client
      .from('profiles')
      .update({ language })
      .eq('id', user.id);

    if (languageError) {
      logger.error('Error updating profile language:', languageError);
      return { ok: false, error: mapPostgrestError(languageError) };
    }

    logger.debug('Successfully saved push token, timezone, and language', {
      userId: user.id,
      timezone,
      language,
    });

    return { ok: true };
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Unexpected error saving push token', resolvedError);
    return { ok: false, error: resolvedError };
  }
}

/**
 * Updates the user's preferred notification time in their profile.
 * @param time A string in 'HH:00' format (e.g., '14:00') - only hour precision is used.
 * @returns An object indicating success or failure.
 */
async function updateNotificationTime(
  time: string | null
): Promise<NotificationOperationResult<void>> {
  try {
    const client = await ensureSupabaseClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return { ok: false, error: new Error('User not authenticated.') };
    }

    const { error } = await client.rpc('set_notification_hour', {
      p_notification_time: (time ?? null) as unknown as string,
    });

    if (error) {
      logger.error('Error updating notification time:', error);
      return { ok: false, error: mapPostgrestError(error) };
    }

    return { ok: true };
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Unexpected error updating notification time', resolvedError);
    return { ok: false, error: resolvedError };
  }
}

/**
 * Removes a user's push token from the backend, effectively disabling
 * notifications for that device.
 * @param token The Expo Push Token to remove.
 */
async function removeTokenFromBackend(token: string): Promise<NotificationOperationResult<void>> {
  try {
    const client = await ensureSupabaseClient();
    const { error } = await client.rpc('unregister_push_token', {
      p_token: token,
    });

    if (error) {
      logger.error('Error removing push token:', error);
      return { ok: false, error: mapPostgrestError(error) };
    }

    return { ok: true };
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Unexpected error removing push token', resolvedError);
    return { ok: false, error: resolvedError };
  }
}

async function getExpoProjectPushToken(): Promise<string> {
  if (!EXPO_PROJECT_ID) {
    logger.warn('Expo project ID missing – falling back to default token request');
    return (await Notifications.getExpoPushTokenAsync()).data;
  }

  const response = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
  return response.data;
}

async function getCurrentDevicePushToken(): Promise<string | null> {
  try {
    return await getExpoProjectPushToken();
  } catch (error) {
    logger.warn('Failed to read existing push token.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Shows an educational dialog about notifications and guides user to settings
 * @param canAskAgain Whether the system allows asking for permissions again
 * @param onPermissionResult Callback when permission flow completes
 */
function showNotificationPermissionGuidance(
  canAskAgain: boolean = true,
  onPermissionResult?: (granted: boolean) => void
) {
  const title = canAskAgain
    ? i18n.isInitialized
      ? i18n.t('notifications.dailyRemindersTitle')
      : 'Daily Reminders'
    : i18n.isInitialized
      ? i18n.t('notifications.permissionRequiredTitle')
      : 'Permission Required';

  const message = canAskAgain
    ? i18n.isInitialized
      ? i18n.t('notifications.dailyRemindersMessage')
      : 'Set daily gratitude reminders'
    : i18n.isInitialized
      ? i18n.t('notifications.permissionRequiredMessage')
      : 'Notification permission required';

  const buttons = canAskAgain
    ? [
        {
          text: i18n.isInitialized ? i18n.t('notifications.notNow') : 'Not Now',
          style: 'cancel' as const,
        },
        {
          text: i18n.isInitialized ? i18n.t('notifications.enable') : 'Enable',
          onPress: async () => {
            const result = await Notifications.requestPermissionsAsync();
            onPermissionResult?.(result.status === 'granted');
          },
        },
      ]
    : [
        {
          text: i18n.isInitialized ? i18n.t('notifications.maybeLater') : 'Maybe Later',
          style: 'cancel' as const,
        },
        {
          text: i18n.isInitialized ? i18n.t('notifications.openSettings') : 'Open Settings',
          onPress: openNotificationSettings,
        },
      ];

  Alert.alert(title, message, buttons);
}

/**
 * Opens the device notification settings for this app
 */
function openNotificationSettings() {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
}

export const notificationService = {
  registerForPushNotificationsAsync,
  saveTokenToBackend,
  updateNotificationTime,
  removeTokenFromBackend,
  showNotificationPermissionGuidance,
  openNotificationSettings,
  getCurrentDevicePushToken,
};

const mapPostgrestError = (error: PostgrestError): Error => {
  return new Error(error.message);
};
