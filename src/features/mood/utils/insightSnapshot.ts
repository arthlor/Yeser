import type {
  AIInsightResponse,
  MoodAnalyticsRange,
  MoodInsightSnapshot,
} from '@/types/moodAnalytics.types';

const FRESHNESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const RANGE_DAYS: Record<MoodAnalyticsRange, number> = {
  '15d': 15,
  '30d': 30,
  '90d': 90,
};

export const resolveInsightLanguage = (language?: string): 'en' | 'tr' | 'es' => {
  if (language === 'tr' || language === 'es') {
    return language;
  }

  return 'en';
};

export const getMoodInsightRangeStartDate = (range: MoodAnalyticsRange): string => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - RANGE_DAYS[range]);
  return startDate.toISOString().split('T')[0];
};

export const toMoodInsightSnapshot = (
  response: AIInsightResponse | null | undefined,
  range: MoodAnalyticsRange,
  language: 'en' | 'tr' | 'es'
): MoodInsightSnapshot | null => {
  if (!response?.generated_at || !response.highlighted_insight) {
    return null;
  }

  return {
    range,
    language,
    highlighted_insight: response.highlighted_insight,
    narrative: response.narrative ?? null,
    generated_at: response.generated_at,
    entry_count_at_generation: response.entry_count_at_generation ?? 0,
    is_preview_only:
      response.is_preview_only ?? (response.narrative === null || response.narrative === undefined),
  };
};

export const getInsightSnapshotFreshness = (
  snapshot: MoodInsightSnapshot | null | undefined,
  recentEntryCount: number
) => {
  if (!snapshot) {
    return {
      isFresh: false,
      newEntriesSinceGeneration: 0,
      isStaleByAge: true,
      isStaleByEntryCount: false,
    };
  }

  const generatedAt = new Date(snapshot.generated_at).getTime();
  const isStaleByAge = Number.isNaN(generatedAt) || Date.now() - generatedAt > FRESHNESS_WINDOW_MS;
  const newEntriesSinceGeneration = Math.max(
    recentEntryCount - snapshot.entry_count_at_generation,
    0
  );
  const isStaleByEntryCount = newEntriesSinceGeneration >= 3;

  return {
    isFresh: !isStaleByAge && !isStaleByEntryCount,
    newEntriesSinceGeneration,
    isStaleByAge,
    isStaleByEntryCount,
  };
};

export const getInsightSnapshotAgeInDays = (generatedAt: string): number => {
  const parsedDate = new Date(generatedAt).getTime();

  if (Number.isNaN(parsedDate)) {
    return 0;
  }

  const diffMs = Math.max(Date.now() - parsedDate, 0);
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
};
