import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';
import { supabase } from '@/utils/supabaseClient'; // Assuming this is your Supabase client path
import { logger } from '@/utils/logger';

const ANDROID_CHANNEL_ID = 'daily-reminder-channel';

/**
 * Sets up the notification channel for Android.
 * On Android, a channel is required to send notifications.
 */
async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

/**
 * Registers the device for push notifications, requests permissions,
 * and returns the Expo Push Token.
 * @returns The Expo Push Token if permission is granted, otherwise null.
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  await setupAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // Consider alerting the user that they will not receive notifications.
    logger.warn('Push notification permission denied.');
    return null;
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (error) {
    logger.error('Failed to get push token:', error as Error);
    return null;
  }
}

/**
 * Saves the user's push token and timezone to the Supabase backend.
 * @param token The Expo Push Token.
 * @returns An object indicating success or failure.
 */
async function saveTokenToBackend(token: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('User not authenticated.') };
  }

  const timezone = Localization.getCalendars()[0].timeZone ?? 'UTC';

  // First, check if profile exists
  const { data: existingProfile, error: profileCheckError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (profileCheckError && profileCheckError.code !== 'PGRST116') {
    // PGRST116 means no rows returned, which is expected if profile doesn't exist
    logger.error('Error checking profile existence:', profileCheckError);
    return { error: profileCheckError };
  }

  // Update or create profile with timezone
  if (existingProfile) {
    // Profile exists, just update timezone
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileUpdateError) {
      logger.error('Error updating profile timezone:', profileUpdateError);
      return { error: profileUpdateError };
    }
  } else {
    // Profile doesn't exist, create it
    const { error: profileCreateError } = await supabase.from('profiles').insert({
      id: user.id,
      timezone,
      onboarded: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (profileCreateError) {
      logger.error('Error creating profile:', profileCreateError);
      return { error: profileCreateError };
    }
  }

  // Now save the push token
  const { error: tokenError } = await supabase
    .from('push_tokens')
    .upsert({ user_id: user.id, token }, { onConflict: 'token' });

  if (tokenError) {
    logger.error('Error saving push token:', tokenError);
    return { error: tokenError };
  }

  logger.debug('Successfully saved push token and timezone', { userId: user.id, timezone });
  return { success: true };
}

/**
 * Updates the user's preferred notification time in their profile.
 * @param time A string in 'HH:mm' format (e.g., '14:30').
 * @returns An object indicating success or failure.
 */
async function updateNotificationTime(time: string | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: new Error('User not authenticated.') };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ notification_time: time })
    .eq('id', user.id);

  if (error) {
    logger.error('Error updating notification time:', error);
    return { error };
  }

  return { success: true };
}

/**
 * Removes a user's push token from the backend, effectively disabling
 * notifications for that device.
 * @param token The Expo Push Token to remove.
 */
async function removeTokenFromBackend(token: string) {
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);

  if (error) {
    logger.error('Error removing push token:', error);
  }
}

export const notificationService = {
  registerForPushNotificationsAsync,
  saveTokenToBackend,
  updateNotificationTime,
  removeTokenFromBackend,
};
