import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { analyticsService } from './analyticsService';
import { logger } from '../utils/debugConfig';

// Storage keys for notification tracking
const STORAGE_KEYS = {
  LAST_MONTHLY_SCHEDULED: 'last_monthly_notification_scheduled',
  MONTHLY_NOTIFICATION_CONFIG: 'monthly_notification_config',
} as const;

// Configure notification channel for Android
const NOTIFICATION_CHANNEL = {
  name: 'yeser-reminders',
  importance: Notifications.AndroidImportance.HIGH,
  vibrationPattern: [0, 250, 250, 250] as number[],
  lightColor: '#5DB0A5',
  sound: 'default' as const,
} as const;

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationError extends Error {
  code?: string;
  type?: 'permission' | 'scheduling' | 'channel' | 'system';
}

interface NotificationResult {
  success: boolean;
  identifier?: string;
  error?: NotificationError;
}

// Interface for monthly notification configuration
interface MonthlyNotificationConfig {
  hour: number;
  minute: number;
  enabled: boolean;
  lastScheduledDate: string; // ISO string
}

class NotificationService {
  private isInitialized = false;
  private hasPermissions = false;

  // 🚨 FIX: Add debouncing and atomic operation controls
  private schedulingInProgress = new Set<string>();
  private lastSchedulingCall = new Map<string, number>();
  private readonly DEBOUNCE_DELAY = 1000; // 1 second debounce
  private readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_TIMESTAMP_AGE = 60 * 60 * 1000; // 1 hour

  // Reference to cleanup interval to allow teardown
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize notification service with proper channel setup and monthly notification check
   */
  async initialize(): Promise<boolean> {
    try {
      logger.debug('Initializing notification service...');

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      // Request permissions
      const hasPermissions = await this.requestPermissions();
      this.hasPermissions = hasPermissions;
      this.isInitialized = true;

      // 🚨 FIX: Check and re-schedule monthly notifications on app startup
      if (hasPermissions) {
        await this.checkAndRescheduleMonthlyNotifications();
      }

      // 🚨 FIX: Start cleanup interval for debouncing maps (prevent duplicates)
      if (!this.cleanupIntervalId) {
        this.startDebounceCleanup();
      }

      analyticsService.logEvent('notification_service_initialized', {
        platform: Platform.OS,
        has_permissions: hasPermissions,
      });

      logger.debug('Notification service initialized successfully', {
        hasPermissions,
        platform: Platform.OS,
      });

      return hasPermissions;
    } catch (error) {
      logger.error('Failed to initialize notification service', error as Error);
      analyticsService.logEvent('notification_service_init_failed', {
        error_message: (error as Error).message,
        platform: Platform.OS,
      });
      return false;
    }
  }

