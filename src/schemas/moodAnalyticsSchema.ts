import { z } from 'zod';

import { MOOD_EMOJIS } from '@/types/mood.types';

const moodEmojiSchema = z.enum(MOOD_EMOJIS);

export const moodBalanceLabelSchema = z.enum(['imbalanced', 'neutral', 'balanced']);

export const rawMoodCountSchema = z.object({
  mood: moodEmojiSchema,
  count: z.number().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const rawMoodTrendPointSchema = z.object({
  date: z.string(),
  entry_count: z.number().nonnegative(),
  dominant_mood: moodEmojiSchema.nullable(),
  mood_counts: z.record(z.string(), z.number().nonnegative()),
});

export const rawHighlightedStatementSchema = z.object({
  entry_date: z.string(),
  statement: z.string(),
  mood: moodEmojiSchema,
  weight: z.number(),
});

export const rawMoodBalanceScoreSchema = z.object({
  value: z.number().min(0).max(100),
  label: moodBalanceLabelSchema,
});

export const rawMoodOverviewSchema = z.object({
  total_entries: z.number().nonnegative(),
  analyzed_statements: z.number().nonnegative(),
  dominant_mood: moodEmojiSchema.nullable(),
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
  trend: z.array(rawMoodTrendPointSchema),
  highlighted_statements: z.array(rawHighlightedStatementSchema),
  narrative: rawMoodNarrativeSchema,
});

export type RawMoodAnalytics = z.infer<typeof rawMoodAnalyticsSchema>;
