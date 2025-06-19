# Notifications System

> Intelligent reminder and engagement system to maintain consistent gratitude practice.

## 📱 Overview

The Notifications system enhances user engagement through:

- **Daily Reminders** - Customizable time-based prompts for gratitude practice
- **Throwback Notifications** - Weekly reminders featuring past gratitude entries
- **Streak Alerts** - Motivational notifications for streak milestones and warnings
- **Achievement Notifications** - Celebrations for goals and accomplishments
- **Smart Scheduling** - Adaptive timing based on user behavior patterns

## 🏗 System Architecture

### Notification Types

```typescript
// Core notification interfaces
interface NotificationBase {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  scheduledTime?: Date;
  isScheduled: boolean;
  isDelivered: boolean;
  createdAt: Date;
}

type NotificationType =
  | 'daily_reminder'
  | 'throwback'
  | 'streak_milestone'
  | 'streak_warning'
  | 'goal_achievement'
  | 'weekly_summary'
  | 'onboarding_followup';

interface DailyReminderNotification extends NotificationBase {
  type: 'daily_reminder';
  reminderTime: string; // HH:mm format
  isRecurring: boolean;
  daysOfWeek: number[]; // 0-6, Sunday = 0
}

interface ThrowbackNotification extends NotificationBase {
  type: 'throwback';
  originalEntryDate: string;
  statementPreview: string;
  yearsAgo: number;
}

interface StreakNotification extends NotificationBase {
  type: 'streak_milestone' | 'streak_warning';
  streakLength: number;
  milestoneType?: 'weekly' | 'monthly' | 'yearly';
}
```

### Database Schema

```sql
-- User notification preferences
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    daily_reminder_enabled BOOLEAN DEFAULT true,
    reminder_time TIME DEFAULT '09:00:00',
    reminder_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,0], -- All days
    throwback_enabled BOOLEAN DEFAULT true,
    throwback_day INTEGER DEFAULT 0, -- Sunday
    streak_notifications BOOLEAN DEFAULT true,
    achievement_notifications BOOLEAN DEFAULT true,
    weekly_summary_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification delivery log
CREATE TABLE public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled', -- scheduled, delivered, failed, cancelled
    expo_receipt_id TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notification_deliveries_user_type ON notification_deliveries(user_id, notification_type);
CREATE INDEX idx_notification_deliveries_scheduled ON notification_deliveries(scheduled_for) WHERE status = 'scheduled';
```

## 🔔 Notification Service Implementation

### Core Service Class

