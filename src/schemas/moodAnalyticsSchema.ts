import { z } from 'zod';

import { MOOD_EMOJIS } from '@/types/mood.types';

const moodEmojiSchema = z.enum(MOOD_EMOJIS);
const nonNegativeNumber = z.coerce.number().min(0);

const moodCountsRecordSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return {};
    }

    return value;
  },
  z.record(z.string(), nonNegativeNumber)
);

export const moodBalanceLabelSchema = z.enum(['imbalanced', 'neutral', 'balanced']);

export const rawMoodCountSchema = z.object({
  mood: moodEmojiSchema,
  count: nonNegativeNumber,
  percentage: z.coerce.number().min(0).max(100),
});

export const rawMoodTrendPointSchema = z.object({
  date: z.string(),
  entry_count: nonNegativeNumber,
  dominant_mood: z.string().nullable(),
  mood_counts: moodCountsRecordSchema,
});

const moodTrendArraySchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return [];
  }

  return value;
}, z.array(rawMoodTrendPointSchema));

export const rawHighlightedStatementSchema = z.object({
  entry_date: z.string(),
  statement: z.string(),
  mood: moodEmojiSchema,
  weight: z.coerce.number(),
});

export const rawMoodBalanceScoreSchema = z.object({
  value: z.coerce.number().min(0).max(100),
  label: moodBalanceLabelSchema,
});

export const rawMoodOverviewSchema = z.object({
  total_entries: nonNegativeNumber,
  analyzed_statements: nonNegativeNumber,
  dominant_mood: z.string().nullable(),
  balance_score: rawMoodBalanceScoreSchema,
});

export const rawMoodNarrativeSchema = z.object({
  logical: z.string(),
  emotional: z.string(),
  suggestions: z.array(z.string()),
});

export const rawMoodAnalyticsSchema = z.object({
  generated_at: z.string(),
  overview: rawMoodOverviewSchema,
  mood_counts: z.array(rawMoodCountSchema),
  trend: moodTrendArraySchema,
  highlighted_statements: z.array(rawHighlightedStatementSchema),
  narrative: rawMoodNarrativeSchema,
});

export type RawMoodAnalytics = z.infer<typeof rawMoodAnalyticsSchema>;
