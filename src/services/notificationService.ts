import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import { Alert, Linking, Platform } from 'react-native';
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import i18n from '@/i18n';
import type { LanguageStoreState } from '@/store/languageStore';
import { useLanguageStore } from '@/store/languageStore';
import { config } from '@/utils/config';
import type { Database, TablesUpdate } from '@/types/supabase.types';
import { supabaseService } from '@/utils/supabaseClient';
import { logger } from '@/utils/logger';

const ANDROID_CHANNEL_ID = 'daily-reminder-channel';
const EXPO_PROJECT_ID = config.eas.projectId;
const DEFAULT_NOTIFICATION_TIME = '12:30:00';
const SAFE_UPDATE_MISSING_WHERE_CODE = '21000';
const SAFE_UPDATE_MISSING_WHERE_MESSAGE = 'UPDATE requires a WHERE clause';
const SAFE_UPDATE_MISSING_COLUMN_CODE = '42703';
const SAFE_UPDATE_MISSING_COLUMN_FRAGMENT = 'enable_reminders';
const DAILY_REMINDER_DATA_TAG = 'daily-reminder';

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

type DailyReminderVariant = 'midday' | 'evening';

interface DailyReminderSchedule {
  variant: DailyReminderVariant;
  time: string;
}

const DAILY_REMINDER_SCHEDULES: ReadonlyArray<DailyReminderSchedule> = [
  { variant: 'midday', time: '12:30' },
  { variant: 'evening', time: '21:00' },
];

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
 * Enables or disables notifications for the current user.
 * Attempts the primary Supabase RPC and falls back to a guarded profile update when required.
 * @param enabled Whether notifications should be enabled.
 * @returns An object indicating success or failure.
 */
async function setNotificationsEnabled(
  enabled: boolean
): Promise<NotificationOperationResult<void>> {
  try {
    const client = await ensureSupabaseClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      return { ok: false, error: new Error('User not authenticated.') };
    }

    const { error } = await client.rpc('set_notifications_enabled', {
      p_enabled: enabled,
    });

    let baseResult: NotificationOperationResult<void> = { ok: true };

    if (error) {
      logger.error('Error updating notification preference via RPC:', error);

      const shouldFallback =
        (error.code === SAFE_UPDATE_MISSING_WHERE_CODE &&
          error.message === SAFE_UPDATE_MISSING_WHERE_MESSAGE) ||
        error.code === SAFE_UPDATE_MISSING_COLUMN_CODE ||
        error.message?.toLowerCase().includes(SAFE_UPDATE_MISSING_COLUMN_FRAGMENT);

      if (shouldFallback) {
        logger.warn('Falling back to direct profile update for notification preference', {
          userId: user.id,
          enabled,
        });
        baseResult = await updateNotificationPreferenceFallback(client, user.id, enabled);
      } else {
        return { ok: false, error: mapPostgrestError(error) };
      }
    }

    if (!baseResult.ok) {
      return baseResult;
    }

    if (enabled) {
      const scheduleResult = await scheduleDailyReminderNotifications();
      if (!scheduleResult.ok) {
        return scheduleResult;
      }
    } else {
      await cancelDailyReminderNotifications();
    }

    return { ok: true };
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Unexpected error updating notification preference', resolvedError);
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

async function scheduleDailyReminderNotifications(): Promise<NotificationOperationResult<void>> {
  try {
    await setupAndroidChannel();

    const { status } = await Notifications.getPermissionsAsync();
    const permissionStatus = status as NotificationPermissionStatus;
    if (permissionStatus !== 'granted' && permissionStatus !== 'provisional') {
      return {
        ok: false,
        error: new Error('Notification permission not granted for scheduling reminders.'),
      };
    }

    await cancelDailyReminderNotifications();

    const localizedCopy = getLocalizedReminderCopy();

    await Promise.all(
      DAILY_REMINDER_SCHEDULES.map(({ variant, time }) => {
        const trigger = parseDailyTrigger(time);
        return Notifications.scheduleNotificationAsync({
          content: {
            title: localizedCopy.title,
            body: localizedCopy.body,
            sound: 'default',
            data: {
              tag: DAILY_REMINDER_DATA_TAG,
              variant,
              screen: 'DailyEntryTab',
            },
          },
          trigger,
        });
      })
    );

    return { ok: true };
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to schedule local reminder notifications', resolvedError);
    return { ok: false, error: resolvedError };
  }
}

async function cancelDailyReminderNotifications(): Promise<void> {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const cancellations = scheduledNotifications
      .filter((request) => {
        const data = request.content.data as Record<string, unknown> | undefined;
        return data?.tag === DAILY_REMINDER_DATA_TAG;
      })
      .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier));

    await Promise.all(cancellations);
  } catch (error) {
    logger.warn('Failed to cancel existing local reminder notifications', {
      error: error instanceof Error ? error.message : String(error),
    });
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
  setNotificationsEnabled,
  removeTokenFromBackend,
  showNotificationPermissionGuidance,
  openNotificationSettings,
  getCurrentDevicePushToken,
  scheduleDailyReminderNotifications,
  cancelDailyReminderNotifications,
};

function mapPostgrestError(error: PostgrestError): Error {
  return new Error(error.message);
}

async function updateNotificationPreferenceFallback(
  client: SupabaseClient<Database>,
  userId: string,
  enabled: boolean
): Promise<NotificationOperationResult<void>> {
  try {
    const { data: profileRow, error: profileFetchError } = await client
      .from('profiles')
      .select('notification_time')
      .eq('id', userId)
      .single();

    if (profileFetchError) {
      logger.warn('Failed to read existing notification preference before fallback update', {
        error: profileFetchError,
        userId,
      });
    }

    const nextNotificationTime =
      enabled === true ? (profileRow?.notification_time ?? DEFAULT_NOTIFICATION_TIME) : null;

    const payload: TablesUpdate<'profiles'> = {
      notification_time: nextNotificationTime,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await client.from('profiles').update(payload).eq('id', userId);

    if (updateError) {
      logger.error('Fallback profile update failed for notification preference:', updateError);
      return { ok: false, error: mapPostgrestError(updateError) };
    }

    logger.debug('Notification preference updated via fallback profile update', {
      userId,
      enabled,
      nextNotificationTime,
    });

    return { ok: true };
  } catch (error) {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    logger.error('Unexpected fallback error updating notification preference', resolvedError);
    return { ok: false, error: resolvedError };
  }
}

const getLocalizedReminderCopy = (): { title: string; body: string } => {
  if (i18n.isInitialized) {
    return {
      title: i18n.t('notifications.dailyRemindersTitle'),
      body: i18n.t('notifications.dailyRemindersMessage'),
    };
  }

  return {
    title: 'Daily Reminders',
    body: 'Remember to record what you are grateful for.',
  };
};

const parseDailyTrigger = (time: string): Notifications.DailyTriggerInput => {
  const [hourPart, minutePart] = time.split(':');
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);

  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: ANDROID_CHANNEL_ID,
  };
};
