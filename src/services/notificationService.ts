// src/services/notificationService.ts
// 🔔 EXPO NOTIFICATIONS SERVICE: Complete notification functionality with Expo
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { logger } from '@/utils/debugConfig';
import type { Json } from '@/types/supabase.types';

/**
 * Comprehensive notification service using Expo Notifications
 * Provides local notifications, push notifications, and scheduled reminders
 */
class NotificationService {
  private initialized = false;
  private expoPushToken: string | null = null;
  private hasPermissions = false;

  constructor() {
    // Set the notification handler for when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  /**
   * Initialize the notification service
   * @returns Promise resolving to whether permissions were granted
   */
  async initialize(): Promise<boolean> {
    try {
      // 🛡️ INITIALIZATION GUARD: Prevent duplicate initialization
      if (this.initialized) {
        logger.debug('[NOTIFICATION] Service already initialized, returning cached state');
        return this.hasPermissions;
      }

      logger.debug('[NOTIFICATION] Initializing Expo notification service...');

      // Step 1: Request permissions
      const permissionGranted = await this.requestPermissions();
      if (!permissionGranted) {
        logger.warn('[NOTIFICATION] Notification permissions not granted');
        this.initialized = true; // Mark as initialized even if permissions denied
        this.hasPermissions = false;
        return false;
      }

      // Step 2: Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Step 3: Try to get push token (optional - don't fail if it doesn't work)
      try {
        await this.getPushToken();
        logger.debug('[NOTIFICATION] Push token obtained successfully');
      } catch (pushTokenError) {
        // Log the push token error but don't fail initialization
        logger.warn(
          '[NOTIFICATION] Push token unavailable (local notifications will still work):',
          {
            error: (pushTokenError as Error).message,
            note: 'This is expected if Firebase is not configured - local notifications will work fine',
          }
        );
      }

      this.initialized = true;
      this.hasPermissions = permissionGranted;

      logger.debug('[NOTIFICATION] Expo notification service initialized successfully', {
        pushTokenAvailable: !!this.expoPushToken,
        localNotificationsReady: true,
      });
      return true;
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to initialize notification service:', error as Error);
      // Mark as initialized even on error to prevent retry loops
      this.initialized = true;
      this.hasPermissions = false;
      return false;
    }
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    try {
      // Daily reminders channel
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Gratitude Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5', // Your app's primary color
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });

      // Throwback reminders channel
      await Notifications.setNotificationChannelAsync('throwback-reminders', {
        name: 'Memory Throwback Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150, 150, 150],
        lightColor: '#10B981', // Secondary color for throwbacks
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // General notifications channel
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        showBadge: true,
      });

      logger.debug('[NOTIFICATION] Android notification channels configured');
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to setup Android channels:', error as Error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        logger.warn('[NOTIFICATION] Must use physical device for notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';
      logger.debug('[NOTIFICATION] Permission status:', { finalStatus, granted });

      return granted;
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to request permissions:', error as Error);
      return false;
    }
  }

  /**
   * Get Expo push token for future push notification capability
   * Note: This is optional - local notifications work without push tokens
   */
  private async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        logger.debug('[NOTIFICATION] Skipping push token on simulator/emulator');
        return null;
      }

      // Get project ID from config
      const Constants = await import('expo-constants');
      const projectId = Constants.default?.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        logger.warn('[NOTIFICATION] No EAS project ID found - push tokens require EAS setup');
        return null;
      }

      logger.debug('[NOTIFICATION] Attempting to get Expo push token...', { projectId });

      // Get Expo push token
      const pushTokenResult = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = pushTokenResult.data;
      logger.debug('[NOTIFICATION] Expo push token obtained successfully');

      // Register token with backend
      await this.registerPushTokenWithBackend(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Check if this is the Firebase error
      if (
        errorMessage.includes('FirebaseApp is not initialized') ||
        errorMessage.includes('Firebase') ||
        errorMessage.includes('FCM')
      ) {
        logger.info('[NOTIFICATION] Firebase not configured - push tokens unavailable', {
          note: 'This is expected for local-notifications-only setup',
          solution: 'Local notifications will work fine without push tokens',
          error: errorMessage,
        });
      } else {
        logger.error('[NOTIFICATION] Failed to get push token:', error as Error);
      }

      // Don't throw - let the service continue without push tokens
      return null;
    }
  }

  /**
   * Register push token with Supabase backend
   */
  private async registerPushTokenWithBackend(token: string): Promise<void> {
    try {
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (!session?.user) {
        logger.warn('[NOTIFICATION] No current user - cannot register push token');
        return;
      }

      // Call the database function to register the push token
      const client = supabaseService.getClient();
      const { error } = await client.rpc('register_push_token', {
        p_user_id: session.user.id,
        p_expo_push_token: token,
      });

      if (error) {
        throw error;
      }

      logger.debug('[NOTIFICATION] Push token registered with backend successfully');
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to register push token with backend:', error as Error);
    }
  }

  /**
   * Update push notification preferences
   */
  async updatePushNotificationPreferences(enabled: boolean): Promise<boolean> {
    try {
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (!session?.user) {
        logger.warn('[NOTIFICATION] No current user - cannot update preferences');
        return false;
      }

      const client = supabaseService.getClient();
      const { error } = await client
        .from('profiles')
        .update({
          push_notifications_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }

      logger.debug('[NOTIFICATION] Push notification preferences updated:', { enabled });
      return true;
    } catch (error) {
      logger.error(
        '[NOTIFICATION] Failed to update push notification preferences:',
        error as Error
      );
      return false;
    }
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if push notifications are available
   * @returns Object with availability status and reason
   */
  getPushNotificationStatus(): {
    available: boolean;
    reason?: string;
    hasToken: boolean;
  } {
    if (!this.initialized) {
      return {
        available: false,
        reason: 'Notification service not initialized',
        hasToken: false,
      };
    }

    if (!this.hasPermissions) {
      return {
        available: false,
        reason: 'Notification permissions not granted',
        hasToken: false,
      };
    }

    if (!this.expoPushToken) {
      return {
        available: false,
        reason: 'Push token not available (Firebase not configured)',
        hasToken: false,
      };
    }

    return {
      available: true,
      hasToken: true,
    };
  }

  /**
   * Send a server-triggered notification
   */
  async sendServerNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
    notificationType: 'reminder' | 'achievement' | 'social' | 'system' | 'throwback' = 'system'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (!session?.user) {
        return {
          success: false,
          error: 'No authenticated user',
        };
      }

      // Call the database function to send notification
      const client = supabaseService.getClient();
      const { data: notificationId, error } = await client.rpc('send_push_notification_to_user', {
        p_user_id: session.user.id,
        p_title: title,
        p_body: body,
        p_data: (data || null) as Json,
        p_notification_type: notificationType,
      });

      if (error) {
        throw error;
      }

      logger.debug('[NOTIFICATION] Server notification sent successfully:', {
        notificationId,
        title,
        type: notificationType,
      });

      return {
        success: true,
        notificationId: notificationId as string,
      };
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to send server notification:', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Schedule a server-triggered notification for later
   */
  async scheduleServerNotification(
    title: string,
    body: string,
    scheduledFor: Date,
    data?: Record<string, unknown>,
    notificationType: 'reminder' | 'achievement' | 'social' | 'system' | 'throwback' = 'reminder'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (!session?.user) {
        return {
          success: false,
          error: 'No authenticated user',
        };
      }

      // Call the database function to schedule notification
      const client = supabaseService.getClient();
      const { data: notificationId, error } = await client.rpc('schedule_push_notification', {
        p_user_id: session.user.id,
        p_title: title,
        p_body: body,
        p_data: (data || null) as Json,
        p_notification_type: notificationType,
        p_scheduled_for: scheduledFor.toISOString(),
      });

      if (error) {
        throw error;
      }

      logger.debug('[NOTIFICATION] Server notification scheduled successfully:', {
        notificationId,
        title,
        scheduledFor: scheduledFor.toISOString(),
        type: notificationType,
      });

      return {
        success: true,
        notificationId: notificationId as string,
      };
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to schedule server notification:', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Schedule a local notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    try {
      if (!this.hasPermissions) {
        logger.warn('[NOTIFICATION] No permissions to schedule notification');
        return;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          badge: 1,
        },
        trigger: null, // Show immediately
      });

      logger.debug('[NOTIFICATION] Scheduled notification:', { identifier, title, body });
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to schedule notification:', error as Error);
    }
  }

  /**
   * Schedule a daily reminder notification
   */
  async scheduleDailyReminder(
    hour: number,
    minute: number,
    enabled: boolean
  ): Promise<{ success: boolean; identifier?: string; error?: { message?: string } }> {
    try {
      if (!enabled) {
        await this.cancelDailyReminders();
        return { success: true };
      }

      if (!this.hasPermissions) {
        return {
          success: false,
          error: { message: 'Notification permissions not granted' },
        };
      }

      // Cancel existing daily reminders first
      await this.cancelDailyReminders();

      // Create cross-platform trigger
      let trigger: Notifications.NotificationTriggerInput;

      if (Platform.OS === 'ios') {
        // iOS supports calendar triggers
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          repeats: true,
          hour,
          minute,
        };
      } else {
        // Android: Use daily time trigger (calculate seconds from midnight)
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(hour, minute, 0, 0);

        // If the time has passed today, schedule for tomorrow
        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }

        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        };
      }

      // Schedule new daily reminder
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌟 Minnettarlık zamanı!',
          body: 'Bugün neye minnettarlık duyuyorsun? Hemen yaz!',
          data: { type: 'daily_reminder' },
          sound: 'default',
          badge: 1,
          categoryIdentifier: 'daily-reminders',
        },
        trigger,
        identifier: 'daily-reminder',
      });

      logger.debug('[NOTIFICATION] Scheduled daily reminder:', {
        identifier,
        hour,
        minute,
        platform: Platform.OS,
      });
      return { success: true, identifier };
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to schedule daily reminder:', error as Error);
      return {
        success: false,
        error: { message: (error as Error).message },
      };
    }
  }

  /**
   * Cancel daily reminder notifications
   */
  async cancelDailyReminders(): Promise<void> {
    try {
      // Cancel by identifier
      await Notifications.cancelScheduledNotificationAsync('daily-reminder');

      // Also cancel any scheduled notifications with daily reminder data
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const dailyReminders = scheduled.filter(
        (notification) => notification.content.data?.type === 'daily_reminder'
      );

      for (const reminder of dailyReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }

      logger.debug('[NOTIFICATION] Canceled all daily reminders');
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to cancel daily reminders:', error as Error);
    }
  }

  /**
   * Schedule a throwback reminder notification
   */
  async scheduleThrowbackReminder(
    hour: number,
    minute: number,
    enabled: boolean,
    frequency: string
  ): Promise<{ success: boolean; error?: { message?: string } }> {
    try {
      if (!enabled) {
        await this.cancelThrowbackReminders();
        return { success: true };
      }

      if (!this.hasPermissions) {
        return {
          success: false,
          error: { message: 'Notification permissions not granted' },
        };
      }

      // Cancel existing throwback reminders first
      await this.cancelThrowbackReminders();

      // Create cross-platform trigger based on frequency and platform
      let trigger: Notifications.NotificationTriggerInput;

      if (Platform.OS === 'ios') {
        // iOS supports calendar triggers
        switch (frequency) {
          case 'daily':
            trigger = {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              repeats: true,
              hour,
              minute,
            };
            break;
          case 'weekly':
            trigger = {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              repeats: true,
              weekday: 1, // Monday
              hour,
              minute,
            };
            break;
          case 'monthly':
            trigger = {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              repeats: true,
              day: 1, // First of month
              hour,
              minute,
            };
            break;
          default:
            throw new Error(`Unsupported frequency: ${frequency}`);
        }
      } else {
        // Android: Use time-based triggers
        switch (frequency) {
          case 'daily':
            trigger = {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
            };
            break;
          case 'weekly': // For weekly on Android, use time interval (7 days = 604800 seconds)
          {
            const weeklyTime = new Date();
            weeklyTime.setHours(hour, minute, 0, 0);
            if (weeklyTime <= new Date()) {
              weeklyTime.setDate(weeklyTime.getDate() + 7); // Next week
            }

            trigger = {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 604800, // 7 days
              repeats: true,
            };
            break;
          }
          case 'monthly': // For monthly on Android, approximate with 30 days (2592000 seconds)
          {
            const monthlyTime = new Date();
            monthlyTime.setHours(hour, minute, 0, 0);
            if (monthlyTime <= new Date()) {
              monthlyTime.setMonth(monthlyTime.getMonth() + 1); // Next month
            }

            trigger = {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 2592000, // 30 days
              repeats: true,
            };
            break;
          }
          default:
            throw new Error(`Unsupported frequency: ${frequency}`);
        }
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💭 Minnetlerini hatırla',
          body: 'Geçmiş minnetlerinle yeşer!',
          data: { type: 'throwback_reminder', frequency },
          sound: 'default',
          badge: 1,
          categoryIdentifier: 'throwback-reminders',
        },
        trigger,
        identifier: `throwback-reminder-${frequency}`,
      });

      logger.debug('[NOTIFICATION] Scheduled throwback reminder:', {
        identifier,
        frequency,
        hour,
        minute,
        platform: Platform.OS,
      });
      return { success: true };
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to schedule throwback reminder:', error as Error);
      return {
        success: false,
        error: { message: (error as Error).message },
      };
    }
  }

  /**
   * Cancel throwback reminder notifications
   */
  async cancelThrowbackReminders(): Promise<void> {
    try {
      // Cancel by identifiers
      const frequencies = ['daily', 'weekly', 'monthly'];
      for (const freq of frequencies) {
        await Notifications.cancelScheduledNotificationAsync(`throwback-reminder-${freq}`);
      }

      // Also cancel any scheduled notifications with throwback reminder data
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const throwbackReminders = scheduled.filter(
        (notification) => notification.content.data?.type === 'throwback_reminder'
      );

      for (const reminder of throwbackReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }

      logger.debug('[NOTIFICATION] Canceled all throwback reminders');
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to cancel throwback reminders:', error as Error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.debug('[NOTIFICATION] Canceled all scheduled notifications');
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to cancel all notifications:', error as Error);
    }
  }

  /**
   * Cancel all scheduled notifications (alias for consistency)
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    await this.cancelAllNotifications();
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<void> {
    await this.scheduleNotification(
      '🔔 Test Notification',
      'Your notifications are working perfectly!',
      { type: 'test' }
    );
  }

  /**
   * Get scheduled notifications count
   */
  async getScheduledNotificationsCount(): Promise<number> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.length;
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to get scheduled notifications count:', error as Error);
      return 0;
    }
  }

  /**
   * Set app badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to set badge count:', error as Error);
    }
  }

  /**
   * Get current app badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to get badge count:', error as Error);
      return 0;
    }
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    this.reset();
  }

  /**
   * Reset the service
   */
  reset(): void {
    this.initialized = false;
    this.expoPushToken = null;
    this.hasPermissions = false;
    logger.debug('[NOTIFICATION] Notification service reset');
  }

  /**
   * Force re-initialization (for testing purposes)
   * This bypasses the initialization guard
   */
  async forceReinitialize(): Promise<boolean> {
    logger.debug('[NOTIFICATION] Force re-initialization requested');
    this.reset();
    return this.initialize();
  }

  /**
   * Restore user notification settings from profile
   * Should be called after app startup and user authentication
   */
  async restoreUserNotificationSettings(): Promise<{
    success: boolean;
    dailyRestored: boolean;
    throwbackRestored: boolean;
    error?: string;
  }> {
    try {
      logger.debug('[NOTIFICATION] Restoring user notification settings from profile...');

      // Get current user session and profile
      const { getCurrentSession } = await import('./authService');
      const { getProfile } = await import('@/api/profileApi');

      const session = await getCurrentSession();
      if (!session?.user) {
        logger.debug('[NOTIFICATION] No authenticated user - skipping notification restoration');
        return { success: true, dailyRestored: false, throwbackRestored: false };
      }

      // Get user profile with notification settings
      const profile = await getProfile();
      if (!profile) {
        logger.warn('[NOTIFICATION] No profile found - cannot restore notification settings');
        return {
          success: false,
          dailyRestored: false,
          throwbackRestored: false,
          error: 'No profile found',
        };
      }

      let dailyRestored = false;
      let throwbackRestored = false;

      // Restore daily reminders
      if (profile.reminder_enabled && profile.reminder_time) {
        try {
          const [hours, minutes] = profile.reminder_time.split(':').map(Number);
          const result = await this.scheduleDailyReminder(hours, minutes, true);

          if (result.success) {
            dailyRestored = true;
            logger.debug('[NOTIFICATION] Daily reminder restored successfully', {
              time: profile.reminder_time,
              hours,
              minutes,
            });
          } else {
            logger.error('[NOTIFICATION] Failed to restore daily reminder', result.error);
          }
        } catch (error) {
          logger.error('[NOTIFICATION] Error parsing daily reminder time:', error as Error);
        }
      }

      // Restore throwback reminders
      if (profile.throwback_reminder_enabled && profile.throwback_reminder_time) {
        try {
          const [hours, minutes] = profile.throwback_reminder_time.split(':').map(Number);
          const frequency = profile.throwback_reminder_frequency || 'daily';
          const result = await this.scheduleThrowbackReminder(hours, minutes, true, frequency);

          if (result.success) {
            throwbackRestored = true;
            logger.debug('[NOTIFICATION] Throwback reminder restored successfully', {
              time: profile.throwback_reminder_time,
              hours,
              minutes,
              frequency,
            });
          } else {
            logger.error('[NOTIFICATION] Failed to restore throwback reminder', result.error);
          }
        } catch (error) {
          logger.error('[NOTIFICATION] Error parsing throwback reminder time:', error as Error);
        }
      }

      const restoredCount = await this.getScheduledNotificationsCount();
      logger.info('[NOTIFICATION] User notification settings restoration completed', {
        dailyRestored,
        throwbackRestored,
        totalScheduled: restoredCount,
        userId: session.user.id,
      });

      return {
        success: true,
        dailyRestored,
        throwbackRestored,
      };
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to restore user notification settings:', error as Error);
      return {
        success: false,
        dailyRestored: false,
        throwbackRestored: false,
        error: (error as Error).message,
      };
    }
  }
}

export const notificationService = new NotificationService();
