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
    if (Platform.OS !== 'android') {return;}

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
   * Schedule daily reminder with comprehensive validation
   */
  async scheduleDailyReminder(
    hour: number,
    minute: number,
    enabled = true
  ): Promise<NotificationResult> {
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
      // Validate input parameters
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Invalid time: ${hour}:${minute}`);
      }

      // Cancel existing daily reminders
      await this.cancelDailyReminders();

      if (!enabled) {
        logger.debug('Daily reminder disabled by user');
        return { success: true };
      }

      let identifier: string;

      if (Platform.OS === 'ios') {
        // iOS supports calendar triggers
        identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌟 Minnettarlık Zamanı!',
            body: 'Bugün hangi şeyler için minnettarsın? Bir dakikani ayırıp yaz! ✨',
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            categoryIdentifier: 'DAILY_REMINDER',
            data: {
              type: 'daily_reminder',
              action: 'open_daily_entry',
              date: new Date().toISOString().split('T')[0],
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
        
        logger.debug('iOS calendar trigger scheduled successfully', { identifier, hour, minute });
      } else {
        // Android: Use weekly triggers for each day of the week
        const weekdays = [1, 2, 3, 4, 5, 6, 7]; // Sunday=1, Monday=2, ..., Saturday=7
        const identifiers: string[] = [];
        
        for (const weekday of weekdays) {
          const weeklyIdentifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: '🌟 Minnettarlık Zamanı!',
              body: 'Bugün hangi şeyler için minnettarsın? Bir dakikani ayırıp yaz! ✨',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.HIGH,
              categoryIdentifier: 'DAILY_REMINDER',
              data: {
                type: 'daily_reminder',
                action: 'open_daily_entry',
                weekday,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour,
              minute,
            },
          });
          identifiers.push(weeklyIdentifier);
        }
        
        identifier = identifiers[0]; // Return the first identifier
        logger.debug('Android weekly triggers scheduled successfully', { 
          identifiers, 
          hour, 
          minute,
          weekdays_count: weekdays.length
        });
      }

      // Log the scheduled notification details for debugging
      const scheduledNotifications = await this.getScheduledNotifications();
      logger.debug('All scheduled notifications after scheduling:', {
        count: scheduledNotifications.length,
        notifications: scheduledNotifications.map(n => ({
          identifier: n.identifier,
          title: n.content.title,
          trigger: n.trigger,
        })),
      });

      analyticsService.logEvent('daily_reminder_scheduled', {
        hour,
        minute,
        identifier,
        platform: Platform.OS,
        scheduled_count: scheduledNotifications.length,
      });

      logger.debug('Daily reminder scheduled successfully', {
        hour,
        minute,
        identifier,
        platform: Platform.OS,
        trigger_type: Platform.OS === 'ios' ? 'CALENDAR' : 'WEEKLY',
      });

      return { success: true, identifier };
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
    }
  }

  /**
   * Schedule throwback reminder
   */
  async scheduleThrowbackReminder(
    hour: number,
    minute: number,
    enabled = true,
    frequency: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<NotificationResult> {
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
      // Cancel existing throwback reminders
      await this.cancelThrowbackReminders();

      if (!enabled) {
        logger.debug('Throwback reminder disabled by user');
        return { success: true };
      }

      let identifier: string = '';

      if (frequency === 'daily') {
        // Schedule daily throwback reminders
        if (Platform.OS === 'ios') {
          // iOS: Multiple calendar triggers for each day
          const weekdays = [1, 2, 3, 4, 5, 6, 7]; // All days
          const identifiers: string[] = [];
          
          for (const weekday of weekdays) {
            const dailyIdentifier = await Notifications.scheduleNotificationAsync({
              content: {
                title: '📚 Geçmiş Anıların Zamanı!',
                body: 'Geçen haftalarda neler yazamıştın? Hadi bir göz at! 💭',
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.DEFAULT,
                categoryIdentifier: 'THROWBACK_REMINDER',
                data: {
                  type: 'throwback_reminder',
                  action: 'open_past_entries',
                  frequency: 'daily',
                  weekday,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                weekday,
                hour,
                minute,
              },
            });
            identifiers.push(dailyIdentifier);
          }
          identifier = identifiers[0];
        } else {
          // Android: Multiple weekly triggers for each day
          const weekdays = [1, 2, 3, 4, 5, 6, 7];
          const identifiers: string[] = [];
          
          for (const weekday of weekdays) {
            const dailyIdentifier = await Notifications.scheduleNotificationAsync({
              content: {
                title: '📚 Geçmiş Anıların Zamanı!',
                body: 'Geçen haftalarda neler yazamıştın? Hadi bir göz at! 💭',
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.DEFAULT,
                categoryIdentifier: 'THROWBACK_REMINDER',
                data: {
                  type: 'throwback_reminder',
                  action: 'open_past_entries',
                  frequency: 'daily',
                  weekday,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday,
                hour,
                minute,
              },
            });
            identifiers.push(dailyIdentifier);
          }
          identifier = identifiers[0];
        }
        
        logger.debug('Daily throwback reminders scheduled successfully', { 
          hour, minute, platform: Platform.OS 
        });
        
      } else if (frequency === 'weekly') {
        // Schedule weekly throwback reminders (Sunday)
        if (Platform.OS === 'ios') {
          identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: '📚 Geçmiş Anıların Zamanı!',
              body: 'Geçen haftalarda neler yazamıştın? Hadi bir göz at! 💭',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              categoryIdentifier: 'THROWBACK_REMINDER',
              data: {
                type: 'throwback_reminder',
                action: 'open_past_entries',
                frequency: 'weekly',
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
              body: 'Geçen haftalarda neler yazamıştın? Hadi bir göz at! 💭',
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              categoryIdentifier: 'THROWBACK_REMINDER',
              data: {
                type: 'throwback_reminder',
                action: 'open_past_entries',
                frequency: 'weekly',
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
          hour, minute, platform: Platform.OS 
        });
        
      } else if (frequency === 'monthly') {
        // 🚨 FIX: Robust monthly throwback reminders with auto-rescheduling
        const nextMonthDate = this.calculateNextMonthlyDate(hour, minute);
        
        // Check if we already scheduled this month to prevent duplicates
        const config = await this.getMonthlyNotificationConfig();
        const lastScheduled = config.lastScheduledDate ? new Date(config.lastScheduledDate) : null;
        const isAlreadyScheduled = lastScheduled && 
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
            isReschedule: !!lastScheduled
          });
        } else {
          logger.debug('Monthly notification already scheduled for this month', {
            lastScheduled: lastScheduled?.toISOString(),
            nextScheduled: nextMonthDate.toISOString()
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
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

      for (const notification of scheduledNotifications) {
        if (notification.content.categoryIdentifier === 'THROWBACK_REMINDER') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }

      logger.debug('Throwback reminders cancelled');
    } catch (error) {
      logger.error('Failed to cancel throwback reminders', error as Error);
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
        notifications: notifications.map(n => ({
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
   * Test notification (for debugging)
   */
  async sendTestNotification(): Promise<void> {
    if (!this.hasPermissions) {
      throw new Error('No notification permissions');
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Bildirimi',
        body: 'Bu bir test bildirimidir. Bildirimler çalışıyor! ✅',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });

    analyticsService.logEvent('test_notification_sent');
  }

  // 🚨 FIX: Check and re-schedule monthly notifications on app startup
  private async checkAndRescheduleMonthlyNotifications(): Promise<void> {
    try {
      const config = await this.getMonthlyNotificationConfig();
      if (config.enabled) {
        const result = await this.scheduleThrowbackReminder(config.hour, config.minute, true, 'monthly');
        if (result.success) {
          await this.updateMonthlyNotificationConfig(config.hour, config.minute, true, result.identifier);
        }
      }
    } catch (error) {
      logger.error('Failed to check and reschedule monthly notifications', error as Error);
    }
  }

  // 🚨 FIX: Implement monthly notification configuration
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
    _identifier?: string
  ): Promise<void> {
    const config: MonthlyNotificationConfig = {
      hour,
      minute,
      enabled,
      lastScheduledDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.MONTHLY_NOTIFICATION_CONFIG, JSON.stringify(config));
  }
}

export const notificationService = new NotificationService();
