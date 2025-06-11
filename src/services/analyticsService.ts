// 🚨 FIX: Re-enabled Firebase Analytics for production deployment
import { getAnalytics } from '@react-native-firebase/analytics';
import { Platform } from 'react-native';
import { logger } from '@/utils/debugConfig';
import { firebaseService } from '@/services/firebaseService';

// Safe analytics instance getter with iOS-specific debugging
const getAnalyticsInstance = () => {
  try {
    if (!firebaseService.isFirebaseReady()) {
      if (Platform.OS === 'ios') {
        logger.warn('🍎 iOS Firebase not ready for Analytics. Check AppDelegate.swift initialization');
        logger.debug('Firebase Debug Info:', firebaseService.getDebugInfo());
      } else {
        logger.warn('Firebase not ready, skipping analytics');
      }
      return null;
    }
    
    const analytics = getAnalytics();
    
    if (Platform.OS === 'ios') {
      logger.debug('✅ iOS Firebase Analytics instance obtained successfully');
    }
    
    return analytics;
  } catch (error) {
    if (Platform.OS === 'ios') {
      logger.error('❌ iOS Firebase Analytics failed to initialize. Common causes:\n1. Missing GoogleService-Info.plist\n2. Missing FirebaseApp.configure() in AppDelegate.swift\n3. Analytics not enabled in Firebase console\n4. Bundle ID mismatch', error as Error);
    } else {
      logger.warn('Analytics not available:', { error: (error as Error).message });
    }
    return null;
  }
};

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
    const analyticsInstance = getAnalyticsInstance();
    if (!analyticsInstance) {
      // Gracefully skip if analytics not available
      return;
    }

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
    const analyticsInstance = getAnalyticsInstance();
    if (!analyticsInstance) {
      return;
    }

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
    const analyticsInstance = getAnalyticsInstance();
    if (!analyticsInstance) {
      return;
    }

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
    const analyticsInstance = getAnalyticsInstance();
    if (!analyticsInstance) {
      return;
    }

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
    const analyticsInstance = getAnalyticsInstance();
    if (!analyticsInstance) {
      return;
    }

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
    const analyticsInstance = getAnalyticsInstance();
    if (!analyticsInstance) {
      return;
    }

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

/**
 * 🚀 ENHANCED ERROR ANALYTICS: Crashlytics-like error tracking
 * Provides comprehensive error insights without additional dependencies
 */
const trackDetailedError = async (
  error: Error,
  context: {
    errorBoundary?: boolean;
    userId?: string;
    screenName?: string;
    actionTaken?: string;
    deviceInfo?: Record<string, string | number>;
    customKeys?: Record<string, string | number | boolean>;
  } = {}
): Promise<void> => {
  try {
    // Enhanced error event with crashlytics-like data
    await logEvent('detailed_error_tracking', {
      // Error details
      error_message: error.message.substring(0, 1000),
      error_name: error.name,
      error_stack: error.stack?.substring(0, 2000) || 'No stack trace',

      // Context information
      error_boundary_triggered: context.errorBoundary || false,
      current_screen: context.screenName || 'unknown',
      user_action: context.actionTaken || 'unknown',
      user_id_hash: context.userId
        ? context.userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)
        : null,

      // Device context
      device_info: JSON.stringify(context.deviceInfo || {}).substring(0, 500),

      // Custom context
      ...context.customKeys,

      // Automatic context
      timestamp: new Date().toISOString(),
      error_severity: determineErrorSeverity(error),
      error_category: categorizeError(error),
      app_version: '1.0.0', // From config
      error_frequency: 1, // Could be enhanced with local tracking
    });

    // Also log as a separate crash-like event for grouping
    await logEvent('error_crash_simulation', {
      crash_group: generateErrorGroup(error),
      crash_fingerprint: generateErrorFingerprint(error),
      is_fatal: false,
      recovery_action: 'user_notified',
    });
  } catch (trackingError) {
    logger.error('Failed to track detailed error', trackingError as Error);
  }
};

/**
 * Generate error grouping similar to Crashlytics
 */
const generateErrorGroup = (error: Error): string => {
  // Simple grouping based on error name and first stack frame
  const stackLine = error.stack?.split('\n')[1] || '';
  const groupId = `${error.name}_${stackLine.substring(0, 50)}`;
  // Simple hash function for React Native compatibility
  return groupId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
};

/**
 * Generate error fingerprint for deduplication
 */
const generateErrorFingerprint = (error: Error): string => {
  const fingerprint = `${error.name}_${error.message}_${error.stack?.split('\n')[0] || ''}`;
  // Simple hash function for React Native compatibility
  return fingerprint.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
};

/**
 * Determine error severity level
 */
const determineErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
  if (error.name === 'TypeError' || error.name === 'ReferenceError') {
    return 'high';
  }
  if (error.message.includes('Network') || error.message.includes('timeout')) {
    return 'medium';
  }
  if (error.message.includes('Auth') || error.message.includes('permission')) {
    return 'critical';
  }
  return 'low';
};

/**
 * Categorize errors for better analysis
 */
const categorizeError = (error: Error): string => {
  if (error.message.includes('Network') || error.message.includes('fetch')) {
    return 'network';
  }
  if (error.message.includes('Auth') || error.message.includes('login')) {
    return 'authentication';
  }
  if (error.name === 'TypeError' || error.name === 'ReferenceError') {
    return 'javascript';
  }
  if (error.message.includes('UI') || error.message.includes('render')) {
    return 'ui';
  }
  return 'general';
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

  // Enhanced Error Analytics
  trackDetailedError,
};
