import { rawMoodAnalyticsSchema } from '@/schemas/moodAnalyticsSchema';
import type {
  AIInsightResponse,
  MoodAnalyticsRange,
  MoodAnalyticsResponse,
  MoodInsightSnapshot,
} from '@/types/moodAnalytics.types';
import { MOOD_EMOJIS } from '@/types/mood.types';
import { handleAPIError } from '@/utils/apiHelpers';
import { logger } from '@/utils/debugConfig';
import { getAuthedClient } from '@/services/session';

import type { RawMoodAnalytics } from '@/schemas/moodAnalyticsSchema';
import type { MoodEmoji } from '@/types/mood.types';

import { getMoodInsightRangeStartDate } from './utils/insightSnapshot';

const DEFAULT_RANGE: MoodAnalyticsRange = '30d';

export const analyzeMoodInsights = async (
  range: MoodAnalyticsRange = DEFAULT_RANGE,
  language: 'en' | 'tr' | 'es' = 'en'
): Promise<AIInsightResponse> => {
  const { client, session } = await getAuthedClient();
  const token = session.access_token;

  if (!token) {
    throw new Error('No active session');
  }

  const { data, error } = await client.functions.invoke('analyze-mood-insights', {
    body: { range, language },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    throw handleAPIError(new Error(error.message), 'analyze mood insights');
  }

  return data as AIInsightResponse;
};

export const getLatestMoodInsightSnapshot = async (
  range: MoodAnalyticsRange = DEFAULT_RANGE,
  language: 'en' | 'tr' | 'es' = 'en'
): Promise<MoodInsightSnapshot | null> => {
  try {
    const { client } = await getAuthedClient();
    const { data, error } = await client.rpc('get_latest_mood_insight_snapshot', {
      p_range: range,
      p_language: language,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch latest mood insight snapshot');
    }

    const rawSnapshot = Array.isArray(data) ? data[0] : data;

    if (!rawSnapshot) {
      return null;
    }

    return {
      range,
      language,
      highlighted_insight:
        rawSnapshot.highlighted_insight as MoodInsightSnapshot['highlighted_insight'],
      narrative: (rawSnapshot.narrative ?? null) as MoodInsightSnapshot['narrative'],
      generated_at: rawSnapshot.generated_at,
      entry_count_at_generation: rawSnapshot.entry_count_at_generation ?? 0,
      statement_count_at_generation: rawSnapshot.statement_count_at_generation ?? undefined,
      range_entry_count_at_generation: rawSnapshot.range_entry_count_at_generation ?? undefined,
      analysis_details:
        (rawSnapshot.analysis_details as MoodInsightSnapshot['analysis_details']) ?? null,
      risk_level: (rawSnapshot.risk_level as MoodInsightSnapshot['risk_level']) ?? undefined,
      source_hash: rawSnapshot.source_hash ?? null,
      is_preview_only: Boolean(rawSnapshot.is_preview_only),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch latest mood insight snapshot');
  }
};

export const getRecentGratitudeEntryCount = async (
  range: MoodAnalyticsRange = DEFAULT_RANGE
): Promise<number> => {
  try {
    const { client, session } = await getAuthedClient();
    const { user } = session;

    if (range.endsWith('e')) {
      const { count, error } = await client
        .from('gratitude_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (error) {
        throw handleAPIError(new Error(error.message), 'fetch total gratitude entry count');
      }
      return count ?? 0;
    }

    const startDate = getMoodInsightRangeStartDate(range);
    const { data, error } = await client.rpc('get_recent_statement_count', {
      p_start_date: startDate,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch recent gratitude entry count');
    }

    return Number(data ?? 0);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch recent gratitude entry count');
  }
};

const buildEmptyMoodCounts = (): Record<MoodEmoji, number> => {
  return MOOD_EMOJIS.reduce<Record<MoodEmoji, number>>(
    (acc, mood) => {
      acc[mood] = 0;
      return acc;
    },
    {} as Record<MoodEmoji, number>
  );
};

const isMoodEmoji = (value: unknown): value is MoodEmoji =>
  typeof value === 'string' && (MOOD_EMOJIS as readonly string[]).includes(value);

const mapRawAnalytics = (
  raw: RawMoodAnalytics,
  range: MoodAnalyticsRange
): MoodAnalyticsResponse => {
  const moodCounts = raw.mood_counts
    .filter((item) => isMoodEmoji(item.mood))
    .map((item) => ({
      mood: item.mood,
      count: item.count,
      percentage: item.percentage,
    }));

  const trend = raw.trend.map((point) => {
    const baseline = buildEmptyMoodCounts();
    const moodCountsMap = Object.keys(point.mood_counts).reduce(
      (acc, key) => {
        if (isMoodEmoji(key)) {
          acc[key] = point.mood_counts[key] ?? 0;
        }
        return acc;
      },
      { ...baseline }
    );

    const dominantMood = isMoodEmoji(point.dominant_mood) ? point.dominant_mood : null;

    return {
      date: point.date,
      entryCount: point.entry_count,
      dominantMood,
      moodCounts: moodCountsMap,
    };
  });

  const highlightedStatements = raw.highlighted_statements
    .filter((item) => isMoodEmoji(item.mood))
    .map((item) => ({
      entryDate: item.entry_date,
      statement: item.statement,
      mood: item.mood,
      weight: item.weight,
    }));

  return {
    range,
    generatedAt: raw.generated_at,
    overview: {
      totalEntries: raw.overview.total_entries,
      analyzedStatements: raw.overview.analyzed_statements,
      dominantMood: isMoodEmoji(raw.overview.dominant_mood) ? raw.overview.dominant_mood : null,
      balanceScore: {
        value: raw.overview.balance_score.value,
        label: raw.overview.balance_score.label,
      },
    },
    moodCounts,
    trend,
    highlightedStatements,
    narrative: {
      logical: raw.narrative.logical,
      emotional: raw.narrative.emotional,
      suggestions: raw.narrative.suggestions,
    },
  };
};

export const getMoodAnalytics = async (
  range: MoodAnalyticsRange = DEFAULT_RANGE
): Promise<MoodAnalyticsResponse> => {
  try {
    const { client } = await getAuthedClient();
    const { data, error } = await client.rpc('get_mood_analytics', {
      p_range: range,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch mood analytics');
    }

    if (!data) {
      throw new Error('No mood analytics data returned');
    }

    const parseResult = rawMoodAnalyticsSchema.safeParse(data);
    if (!parseResult.success) {
      logger.error('Failed to parse mood analytics payload', {
        extra: {
          flattened: parseResult.error.flatten(),
          issues: parseResult.error.issues,
        },
      });
      throw new Error('Invalid mood analytics payload received');
    }

    return mapRawAnalytics(parseResult.data, range);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch mood analytics');
  }
};
