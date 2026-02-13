import { logger } from '@/utils/debugConfig';

type AnalyticsValue = string | number | boolean | null;
type AnalyticsParams = Record<string, AnalyticsValue>;
type AnalyticsEventType = 'event' | 'screen';

interface AnalyticsEvent {
  type: AnalyticsEventType;
  name: string;
  params?: AnalyticsParams;
  timestamp: string;
}

const MAX_BUFFERED_EVENTS = 200;

/**
 * Local analytics fallback.
 * Remote analytics is currently disabled, but we still keep event telemetry
 * for debugging, QA, and future provider re-enablement.
 */
class LocalAnalyticsService {
  private readonly eventBuffer: AnalyticsEvent[] = [];

  record(type: AnalyticsEventType, name: string, params?: AnalyticsParams): void {
    const event: AnalyticsEvent = {
      type,
      name,
      params,
      timestamp: new Date().toISOString(),
    };

    this.eventBuffer.push(event);
    if (this.eventBuffer.length > MAX_BUFFERED_EVENTS) {
      this.eventBuffer.splice(0, this.eventBuffer.length - MAX_BUFFERED_EVENTS);
    }

    if (__DEV__) {
      logger.debug(`[ANALYTICS:${type.toUpperCase()}] ${name}`, {
        extra: params ?? {},
      });
    }
  }

  getRecentEvents(limit: number = 50): ReadonlyArray<AnalyticsEvent> {
    return this.eventBuffer.slice(-limit);
  }

  clearBuffer(): void {
    this.eventBuffer.length = 0;
  }
}

const localAnalytics = new LocalAnalyticsService();

const logScreenView = async (
  screenName: string,
  additionalParams?: Record<string, string | number | boolean>
): Promise<void> => {
  localAnalytics.record('screen', screenName, additionalParams);
};

const logEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean | null>
): Promise<void> => {
  localAnalytics.record('event', eventName, params);
};

const logAppOpen = async (): Promise<void> => {
  localAnalytics.record('event', 'app_open');
};

const setUserProperties = async (properties: Record<string, string | null>): Promise<void> => {
  localAnalytics.record('event', 'set_user_properties', properties);
};

const setUserId = async (userId: string | null): Promise<void> => {
  localAnalytics.record('event', 'set_user_id', { userId });
};

const setAnalyticsCollectionEnabled = async (enabled: boolean): Promise<void> => {
  localAnalytics.record('event', 'set_analytics_collection', { enabled });
};

const trackUserJourney = async (
  journeyName: string,
  step: string,
  stepIndex: number,
  totalSteps: number,
  additionalData?: Record<string, string | number | boolean>
): Promise<void> => {
  localAnalytics.record('event', 'user_journey', {
    journeyName,
    step,
    stepIndex,
    totalSteps,
    ...(additionalData ?? {}),
  });
};

const trackPerformance = async (
  metricName: string,
  value: number,
  unit: 'ms' | 'seconds' | 'count' | 'percentage' = 'ms',
  additionalContext?: Record<string, string | number | boolean>
): Promise<void> => {
  localAnalytics.record('event', 'performance_metric', {
    metricName,
    value,
    unit,
    ...(additionalContext ?? {}),
  });
};

const trackEngagement = async (
  engagementType: 'content_interaction' | 'feature_usage' | 'time_spent' | 'achievement_unlocked',
  details: Record<string, string | number | boolean>
): Promise<void> => {
  localAnalytics.record('event', `engagement_${engagementType}`, details);
};

const trackGamification = async (
  actionType: 'streak_continued' | 'milestone_achieved' | 'goal_completed' | 'challenge_started',
  gameData: Record<string, string | number | boolean>
): Promise<void> => {
  localAnalytics.record('event', `gamification_${actionType}`, gameData);
};

const trackContentAnalytics = async (
  contentType: 'gratitude_entry' | 'statement_edit' | 'prompt_usage',
  action: 'created' | 'edited' | 'deleted' | 'viewed' | 'shared',
  contentData: Record<string, string | number | boolean>
): Promise<void> => {
  localAnalytics.record('event', 'content_analytics', {
    contentType,
    action,
    ...contentData,
  });
};

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
  localAnalytics.record('event', 'detailed_error', {
    errorName: error.name,
    errorMessage: error.message,
    hasErrorBoundary: Boolean(context.errorBoundary),
    userId: context.userId ?? null,
    screenName: context.screenName ?? null,
    actionTaken: context.actionTaken ?? null,
    deviceInfo: context.deviceInfo ? JSON.stringify(context.deviceInfo) : null,
    customKeys: context.customKeys ? JSON.stringify(context.customKeys) : null,
  });
};

export const analyticsService = {
  logScreenView,
  logEvent,
  logAppOpen,
  setUserProperties,
  setUserId,
  setAnalyticsCollectionEnabled,
  trackUserJourney,
  trackPerformance,
  trackEngagement,
  trackGamification,
  trackContentAnalytics,
  trackDetailedError,
  trackMoodSelected: async (params: { entryDate: string; index: number; emoji: string }) => {
    await logEvent('mood_selected', params);
  },
  trackMoodCleared: async (params: { entryDate: string; index: number }) => {
    await logEvent('mood_cleared', params);
  },
  getRecentEvents: (limit?: number) => localAnalytics.getRecentEvents(limit),
  clearBufferedEvents: () => localAnalytics.clearBuffer(),
};