```typescript
// Main notification service
class NotificationService {
  private expo = new Expo();
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      logger.warn('Notification permission not granted');
      return;
    }

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Register for push notifications
    await this.registerForPushNotifications();

    this.isInitialized = true;
    logger.info('Notification service initialized');
  }

  private async registerForPushNotifications(): Promise<string | null> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas.projectId;
      const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });

      // Save token to user profile
      await this.updatePushToken(pushToken.data);

      return pushToken.data;
    } catch (error) {
      logger.error('Failed to get push token:', error);
      return null;
    }
  }

  private async updatePushToken(token: string): Promise<void> {
    try {
      await profileApi.updateProfile({ expo_push_token: token });
      logger.debug('Push token updated successfully');
    } catch (error) {
      logger.error('Failed to update push token:', error);
    }
  }

  // Schedule daily reminder notification
  async scheduleDailyReminder(
    userId: string,
    reminderTime: string,
    daysOfWeek: number[]
  ): Promise<void> {
    try {
      // Cancel existing daily reminders
      await this.cancelNotificationsOfType('daily_reminder');

      // Schedule for each enabled day of the week
      for (const dayOfWeek of daysOfWeek) {
        const notificationId = await this.scheduleWeeklyNotification({
          type: 'daily_reminder',
          title: 'Günlük Minnet Zamanı 🙏',
          body: 'Bugün için minnettarlığını paylaş ve pozitif enerjini artır!',
          hour: parseInt(reminderTime.split(':')[0]),
          minute: parseInt(reminderTime.split(':')[1]),
          weekday: dayOfWeek + 1, // Expo uses 1-7, Sunday = 1
          repeats: true,
        });

        logger.debug(`Scheduled daily reminder for day ${dayOfWeek}: ${notificationId}`);
      }

      // Log to database
      await this.logNotificationSchedule(userId, 'daily_reminder', reminderTime);
    } catch (error) {
      logger.error('Failed to schedule daily reminder:', error);
      throw error;
    }
  }

  // Schedule throwback notification
  async scheduleThrowbackNotification(userId: string, entry: GratitudeEntry): Promise<void> {
    try {
      const { entry_date, statements } = entry;
      const entryDate = new Date(entry_date);
      const now = new Date();
      const yearsAgo = now.getFullYear() - entryDate.getFullYear();

      if (yearsAgo < 1) return; // Only for entries at least 1 year old

      const previewStatement = statements[0] || '';
      const shortPreview =
        previewStatement.length > 50 ? `${previewStatement.substring(0, 50)}...` : previewStatement;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${yearsAgo} Yıl Önce Bugün 💭`,
          body: `"${shortPreview}" diye yazmıştın. Hala aynı şekilde hissediyor musun?`,
          data: {
            type: 'throwback',
            entryId: entry.id,
            entryDate: entry_date,
            yearsAgo: yearsAgo.toString(),
          },
        },
        trigger: {
          hour: 19, // 7 PM
          minute: 0,
          repeats: false,
        },
      });

      // Log to database
      await this.logNotificationSchedule(userId, 'throwback', new Date().toISOString(), {
        entryId: entry.id,
        yearsAgo,
      });

      logger.debug(`Scheduled throwback notification: ${notificationId}`);
    } catch (error) {
      logger.error('Failed to schedule throwback notification:', error);
    }
  }

  // Send immediate streak milestone notification
  async sendStreakMilestoneNotification(
    userId: string,
    streakLength: number,
    milestoneType: 'weekly' | 'monthly' | 'yearly'
  ): Promise<void> {
    try {
      const milestoneMessages = {
        weekly: {
          title: '🎉 Harika Bir Hafta!',
          body: `${streakLength} gün üst üste minnet! Bu momentum devam etsin!`,
        },
        monthly: {
          title: '🏆 Ay Ustası Oldun!',
          body: `${streakLength} günlük serin ile inanılmaz bir başarı gösterdin!`,
        },
        yearly: {
          title: '👑 Efsane Oldun!',
          body: `${streakLength} gün! Bu kararlılık gerçekten ilham verici!`,
        },
      };

      const message = milestoneMessages[milestoneType];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          data: {
            type: 'streak_milestone',
            streakLength: streakLength.toString(),
            milestoneType,
          },
        },
        trigger: null, // Send immediately
      });

      // Log to database
      await this.logNotificationSchedule(userId, 'streak_milestone', new Date().toISOString(), {
        streakLength,
        milestoneType,
      });

      logger.info(`Sent streak milestone notification: ${streakLength} days`);
    } catch (error) {
      logger.error('Failed to send streak milestone notification:', error);
    }
  }

  // Send streak warning notification
  async sendStreakWarningNotification(userId: string, streakLength: number): Promise<void> {
    try {
      const warningMessage =
        streakLength === 0
          ? 'Yeni bir başlangıç zamanı! Bugün bir minnet ifadesi paylaş.'
          : `${streakLength} günlük serin risk altında! Bugün yazmayı unutma.`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Seri Uyarısı',
          body: warningMessage,
          data: {
            type: 'streak_warning',
            streakLength: streakLength.toString(),
          },
        },
        trigger: {
          seconds: 2 * 60 * 60, // 2 hours from now
        },
      });

      logger.info(`Sent streak warning notification for ${streakLength} day streak`);
    } catch (error) {
      logger.error('Failed to send streak warning notification:', error);
    }
  }

  // Utility methods
  private async scheduleWeeklyNotification(params: {
    type: string;
    title: string;
    body: string;
    hour: number;
    minute: number;
    weekday: number;
    repeats: boolean;
  }): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: { type: params.type },
      },
      trigger: {
        hour: params.hour,
        minute: params.minute,
        weekday: params.weekday,
        repeats: params.repeats,
      },
    });
  }

  private async cancelNotificationsOfType(type: string): Promise<void> {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }

  private async logNotificationSchedule(
    userId: string,
    type: string,
    scheduledFor: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // This would call your backend API to log the notification
      await fetch('/api/notifications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          scheduledFor,
          metadata: metadata || {},
        }),
      });
    } catch (error) {
      logger.error('Failed to log notification schedule:', error);
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
```

## ⏰ Smart Scheduling System

### Adaptive Reminder Logic

```typescript
// Smart scheduling based on user behavior
interface UserBehaviorPattern {
  preferredTimeSlots: TimeSlot[];
  avgResponseTime: number; // minutes after notification
  completionRate: number;
  lastActiveTime: string;
  timezone: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
  weekday: number;
  successRate: number;
}

class SmartScheduler {
  // Analyze user behavior to optimize notification timing
  async analyzeUserBehavior(userId: string): Promise<UserBehaviorPattern> {
    try {
      // Fetch user's historical notification response data
      const responses = await this.getNotificationResponses(userId);
      const entries = await gratitudeApi.getAllUserEntries(userId);

      // Calculate preferred time slots
      const timeSlots = this.calculatePreferredTimeSlots(responses, entries);

      // Calculate average response time
      const avgResponseTime = this.calculateAverageResponseTime(responses);

      // Calculate completion rate
      const completionRate = responses.filter((r) => r.didComplete).length / responses.length;

      // Get last active time
      const lastEntry = entries[0]; // Assuming sorted by date desc
      const lastActiveTime = lastEntry?.created_at || new Date().toISOString();

      return {
        preferredTimeSlots: timeSlots,
        avgResponseTime,
        completionRate,
        lastActiveTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } catch (error) {
      logger.error('Failed to analyze user behavior:', error);
      // Return default pattern
      return this.getDefaultBehaviorPattern();
    }
  }

  private calculatePreferredTimeSlots(
    responses: NotificationResponse[],
    entries: GratitudeEntry[]
  ): TimeSlot[] {
    const timeSlotMap = new Map<string, { count: number; success: number }>();

    // Analyze successful notification responses
    responses.forEach((response) => {
      if (response.didComplete) {
        const time = new Date(response.notificationTime);
        const key = `${time.getDay()}-${time.getHours()}`;

        const existing = timeSlotMap.get(key) || { count: 0, success: 0 };
        timeSlotMap.set(key, {
          count: existing.count + 1,
          success: existing.success + 1,
        });
      }
    });

    // Convert to TimeSlot objects and sort by success rate
    const timeSlots: TimeSlot[] = [];
    timeSlotMap.forEach((stats, key) => {
      const [weekday, hour] = key.split('-').map(Number);
      timeSlots.push({
        hour,
        minute: 0, // Simplified to hourly slots
        weekday,
        successRate: stats.success / stats.count,
      });
    });

    return timeSlots
      .filter((slot) => slot.successRate > 0.3) // Only include slots with >30% success
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5); // Top 5 time slots
  }

  private calculateAverageResponseTime(responses: NotificationResponse[]): number {
    const responseTimes = responses
      .filter((r) => r.didComplete && r.responseTime)
      .map((r) => r.responseTime!);

    if (responseTimes.length === 0) return 60; // Default 1 hour

    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  // Get optimal reminder time based on behavior analysis
  async getOptimalReminderTime(userId: string): Promise<{
    hour: number;
    minute: number;
    confidence: number;
  }> {
    const behavior = await this.analyzeUserBehavior(userId);

    if (behavior.preferredTimeSlots.length === 0) {
      // Return default time if no pattern found
      return { hour: 9, minute: 0, confidence: 0.5 };
    }

    const bestSlot = behavior.preferredTimeSlots[0];
    return {
      hour: bestSlot.hour,
      minute: bestSlot.minute,
      confidence: bestSlot.successRate,
    };
  }

  private getDefaultBehaviorPattern(): UserBehaviorPattern {
    return {
      preferredTimeSlots: [
        { hour: 9, minute: 0, weekday: 1, successRate: 0.7 }, // Monday 9 AM
        { hour: 19, minute: 0, weekday: 0, successRate: 0.6 }, // Sunday 7 PM
      ],
      avgResponseTime: 60,
      completionRate: 0.5,
      lastActiveTime: new Date().toISOString(),
      timezone: 'UTC',
    };
  }
}
```

## 🎯 Notification Hooks & Integration

### React Hooks for Notification Management

```typescript
// Hook for managing notification preferences
export const useNotificationPreferences = () => {
  const { profile, updateProfile } = useUserProfile();

  const preferences = useMemo(
    () => ({
      dailyReminderEnabled: profile?.reminder_enabled || false,
      reminderTime: profile?.reminder_time || '09:00',
      throwbackEnabled: profile?.throwback_enabled || true,
      achievementNotifications: profile?.achievement_notifications || true,
    }),
    [profile]
  );

  const updatePreferences = useCallback(
    async (newPreferences: Partial<typeof preferences>) => {
      try {
        await updateProfile({
          reminder_enabled: newPreferences.dailyReminderEnabled,
          reminder_time: newPreferences.reminderTime,
          throwback_enabled: newPreferences.throwbackEnabled,
          achievement_notifications: newPreferences.achievementNotifications,
        });

        // Update notification schedules
        if (
          newPreferences.dailyReminderEnabled !== undefined ||
          newPreferences.reminderTime !== undefined
        ) {
          await notificationService.scheduleDailyReminder(
            profile!.id,
            newPreferences.reminderTime || preferences.reminderTime,
            [0, 1, 2, 3, 4, 5, 6] // All days
          );
        }

        analyticsService.logEvent('notification_preferences_updated', {
          daily_reminder: newPreferences.dailyReminderEnabled,
          reminder_time: newPreferences.reminderTime,
          throwback: newPreferences.throwbackEnabled,
        });
      } catch (error) {
        logger.error('Failed to update notification preferences:', error);
        throw error;
      }
    },
    [profile, updateProfile]
  );

  return {
    preferences,
    updatePreferences,
    isLoading: !profile,
  };
};

// Hook for handling notification responses
export const useNotificationHandler = () => {
  const navigation = useNavigation();
  const { showSuccess } = useToast();

  useEffect(() => {
    // Handle notification received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      logger.debug('Notification received in foreground:', notification);

      // Track notification received
      analyticsService.logEvent('notification_received', {
        type: notification.request.content.data?.type,
        foreground: true,
      });
    });

    // Handle notification response (user tapped notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        logger.debug('Notification response received:', data);

        // Track notification tapped
        analyticsService.logEvent('notification_tapped', {
          type: data?.type,
          response_time: Date.now() - new Date(response.notification.date).getTime(),
        });

        // Navigate based on notification type
        handleNotificationNavigation(data, navigation);
      }
    );

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [navigation]);

  const handleNotificationNavigation = useCallback(
    (data: any, navigation: any) => {
      switch (data?.type) {
        case 'daily_reminder':
          navigation.navigate('DailyEntry');
          break;

        case 'throwback':
          navigation.navigate('EntryDetail', {
            entryId: data.entryId,
            date: data.entryDate,
          });
          break;

        case 'streak_milestone':
          navigation.navigate('StreakDetails');
          showSuccess('🎉 Yeni bir başarı daha elde ettin!');
          break;

        case 'streak_warning':
          navigation.navigate('DailyEntry');
          break;

        default:
          navigation.navigate('Home');
      }
    },
    [showSuccess]
  );
};