  /**
   * Set up Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL.name, {
        name: 'Günlük Hatırlatmalar',
        importance: NOTIFICATION_CHANNEL.importance,
        vibrationPattern: NOTIFICATION_CHANNEL.vibrationPattern,
        lightColor: NOTIFICATION_CHANNEL.lightColor,
        sound: NOTIFICATION_CHANNEL.sound, // Note: This should work with 'default'
        description: 'Günlük minnettarlık girişleri için hatırlatmalar',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });

      logger.debug('Android notification channel created successfully');
    } catch (error) {
      logger.error('Failed to set up Android notification channel', error as Error);
      throw new Error('Android channel setup failed');
    }
  }

  /**
   * Request notification permissions with enhanced error handling
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';

      analyticsService.logEvent('notification_permission_requested', {
        existing_status: existingStatus,
        final_status: finalStatus,
        granted,
        platform: Platform.OS,
      });

      if (!granted) {
        logger.warn('Notification permissions not granted', { finalStatus });
      }

      return granted;
    } catch (error) {
      logger.error('Failed to request notification permissions', error as Error);
      analyticsService.logEvent('notification_permission_error', {
        error_message: (error as Error).message,
        platform: Platform.OS,
      });
      return false;
    }
  }

  /**
   * 🚨 ENHANCED: Debounced daily reminder scheduling with atomic operations
   */
  async scheduleDailyReminder(
    hour: number,
    minute: number,
    enabled = true
  ): Promise<NotificationResult> {
    const operationKey = `daily-${hour}-${minute}-${enabled}`;

    // 🚨 FIX: Check debouncing FIRST to prevent unnecessary operations
    const now = Date.now();
    const lastCall = this.lastSchedulingCall.get(operationKey) || 0;

    if (now - lastCall < this.DEBOUNCE_DELAY) {
      logger.debug('Daily reminder scheduling debounced', {
        operationKey,
        timeSinceLastCall: now - lastCall,
      });
      return { success: true, identifier: 'debounced' };
    }

    this.lastSchedulingCall.set(operationKey, now);

    // 🚨 FIX: Prevent concurrent scheduling operations
    if (this.schedulingInProgress.has(operationKey)) {
      logger.debug('Daily reminder scheduling already in progress', { operationKey });
      return { success: true, identifier: 'in-progress' };
    }

    this.schedulingInProgress.add(operationKey);

    // 🚨 FIX: ALWAYS cancel existing notifications first, regardless of debouncing
    try {
      await this.cancelDailyRemindersAtomic();
      logger.debug('Existing daily notifications cancelled before scheduling new ones', {
        hour,
        minute,
        enabled,
      });
    } catch (error) {
      logger.error('Failed to cancel existing daily notifications', error as Error);
    }

    // If disabled, just return after cancellation
    if (!enabled) {
      logger.debug('Daily reminder disabled by user - notifications cancelled');
      this.schedulingInProgress.delete(operationKey);
      return { success: true };
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.hasPermissions) {
        return {
          success: false,
          error: {
            name: 'PermissionError',
            message: 'Notification permissions not granted',
            type: 'permission',
          } as NotificationError,
        };
      }

      // Validate input parameters
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid time: ${hour}:${minute}`);
      }

      // 🚨 FIX: Use platform-appropriate trigger types (calendar not supported on Android)
      if (Platform.OS === 'ios') {
        // iOS: Use calendar trigger (works correctly)
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌟 Minnettarlık Zamanı!',
            body: 'Yeni kayıt ekle - Bugün neye minnettarsın? Dokunarak hemen yaz! ✨',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            categoryIdentifier: 'DAILY_REMINDER',
            data: {
              type: 'daily_reminder',
              action: 'open_daily_entry',
              date: new Date().toISOString().split('T')[0],
              scheduledAt: new Date().toISOString(),
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour,
            minute,
            second: 0,
            repeats: true,
          },
        });

        analyticsService.logEvent('daily_reminder_scheduled', {
          hour,
          minute,
          identifier,
          platform: Platform.OS,
          method: 'calendar_ios',
        });

        logger.debug('Daily reminder scheduled successfully with iOS calendar trigger', {
          hour,
          minute,
          identifier,
          platform: Platform.OS,
        });

        return { success: true, identifier };
      } else {
        // Android: Use weekly triggers for all 7 days (proper daily simulation)
        const weekDays = [1, 2, 3, 4, 5, 6, 7]; // Sunday through Saturday
        const identifiers: string[] = [];

        for (const weekday of weekDays) {
          const dayIdentifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: '🌟 Minnettarlık Zamanı!',
              body: 'Yeni kayıt ekle - Bugün neye minnettarsın? Dokunarak hemen yaz! ✨',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              categoryIdentifier: 'DAILY_REMINDER',
              data: {
                type: 'daily_reminder',
                action: 'open_daily_entry',
                date: new Date().toISOString().split('T')[0],
                scheduledAt: new Date().toISOString(),
                weekday: weekday,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour,
              minute,
            },
          });
          identifiers.push(dayIdentifier);
        }

        analyticsService.logEvent('daily_reminder_scheduled', {
          hour,
          minute,
          identifier: identifiers[0], // Log first identifier
          identifiers_count: identifiers.length,
          platform: Platform.OS,
          method: 'weekly_android_7days',
        });

        logger.debug('Daily reminder scheduled successfully with Android weekly triggers', {
          hour,
          minute,
          identifiers,
          identifiers_count: identifiers.length,
          platform: Platform.OS,
        });

        return { success: true, identifier: identifiers[0] };
      }
    } catch (error) {
      const notificationError: NotificationError = {
        name: 'SchedulingError',
        message: (error as Error).message,
        type: 'scheduling',
      };

      logger.error('Failed to schedule daily reminder', error as Error);
      analyticsService.logEvent('daily_reminder_schedule_failed', {
        error_message: notificationError.message,
        hour,
        minute,
        platform: Platform.OS,
      });

      return { success: false, error: notificationError };
    } finally {
      // 🚨 FIX: Always clean up the operation lock
      this.schedulingInProgress.delete(operationKey);
    }
  }

  /**
   * 🚨 ENHANCED: Atomic cancellation for daily reminders
   */
  private async cancelDailyRemindersAtomic(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const dailyNotifications = scheduledNotifications.filter(
        (notification) => notification.content.categoryIdentifier === 'DAILY_REMINDER'
      );

      if (dailyNotifications.length === 0) {
        logger.debug('No daily reminders to cancel');
        return;
      }

      // 🚨 FIX: Batch cancellation for better performance and atomicity
      const cancellationPromises = dailyNotifications.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      );

      await Promise.all(cancellationPromises);

      logger.debug('Daily reminders cancelled atomically', {
        cancelled_count: dailyNotifications.length,
        identifiers: dailyNotifications.map((n) => n.identifier),
      });

      // Verify cancellation worked
      const remainingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const remainingDaily = remainingNotifications.filter(
        (notification) => notification.content.categoryIdentifier === 'DAILY_REMINDER'
      );

      if (remainingDaily.length > 0) {
        logger.warn('Some daily notifications were not cancelled', {
          remaining_count: remainingDaily.length,
          identifiers: remainingDaily.map((n) => n.identifier),
        });
      }
    } catch (error) {
      logger.error('Failed to cancel daily reminders atomically', error as Error);
      throw error;
    }
  }

  /**
   * 🚨 ENHANCED: Schedule throwback reminder with debouncing and atomic operations
   */
  async scheduleThrowbackReminder(
    hour: number,
    minute: number,
    enabled = true,
    frequency: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<NotificationResult> {
    const operationKey = `throwback-${hour}-${minute}-${enabled}-${frequency}`;

    // 🚨 FIX: Check debouncing FIRST to prevent unnecessary operations
    const now = Date.now();
    const lastCall = this.lastSchedulingCall.get(operationKey) || 0;

    if (now - lastCall < this.DEBOUNCE_DELAY) {
      logger.debug('Throwback reminder scheduling debounced', {
        operationKey,
        timeSinceLastCall: now - lastCall,
      });
      return { success: true, identifier: 'debounced' };
    }

    this.lastSchedulingCall.set(operationKey, now);

    // 🚨 FIX: Prevent concurrent scheduling operations
    if (this.schedulingInProgress.has(operationKey)) {
      logger.debug('Throwback reminder scheduling already in progress', { operationKey });
      return { success: true, identifier: 'in-progress' };
    }

    this.schedulingInProgress.add(operationKey);

    // 🚨 FIX: ALWAYS cancel existing notifications first, regardless of debouncing
    try {
      await this.cancelThrowbackRemindersAtomic();
      logger.debug('Existing throwback notifications cancelled before scheduling new ones', {
        hour,
        minute,
        enabled,
        frequency,
      });
    } catch (error) {
      logger.error('Failed to cancel existing throwback notifications', error as Error);
    }

    // If disabled, just return after cancellation
    if (!enabled) {
      logger.debug('Throwback reminder disabled by user - notifications cancelled');
      this.schedulingInProgress.delete(operationKey);
      return { success: true };
    }

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.hasPermissions) {
        return {
          success: false,
          error: {
            name: 'PermissionError',
            message: 'Notification permissions not granted',
            type: 'permission',
          } as NotificationError,
        };
      }

      let identifier: string = '';

      if (frequency === 'daily') {
        // 🚨 FIX: Use platform-appropriate trigger types (calendar not supported on Android)
        if (Platform.OS === 'ios') {
          // iOS: Use calendar trigger for daily
          identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: '📚 Geçmiş Anıların Zamanı!',
              body: 'Geçen haftalarda neler yazmıştın? Hadi bir göz at! 💭',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              categoryIdentifier: 'THROWBACK_REMINDER',
              data: {
                type: 'throwback_reminder',
                action: 'open_past_entries',
                frequency: 'daily',
                scheduledAt: new Date().toISOString(),
                method: 'calendar_ios',
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              hour,
              minute,
              second: 0,
              repeats: true,
            },
          });
        } else {
          // Android: Use weekly triggers for all 7 days (proper daily simulation)
          const weekDays = [1, 2, 3, 4, 5, 6, 7]; // Sunday through Saturday
          const identifiers: string[] = [];

          for (const weekday of weekDays) {
            const dayIdentifier = await Notifications.scheduleNotificationAsync({
              content: {
                title: '📚 Geçmiş Anıların Zamanı!',
                body: 'Geçen haftalarda neler yazmıştın? Hadi bir göz at! 💭',
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.DEFAULT,
                categoryIdentifier: 'THROWBACK_REMINDER',
                data: {
                  type: 'throwback_reminder',
                  action: 'open_past_entries',
                  frequency: 'daily',
                  scheduledAt: new Date().toISOString(),
                  method: 'weekly_android_7days',
                  weekday: weekday,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday,
                hour,
                minute,
              },
            });
            identifiers.push(dayIdentifier);
          }

          identifier = identifiers[0]; // Return first identifier for consistency
        }

        logger.debug('Daily throwback reminders scheduled successfully', {
          hour,
          minute,
          platform: Platform.OS,
          method: Platform.OS === 'ios' ? 'calendar_ios' : 'weekly_android_7days',
        });
      } else if (frequency === 'weekly') {
        // Schedule weekly throwback reminders (Sunday)
        if (Platform.OS === 'ios') {
          identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: '📚 Geçmiş Anıların Zamanı!',
              body: 'Geçen haftalarda neler yazmıştın? Hadi bir göz at! 💭',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              categoryIdentifier: 'THROWBACK_REMINDER',
              data: {
                type: 'throwback_reminder',
                action: 'open_past_entries',
                frequency: 'weekly',
                scheduledAt: new Date().toISOString(),
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
              weekday: 1, // Sunday = 1
              hour,
              minute,
            },
          });
        } else {
          identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: '📚 Geçmiş Anıların Zamanı!',
              body: 'Geçen haftalarda neler yazmıştın? Hadi bir göz at! 💭',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              categoryIdentifier: 'THROWBACK_REMINDER',
              data: {
                type: 'throwback_reminder',
                action: 'open_past_entries',
                frequency: 'weekly',
                scheduledAt: new Date().toISOString(),
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: 1, // Sunday = 1
              hour,
              minute,
            },
          });
        }

        logger.debug('Weekly throwback reminder scheduled successfully', {
          hour,
          minute,
          platform: Platform.OS,
        });
      } else if (frequency === 'monthly') {
        // Enhanced monthly throwback reminders with auto-rescheduling
        const nextMonthDate = this.calculateNextMonthlyDate(hour, minute);

        // Check if we already scheduled this month to prevent duplicates
        const config = await this.getMonthlyNotificationConfig();
        const lastScheduled = config.lastScheduledDate ? new Date(config.lastScheduledDate) : null;
        const isAlreadyScheduled =
          lastScheduled &&
          lastScheduled.getMonth() === nextMonthDate.getMonth() &&
          lastScheduled.getFullYear() === nextMonthDate.getFullYear();

        if (!isAlreadyScheduled) {
          identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: '📚 Geçmiş Anıların Zamanı!',
              body: 'Geçen haftalarda neler yazmıştın? Haydi bir göz at! 💭',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              categoryIdentifier: 'THROWBACK_REMINDER',
              data: {
                type: 'throwback_reminder',
                action: 'open_past_entries',
                frequency: 'monthly',
                reschedule: 'true', // Flag for auto-rescheduling
                scheduledAt: new Date().toISOString(),
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: nextMonthDate,
            },
          });

          // Store configuration for re-scheduling
          await this.updateMonthlyNotificationConfig(hour, minute, true, identifier);

          logger.debug('Monthly throwback reminder scheduled successfully', {
            identifier,
            hour,
            minute,
            date: nextMonthDate,
            platform: Platform.OS,
            isReschedule: !!lastScheduled,
          });
        } else {
          logger.debug('Monthly notification already scheduled for this month', {
            lastScheduled: lastScheduled?.toISOString(),
            nextScheduled: nextMonthDate.toISOString(),
          });
          // Return existing identifier or create a placeholder
          identifier = config.lastScheduledDate || 'monthly-already-scheduled';
        }
      }

      analyticsService.logEvent('throwback_reminder_scheduled', {
        hour,
        minute,
        frequency,
        identifier,
        platform: Platform.OS,
      });

      logger.debug('Throwback reminder scheduled successfully', {
        hour,
        minute,
        frequency,
        identifier,
        platform: Platform.OS,
      });

      return { success: true, identifier };
    } catch (error) {
      const notificationError: NotificationError = {
        name: 'SchedulingError',
        message: (error as Error).message,
        type: 'scheduling',
      };

      logger.error('Failed to schedule throwback reminder', error as Error);
      analyticsService.logEvent('throwback_reminder_schedule_failed', {
        error_message: notificationError.message,
        hour,
        minute,
        frequency,
        platform: Platform.OS,
      });

      return { success: false, error: notificationError };
    } finally {
      // 🚨 FIX: Always clean up the operation lock
      this.schedulingInProgress.delete(operationKey);
    }
  }

  /**
   * Calculate daily trigger time (kept for future use)
   */
  private calculateDailyTrigger(hour: number, minute: number): Notifications.DateTriggerInput {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: this.getNextTriggerDate(hour, minute),
    };
  }

  /**
   * Get next trigger date for daily notifications (kept for future use)
   */
  private getNextTriggerDate(hour: number, minute: number): Date {
    const now = new Date();
    const triggerTime = new Date();
    triggerTime.setHours(hour, minute, 0, 0);

    // If the time has passed today, schedule for tomorrow
    if (triggerTime <= now) {
      triggerTime.setDate(triggerTime.getDate() + 1);
    }

    return triggerTime;
  }

  /**
   * Calculate weekly trigger time (kept for future use)
   */
  private calculateWeeklyTrigger(
    hour: number,
    minute: number,
    weekday: number
  ): Notifications.WeeklyTriggerInput {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
    };
  }

  /**
   * 🚨 FIX: Calculate next monthly notification date (1st of next month)
   */
  private calculateNextMonthlyDate(hour: number, minute: number): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    nextMonth.setHours(hour, minute, 0, 0);
    return nextMonth;
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      analyticsService.logEvent('all_notifications_cancelled');
      logger.debug('All scheduled notifications cancelled');
    } catch (error) {
      logger.error('Failed to cancel all notifications', error as Error);
      throw error;
    }
  }

  /**
   * Cancel daily reminders specifically
   */
  async cancelDailyReminders(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

      for (const notification of scheduledNotifications) {
        if (notification.content.categoryIdentifier === 'DAILY_REMINDER') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      logger.debug('Daily reminders cancelled');
    } catch (error) {
      logger.error('Failed to cancel daily reminders', error as Error);
      throw error;
    }
  }

  /**
   * Cancel throwback reminders specifically
   */
  async cancelThrowbackReminders(): Promise<void> {
    await this.cancelThrowbackRemindersAtomic();
  }

  /**
   * 🚨 ENHANCED: Atomic cancellation for throwback reminders
   */
  private async cancelThrowbackRemindersAtomic(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const throwbackNotifications = scheduledNotifications.filter(
        (notification) => notification.content.categoryIdentifier === 'THROWBACK_REMINDER'
      );

      if (throwbackNotifications.length === 0) {
        logger.debug('No throwback reminders to cancel');
        return;
      }

      // 🚨 FIX: Batch cancellation for better performance and atomicity
      const cancellationPromises = throwbackNotifications.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      );

      await Promise.all(cancellationPromises);

      logger.debug('Throwback reminders cancelled atomically', {
        cancelled_count: throwbackNotifications.length,
        identifiers: throwbackNotifications.map((n) => n.identifier),
      });

      // Verify cancellation worked
      const remainingNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const remainingThrowback = remainingNotifications.filter(
        (notification) => notification.content.categoryIdentifier === 'THROWBACK_REMINDER'
      );

      if (remainingThrowback.length > 0) {
        logger.warn('Some throwback notifications were not cancelled', {
          remaining_count: remainingThrowback.length,
          identifiers: remainingThrowback.map((n) => n.identifier),
        });
      }
    } catch (error) {
      logger.error('Failed to cancel throwback reminders atomically', error as Error);
      throw error;
    }
  }

  /**
   * Get notification permission status
   */
  async getPermissionStatus(): Promise<Notifications.PermissionStatus> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  /**
   * Get all scheduled notifications for debugging
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Get detailed information about scheduled notifications for debugging
   */
  async getScheduledNotificationsDebugInfo(): Promise<{
    count: number;
    notifications: Array<{
      identifier: string;
      title: string;
      body: string;
      trigger: Notifications.NotificationTrigger | null;
      categoryIdentifier?: string;
    }>;
  }> {
    try {
      const notifications = await this.getScheduledNotifications();
      return {
        count: notifications.length,
        notifications: notifications.map((n) => ({
          identifier: n.identifier,
          title: n.content.title || 'No title',
          body: n.content.body || 'No body',
          trigger: n.trigger,
          categoryIdentifier: n.content.categoryIdentifier || undefined,
        })),
      };
    } catch (error) {
      logger.error('Failed to get scheduled notifications debug info', error as Error);
      return { count: 0, notifications: [] };
    }
  }

  /**
   * Create an immediate test notification for debugging notification navigation
   */
  async sendTestNotification(type: 'daily' | 'throwback' = 'daily'): Promise<NotificationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.hasPermissions) {
      return {
        success: false,
        error: {
          name: 'PermissionError',
          message: 'Notification permissions not granted',
          type: 'permission',
        } as NotificationError,
      };
    }

    try {
      let identifier: string;

      if (type === 'daily') {
        logger.debug('Creating daily test notification with navigation data...', {
          categoryIdentifier: 'DAILY_REMINDER',
          data: {
            type: 'daily_reminder',
            action: 'open_daily_entry',
            date: new Date().toISOString().split('T')[0],
            isTest: 'true',
          },
        });

        identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌟 Test: Minnettarlık Zamanı!',
            body: 'Bu bir test bildirimi. Yeni kayıt ekranına yönlendirileceksiniz.',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            categoryIdentifier: 'DAILY_REMINDER',
            data: {
              type: 'daily_reminder',
              action: 'open_daily_entry',
              date: new Date().toISOString().split('T')[0],
              isTest: 'true',
            },
          },
          trigger: null, // Send immediately
        });
      } else {
        logger.debug('Creating throwback test notification with navigation data...', {
          categoryIdentifier: 'THROWBACK_REMINDER',
          data: {
            type: 'throwback_reminder',
            action: 'open_past_entries',
            frequency: 'test',
            isTest: 'true',
          },
        });

        identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📚 Test: Geçmiş Anıların Zamanı!',
            body: 'Bu bir test bildirimi. Geçmiş kayıtlarınıza yönlendirileceksiniz.',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
            categoryIdentifier: 'THROWBACK_REMINDER',
            data: {
              type: 'throwback_reminder',
              action: 'open_past_entries',
              frequency: 'test',
              isTest: 'true',
            },
          },
          trigger: null, // Send immediately
        });
      }

      logger.debug('Test notification sent successfully', {
        type,
        identifier,
        platform: Platform.OS,
        message: `Test ${type} notification should appear immediately and navigate when tapped`,
      });

      return { success: true, identifier };
    } catch (error) {
      const notificationError: NotificationError = {
        name: 'TestNotificationError',
        message: (error as Error).message,
        type: 'scheduling',
      };

      logger.error('Failed to send test notification', error as Error);
      return { success: false, error: notificationError };
    }
  }

  /**
   * 🚨 FIX: Check and reschedule monthly notifications on app startup
   * Now properly checks user profile settings instead of separate config
   */
  private async checkAndRescheduleMonthlyNotifications(): Promise<void> {
    try {
      logger.debug('Checking monthly notifications for rescheduling...');

      // 🚨 FIX: Import and use actual profile data instead of separate config
      const { supabase } = await import('../utils/supabaseClient');

      // Check if user is authenticated
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        logger.debug('No authenticated user - skipping monthly notification rescheduling');
        return;
      }

      // Get user's actual profile settings
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('throwback_reminder_enabled, throwback_reminder_frequency, throwback_reminder_time')
        .eq('id', sessionData.session.user.id)
        .single();

      if (profileError || !profileData) {
        logger.debug('Could not fetch user profile - skipping monthly notification rescheduling', {
          error: profileError?.message,
        });
        return;
      }

      // 🚨 FIX: Only proceed if user actually has throwback reminders enabled with monthly frequency
      if (
        !profileData.throwback_reminder_enabled ||
        profileData.throwback_reminder_frequency !== 'monthly'
      ) {
        logger.debug(
          'User does not have monthly throwback reminders enabled - skipping rescheduling',
          {
            throwback_enabled: profileData.throwback_reminder_enabled,
            frequency: profileData.throwback_reminder_frequency,
          }
        );
        return;
      }

      // Parse time from user settings
      const timeString = profileData.throwback_reminder_time || '09:00:00';
      const [hour, minute] = timeString.split(':').map(Number);

      // Check if there are existing monthly notifications
      const scheduledNotifications = await this.getScheduledNotifications();
      const monthlyNotifications = scheduledNotifications.filter(
        (n) =>
          n.content.categoryIdentifier === 'THROWBACK_REMINDER' &&
          n.content.data?.frequency === 'monthly'
      );

      // If no monthly notifications are scheduled but user wants them, reschedule
      if (monthlyNotifications.length === 0) {
        logger.debug('Rescheduling missing monthly notification based on user profile', {
          hour,
          minute,
          user_enabled: profileData.throwback_reminder_enabled,
          user_frequency: profileData.throwback_reminder_frequency,
        });

        const nextDate = this.calculateNextMonthlyDate(hour, minute);

        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📚 Geçmiş Anıların Zamanı!',
            body: 'Geçen haftalarda neler yazmıştın? Haydi bir göz at! 💭',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.DEFAULT,
            categoryIdentifier: 'THROWBACK_REMINDER',
            data: {
              type: 'throwback_reminder',
              action: 'open_past_entries',
              frequency: 'monthly',
              reschedule: 'true',
              scheduledAt: new Date().toISOString(),
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: nextDate,
          },
        });

        // 🚨 FIX: Update the stored config to reflect actual user settings
        await this.updateMonthlyNotificationConfig(hour, minute, true, identifier);

        logger.debug('Monthly notification rescheduled successfully', {
          nextDate: nextDate.toISOString(),
          identifier,
          userSettings: {
            enabled: profileData.throwback_reminder_enabled,
            frequency: profileData.throwback_reminder_frequency,
            time: timeString,
          },
        });
      } else {
        logger.debug('Monthly notifications already scheduled', {
          count: monthlyNotifications.length,
          userSettings: {
            enabled: profileData.throwback_reminder_enabled,
            frequency: profileData.throwback_reminder_frequency,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to check/reschedule monthly notifications', error as Error);
      // Don't throw - this is a background operation that shouldn't break app startup
    }
  }

  // 🚨 FIX: Monthly notification configuration now only used for tracking/debugging
  // Main logic uses actual user profile settings
  private async getMonthlyNotificationConfig(): Promise<MonthlyNotificationConfig> {
    const config = await AsyncStorage.getItem(STORAGE_KEYS.MONTHLY_NOTIFICATION_CONFIG);
    if (config) {
      return JSON.parse(config);
    } else {
      return {
        hour: 12,
        minute: 0,
        enabled: false,
        lastScheduledDate: '',
      };
    }
  }

  private async updateMonthlyNotificationConfig(
    hour: number,
    minute: number,
    enabled: boolean,
    identifier?: string
  ): Promise<void> {
    // 🚨 FIX: This is now only used for tracking/debugging purposes
    // The actual logic uses user profile settings from database
    const config: MonthlyNotificationConfig = {
      hour,
      minute,
      enabled,
      lastScheduledDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.MONTHLY_NOTIFICATION_CONFIG, JSON.stringify(config));

    logger.debug('Monthly notification config updated for tracking', {
      hour,
      minute,
      enabled,
      identifier,
      note: 'This is for tracking only - actual logic uses user profile settings',
    });
  }

  /**
   * 🚨 FIX: Cleanup old timestamps to prevent memory leaks
   */
  private startDebounceCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, timestamp] of this.lastSchedulingCall.entries()) {
        if (now - timestamp > this.MAX_TIMESTAMP_AGE) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.lastSchedulingCall.delete(key));

      if (keysToDelete.length > 0) {
        logger.debug('Cleaned up old debouncing timestamps', {
          cleaned_count: keysToDelete.length,
          remaining_count: this.lastSchedulingCall.size,
        });
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Shutdown the service – clears timers & resets flags
   */
  shutdown(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }

    this.isInitialized = false;
    this.schedulingInProgress.clear();
    this.lastSchedulingCall.clear();

    logger.debug('🔕 Notification Service shutdown complete');
  }
}

export const notificationService = new NotificationService();
