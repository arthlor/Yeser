// 🚫 NO-OP ANALYTICS: Analytics disabled - Firebase removed
import { logger } from '@/utils/debugConfig';

// 🎯 ANALYTICS CONFIGURATION: Screen names mapping (preserved for reference)
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
  PrivacyPolicy: 'privacy_policy_screen',
  TermsOfService: 'terms_of_service_screen',
  Help: 'help_screen',
  WhyGratitude: 'why_gratitude_screen',

  // Individual screen names -> Standardized analytics names
  EnhancedHomeScreen: 'home_screen',
  splash_screen: 'splash_screen',
  terms_of_service: 'terms_of_service_screen',
  PastEntriesScreen: 'past_entries_screen',
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
 * NO-OP: Logs a screen view event (disabled).
 * @param screenName The name of the screen to track.
 * @param additionalParams Optional additional parameters for screen context
 */
const logScreenView = async (
  screenName: string,
  additionalParams?: Record<string, string | number | boolean>
): Promise<void> => {
  if (__DEV__) {
    const normalizedScreenName = normalizeScreenName(screenName);
    logger.debug(`[NO-OP] Analytics: Screen view - ${normalizedScreenName}`, {
      original_name: screenName,
      additional_params: additionalParams,
    });
  }
};

/**
 * NO-OP: Logs a custom event (disabled).
 * @param eventName The name of the event (e.g., 'button_click', 'item_shared').
 * @param params Optional parameters associated with the event.
 */
const logEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean | null>
): Promise<void> => {
  if (__DEV__) {
    logger.debug(`[NO-OP] Analytics: Event - ${eventName}`, params);
  }
};

/**
 * NO-OP: Logs an 'app_open' event (disabled).
 */
const logAppOpen = async (): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: App open event');
  }
};

/**
 * NO-OP: Sets user properties (disabled).
 * @param properties User properties to set
 */
const setUserProperties = async (properties: Record<string, string | null>): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: User properties', properties);
  }
};

/**
 * NO-OP: Sets the user ID (disabled).
 * @param userId The user's unique identifier (or null to clear)
 */
const setUserId = async (userId: string | null): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: User ID', { userId: userId ? 'set' : 'cleared' });
  }
};

/**
 * NO-OP: Enables or disables analytics collection (disabled).
 * @param enabled Whether to enable analytics collection
 */
const setAnalyticsCollectionEnabled = async (enabled: boolean): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: Collection enabled status', { enabled });
  }
};

/**
 * NO-OP: Track user journey (disabled).
 */
const trackUserJourney = async (
  journeyName: string,
  step: string,
  stepIndex: number,
  totalSteps: number,
  additionalData?: Record<string, string | number | boolean>
): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: User journey', {
      journeyName,
      step,
      stepIndex,
      totalSteps,
      ...additionalData,
    });
  }
};

/**
 * NO-OP: Track performance metrics (disabled).
 */
const trackPerformance = async (
  metricName: string,
  value: number,
  unit: 'ms' | 'seconds' | 'count' | 'percentage' = 'ms',
  additionalContext?: Record<string, string | number | boolean>
): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: Performance metric', {
      metricName,
      value,
      unit,
      ...additionalContext,
    });
  }
};

/**
 * NO-OP: Track engagement patterns (disabled).
 */
const trackEngagement = async (
  engagementType: 'content_interaction' | 'feature_usage' | 'time_spent' | 'achievement_unlocked',
  details: Record<string, string | number | boolean>
): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: Engagement', { engagementType, ...details });
  }
};

/**
 * NO-OP: Track gamification elements (disabled).
 */
const trackGamification = async (
  actionType: 'streak_continued' | 'milestone_achieved' | 'goal_completed' | 'challenge_started',
  gameData: Record<string, string | number | boolean>
): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: Gamification', { actionType, ...gameData });
  }
};

/**
 * NO-OP: Track content creation and consumption (disabled).
 */
const trackContentAnalytics = async (
  contentType: 'gratitude_entry' | 'statement_edit' | 'prompt_usage',
  action: 'created' | 'edited' | 'deleted' | 'viewed' | 'shared',
  contentData: Record<string, string | number | boolean>
): Promise<void> => {
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: Content', { contentType, action, ...contentData });
  }
};

/**
 * NO-OP: Track detailed errors (disabled).
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
  if (__DEV__) {
    logger.debug('[NO-OP] Analytics: Error tracking', {
      error: error.message,
      context,
    });
  }
};

export const analyticsService = {
  // Core Analytics (all no-op)
  logScreenView,
  logEvent,
  logAppOpen,
  setUserProperties,
  setUserId,
  setAnalyticsCollectionEnabled,

  // Enhanced Analytics (all no-op)
  trackUserJourney,
  trackPerformance,
  trackEngagement,
  trackGamification,
  trackContentAnalytics,
  trackDetailedError,
};
