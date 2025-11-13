import { rawMoodAnalyticsSchema } from '@/schemas/moodAnalyticsSchema';
import type { MoodAnalyticsRange, MoodAnalyticsResponse } from '@/types/moodAnalytics.types';
import { MOOD_EMOJIS } from '@/types/mood.types';
import { handleAPIError } from '@/utils/apiHelpers';
import { logger } from '@/utils/debugConfig';
import { supabase } from '@/utils/supabaseClient';

import type { RawMoodAnalytics } from '@/schemas/moodAnalyticsSchema';
import type { MoodEmoji } from '@/types/mood.types';

const DEFAULT_RANGE: MoodAnalyticsRange = '90d';

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
      dominantMood: raw.overview.dominant_mood,
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
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const { user } = sessionData.session;
    if (!user?.id) {
      throw new Error('No user found in session');
    }

    const { data, error } = await supabase.rpc('get_mood_analytics', {
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
        extra: parseResult.error.flatten(),
      });
      throw new Error('Invalid mood analytics payload received');
    }

    return mapRawAnalytics(parseResult.data, range);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch mood analytics');
  }
};
