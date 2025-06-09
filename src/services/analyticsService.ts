// 🚨 FIX: Re-enabled Firebase Analytics for production deployment
import { getAnalytics } from '@react-native-firebase/analytics';
import { logger } from '@/utils/debugConfig';

const analyticsInstance = getAnalytics();

// 🎯 ANALYTICS CONFIGURATION: Standardized screen names mapping
const SCREEN_NAME_MAPPING: Record<string, string> = {
  // Navigation route names -> Standardized analytics names
  HomeTab: 'home_screen',
  DailyEntryTab: 'daily_entry_screen',
  PastEntriesTab: 'past_entries_screen',
  CalendarTab: 'calendar_screen',
  SettingsTab: 'settings_screen',
  Login: 'login_screen',
  Onboarding: 'onboarding_screen',
  EntryDetail: 'entry_detail_screen',
  ReminderSettings: 'reminder_settings_screen',
  PrivacyPolicy: 'privacy_policy_screen',
  TermsOfService: 'terms_of_service_screen',
  Help: 'help_screen',
  WhyGratitude: 'why_gratitude_screen',

  // Individual screen names -> Standardized analytics names
  EnhancedHomeScreen: 'home_screen',
  splash_screen: 'splash_screen',
  terms_of_service: 'terms_of_service_screen',
  PastEntriesScreen: 'past_entries_screen',
  EnhancedReminderSettingsScreen: 'reminder_settings_screen',
  help_screen: 'help_screen',
  settings: 'settings_screen',
  privacy_policy: 'privacy_policy_screen',
  streak_details_screen: 'streak_details_screen',
  entry_detail_screen: 'entry_detail_screen',
  daily_entry_screen: 'daily_entry_screen',
} as const;

/**
 * Normalize screen name to ensure consistency across the app
 * @param screenName Raw screen name from navigation or individual tracking
 * @returns Standardized screen name for analytics
 */
const normalizeScreenName = (screenName: string): string => {
  return (
    SCREEN_NAME_MAPPING[screenName] ||
    screenName
      .toLowerCase()
      .replace(/([A-Z])/g, '_$1')
      .replace(/^_/, '')
  );
};

/**
 * Logs a screen view event to Firebase Analytics.
 * Screen names are automatically normalized for consistency.
 * @param screenName The name of the screen to track.
 * @param additionalParams Optional additional parameters for screen context
 */
const logScreenView = async (
  screenName: string,
  additionalParams?: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    const normalizedScreenName = normalizeScreenName(screenName);

    await analyticsInstance.logScreenView({
      screen_name: normalizedScreenName,
      screen_class: normalizedScreenName,
      ...additionalParams,
    });

    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug(`Analytics: Screen view logged - ${normalizedScreenName}`, {
        original_name: screenName,
        additional_params: additionalParams,
      });
    }
  } catch (error) {
    logger.error('Failed to log screen view to Firebase Analytics', error as Error);
  }
};

/**
 * Logs a custom event to Firebase Analytics.
 * @param eventName The name of the event (e.g., 'button_click', 'item_shared').
 * @param params Optional parameters associated with the event.
 */
const logEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean | null>
): Promise<void> => {
  try {
    // Firebase Analytics parameter validation and conversion
    const sanitizedParams: Record<string, string | number | boolean> = {};

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Firebase Analytics doesn't accept null values, so filter them out
        if (value !== null) {
          sanitizedParams[key] = value;
        }
      });
    }

    await analyticsInstance.logEvent(eventName, sanitizedParams);

    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug(`Analytics: Event logged - ${eventName}`, sanitizedParams);
    }
  } catch (error) {
    logger.error(`Failed to log event '${eventName}' to Firebase Analytics`, error as Error);
  }
};

/**
 * Logs an 'app_open' event.
 * This can be called when the application is first initialized.
 */
const logAppOpen = async (): Promise<void> => {
  try {
    await analyticsInstance.logAppOpen();

    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: App open event logged');
    }
  } catch (error) {
    logger.error('Failed to log app_open event to Firebase Analytics', error as Error);
  }
};

/**
 * Sets user properties for Firebase Analytics.
 * This helps with user segmentation and understanding user behavior.
 * @param properties User properties to set
 */
const setUserProperties = async (properties: Record<string, string | null>): Promise<void> => {
  try {
    await analyticsInstance.setUserProperties(properties);

    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: User properties set', properties);
    }
  } catch (error) {
    logger.error('Failed to set user properties in Firebase Analytics', error as Error);
  }
};

/**
 * Sets the user ID for Firebase Analytics.
 * This should be called when user authentication state changes.
 * @param userId The user's unique identifier (or null to clear)
 */