// Hook for scheduling throwback notifications
export const useThrowbackScheduler = () => {
  const { data: oldEntries } = useQuery({
    queryKey: queryKeys.gratitude.throwback(),
    queryFn: () => gratitudeApi.getEntriesForThrowback(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  useEffect(() => {
    if (!oldEntries?.length) return;

    // Schedule throwback notifications for entries from previous years
    oldEntries.forEach((entry) => {
      const entryDate = new Date(entry.entry_date);
      const today = new Date();

      // Check if it's the anniversary of this entry
      if (
        entryDate.getMonth() === today.getMonth() &&
        entryDate.getDate() === today.getDate() &&
        entryDate.getFullYear() < today.getFullYear()
      ) {
        notificationService.scheduleThrowbackNotification(entry.user_id, entry);
      }
    });
  }, [oldEntries]);
};
```

## 📊 Notification Analytics

### Tracking & Optimization

```typescript
// Notification analytics service
class NotificationAnalytics {
  // Track notification effectiveness
  async trackNotificationMetrics(userId: string): Promise<NotificationMetrics> {
    try {
      const deliveries = await this.getNotificationDeliveries(userId);
      const responses = await this.getNotificationResponses(userId);

      const metrics = {
        totalSent: deliveries.length,
        totalOpened: responses.filter((r) => r.opened).length,
        totalCompleted: responses.filter((r) => r.completed).length,
        openRate: 0,
        completionRate: 0,
        averageResponseTime: 0,
        bestPerformingType: '',
        worstPerformingType: '',
      };

      if (deliveries.length > 0) {
        metrics.openRate = (metrics.totalOpened / metrics.totalSent) * 100;
        metrics.completionRate = (metrics.totalCompleted / metrics.totalSent) * 100;
      }

      // Calculate average response time
      const responseTimes = responses
        .filter((r) => r.responseTimeMinutes)
        .map((r) => r.responseTimeMinutes!);

      if (responseTimes.length > 0) {
        metrics.averageResponseTime =
          responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }

      // Find best/worst performing notification types
      const typePerformance = this.calculateTypePerformance(responses);
      metrics.bestPerformingType = typePerformance.best;
      metrics.worstPerformingType = typePerformance.worst;

      return metrics;
    } catch (error) {
      logger.error('Failed to track notification metrics:', error);
      throw error;
    }
  }

  private calculateTypePerformance(responses: NotificationResponse[]) {
    const typeStats = new Map<string, { total: number; completed: number }>();

    responses.forEach((response) => {
      const type = response.notificationType;
      const existing = typeStats.get(type) || { total: 0, completed: 0 };
      typeStats.set(type, {
        total: existing.total + 1,
        completed: existing.completed + (response.completed ? 1 : 0),
      });
    });

    let best = '';
    let worst = '';
    let bestRate = 0;
    let worstRate = 1;

    typeStats.forEach((stats, type) => {
      const rate = stats.completed / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        best = type;
      }
      if (rate < worstRate) {
        worstRate = rate;
        worst = type;
      }
    });

    return { best, worst };
  }

  // Generate notification optimization recommendations
  async generateOptimizationRecommendations(userId: string): Promise<NotificationRecommendation[]> {
    const metrics = await this.trackNotificationMetrics(userId);
    const behavior = await new SmartScheduler().analyzeUserBehavior(userId);

    const recommendations: NotificationRecommendation[] = [];

    // Low open rate recommendation
    if (metrics.openRate < 30) {
      recommendations.push({
        type: 'timing',
        priority: 'high',
        title: 'Bildirim Zamanını Optimize Et',
        description: 'Açılma oranın düşük. Farklı saatlerde bildirim göndermeyi dene.',
        action: 'adjust_timing',
        suggestedValue: behavior.preferredTimeSlots[0],
      });
    }

    // Low completion rate recommendation
    if (metrics.completionRate < 20) {
      recommendations.push({
        type: 'content',
        priority: 'medium',
        title: 'Bildirim İçeriğini Güncelle',
        description: 'Daha motive edici mesajlar kullanarak tamamlama oranını artırabilirsin.',
        action: 'update_content',
      });
    }

    // High response time recommendation
    if (metrics.averageResponseTime > 120) {
      // More than 2 hours
      recommendations.push({
        type: 'frequency',
        priority: 'low',
        title: 'Bildirim Sıklığını Azalt',
        description: 'Yanıt süren uzun. Daha az sıklıkta bildirim deneyebilirsin.',
        action: 'reduce_frequency',
      });
    }

    return recommendations;
  }
}

export const notificationAnalytics = new NotificationAnalytics();
```

This comprehensive notification system provides intelligent, personalized reminders that adapt to user behavior while maintaining engagement through thoughtful timing and relevant content.
