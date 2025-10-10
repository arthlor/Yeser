// 🚫 NO-OP ANALYTICS: Analytics disabled - Firebase removed

// Mapping removed for no-op analytics

/**
 * Normalize screen name to ensure consistency across the app
 * @param screenName Raw screen name from navigation or individual tracking
 * @returns Standardized screen name for analytics
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const normalizeScreenName = (screenName: string): string => screenName;

/**
 * NO-OP: Logs a screen view event (disabled).
 * @param screenName The name of the screen to track.
 * @param additionalParams Optional additional parameters for screen context
 */
const logScreenView = async (
  screenName: string,
  additionalParams?: Record<string, string | number | boolean>
): Promise<void> => {
  void screenName;
  void additionalParams;
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
  void eventName;
  void params;
};

/**
 * NO-OP: Logs an 'app_open' event (disabled).
 */
const logAppOpen = async (): Promise<void> => {};

/**
 * NO-OP: Sets user properties (disabled).
 * @param properties User properties to set
 */
const setUserProperties = async (properties: Record<string, string | null>): Promise<void> => {
  void properties;
};

/**
 * NO-OP: Sets the user ID (disabled).
 * @param userId The user's unique identifier (or null to clear)
 */
const setUserId = async (userId: string | null): Promise<void> => {
  void userId;
};

/**
 * NO-OP: Enables or disables analytics collection (disabled).
 * @param enabled Whether to enable analytics collection
 */
const setAnalyticsCollectionEnabled = async (enabled: boolean): Promise<void> => {
  void enabled;
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
  void journeyName;
  void step;
  void stepIndex;
  void totalSteps;
  void additionalData;
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
  void metricName;
  void value;
  void unit;
  void additionalContext;
};

/**
 * NO-OP: Track engagement patterns (disabled).
 */
const trackEngagement = async (
  engagementType: 'content_interaction' | 'feature_usage' | 'time_spent' | 'achievement_unlocked',
  details: Record<string, string | number | boolean>
): Promise<void> => {
  void engagementType;
  void details;
};

/**
 * NO-OP: Track gamification elements (disabled).
 */
const trackGamification = async (
  actionType: 'streak_continued' | 'milestone_achieved' | 'goal_completed' | 'challenge_started',
  gameData: Record<string, string | number | boolean>
): Promise<void> => {
  void actionType;
  void gameData;
};

/**
 * NO-OP: Track content creation and consumption (disabled).
 */
const trackContentAnalytics = async (
  contentType: 'gratitude_entry' | 'statement_edit' | 'prompt_usage',
  action: 'created' | 'edited' | 'deleted' | 'viewed' | 'shared',
  contentData: Record<string, string | number | boolean>
): Promise<void> => {
  void contentType;
  void action;
  void contentData;
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
  void error;
  void context;
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
  // Convenience wrappers (still no-op under the hood)
  trackMoodSelected: async (params: {
    entryDate: string;
    index: number;
    emoji: string;
  }): Promise<void> => {
    await logEvent('mood_selected', params);
  },
  trackMoodCleared: async (params: { entryDate: string; index: number }): Promise<void> => {
    await logEvent('mood_cleared', params);
  },
};