const setUserId = async (userId: string | null): Promise<void> => {
  try {
    await analyticsInstance.setUserId(userId);

    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: User ID set', { userId: userId ? 'set' : 'cleared' });
    }
  } catch (error) {
    logger.error('Failed to set user ID in Firebase Analytics', error as Error);
  }
};

/**
 * Enables or disables analytics collection.
 * Useful for handling user privacy preferences.
 * @param enabled Whether to enable analytics collection
 */
const setAnalyticsCollectionEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await analyticsInstance.setAnalyticsCollectionEnabled(enabled);

    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: Collection enabled status changed', { enabled });
    }
  } catch (error) {
    logger.error('Failed to set analytics collection status', error as Error);
  }
};

/**
 * 🎯 USER JOURNEY TRACKING: Track complete user flows
 * Provides insights into user paths and conversion funnels
 */
const trackUserJourney = async (
  journeyName: string,
  step: string,
  stepIndex: number,
  totalSteps: number,
  additionalData?: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    await logEvent('user_journey_step', {
      journey_name: journeyName,
      step_name: step,
      step_index: stepIndex,
      total_steps: totalSteps,
      completion_percentage: Math.round((stepIndex / totalSteps) * 100),
      ...additionalData,
    });
  } catch (error) {
    logger.error('Failed to track user journey', error as Error);
  }
};

/**
 * 🚀 PERFORMANCE ANALYTICS: Track app performance metrics
 * Monitors loading times, errors, and user experience quality
 */
const trackPerformance = async (
  metricName: string,
  value: number,
  unit: 'ms' | 'seconds' | 'count' | 'percentage' = 'ms',
  additionalContext?: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    await logEvent('performance_metric', {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
      ...additionalContext,
    });
  } catch (error) {
    logger.error('Failed to track performance metric', error as Error);
  }
};

/**
 * 📊 ENGAGEMENT ANALYTICS: Track user engagement patterns
 * Measures content interaction, feature usage, and retention indicators
 */
const trackEngagement = async (
  engagementType: 'content_interaction' | 'feature_usage' | 'time_spent' | 'achievement_unlocked',
  details: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    await logEvent('user_engagement', {
      engagement_type: engagementType,
      timestamp: Date.now(),
      ...details,
    });
  } catch (error) {
    logger.error('Failed to track engagement', error as Error);
  }
};

/**
 * 🎮 GAMIFICATION ANALYTICS: Track gamification elements
 * Monitors streak progress, milestone achievements, and goal completions
 */
const trackGamification = async (
  actionType: 'streak_continued' | 'milestone_achieved' | 'goal_completed' | 'challenge_started',
  gameData: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    await logEvent('gamification_action', {
      action_type: actionType,
      timestamp: Date.now(),
      ...gameData,
    });
  } catch (error) {
    logger.error('Failed to track gamification action', error as Error);
  }
};

/**
 * 🔔 NOTIFICATION ANALYTICS: Track notification effectiveness
 * Measures notification delivery, opens, and user responses
 */
const trackNotificationAnalytics = async (
  notificationType: 'daily_reminder' | 'throwback_reminder' | 'milestone_notification',
  action: 'sent' | 'delivered' | 'opened' | 'dismissed' | 'action_taken',
  context?: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    await logEvent('notification_interaction', {
      notification_type: notificationType,
      action_type: action,
      timestamp: Date.now(),
      ...context,
    });
  } catch (error) {
    logger.error('Failed to track notification analytics', error as Error);
  }
};

/**
 * 💡 CONTENT ANALYTICS: Track content creation and consumption
 * Monitors gratitude entry patterns, content quality, and user creativity
 */
const trackContentAnalytics = async (
  contentType: 'gratitude_entry' | 'statement_edit' | 'prompt_usage',
  action: 'created' | 'edited' | 'deleted' | 'viewed' | 'shared',
  contentData: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    await logEvent('content_interaction', {
      content_type: contentType,
      action_type: action,
      timestamp: Date.now(),
      ...contentData,
    });
  } catch (error) {
    logger.error('Failed to track content analytics', error as Error);
  }
};

export const analyticsService = {
  // Core Analytics
  logScreenView,
  logEvent,
  logAppOpen,
  setUserProperties,
  setUserId,
  setAnalyticsCollectionEnabled,

  // Advanced Analytics
  trackUserJourney,
  trackPerformance,
  trackEngagement,
  trackGamification,
  trackNotificationAnalytics,
  trackContentAnalytics,

  // Utility
  normalizeScreenName,
};
