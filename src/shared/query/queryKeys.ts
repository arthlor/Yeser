import type { MoodAnalyticsRange } from '@/types/moodAnalytics.types';

export const queryKeys = {
  // Root key for global invalidation
  all: ['yeser'] as const,

  // Profile queries
  profile: (userId?: string) => [...queryKeys.all, 'profile', userId] as const,

  // Gratitude entry queries
  gratitudeEntries: (userId?: string) => [...queryKeys.all, 'gratitudeEntries', userId] as const,
  gratitudeEntriesPaginated: (userId?: string, pageSize?: number, searchTerm?: string) =>
    [...queryKeys.gratitudeEntries(userId), 'paginated', pageSize, searchTerm ?? ''] as const,
  gratitudeEntry: (userId: string | undefined, entryDate: string) =>
    [...queryKeys.gratitudeEntries(userId), { entryDate }] as const,
  gratitudeEntriesByMonth: (userId: string | undefined, year: number, month: number) =>
    [...queryKeys.gratitudeEntries(userId), { year, month }] as const,
  gratitudeTotalCount: (userId?: string) =>
    [...queryKeys.gratitudeEntries(userId), 'totalCount'] as const,

  // Streak queries
  streaks: (userId?: string) => [...queryKeys.all, 'streaks', userId] as const,

  // Gratitude benefits queries (Why Gratitude Matters screen)
  gratitudeBenefits: () => [...queryKeys.all, 'gratitudeBenefits'] as const,

  // Random/throwback queries
  randomGratitudeEntry: (userId?: string) =>
    [...queryKeys.all, 'randomGratitudeEntry', userId] as const,

  // Daily prompt queries
  currentPrompt: (userId?: string) => [...queryKeys.all, 'currentPrompt', userId] as const,

  // Mood analytics queries
  moodAnalytics: (userId?: string, range: MoodAnalyticsRange = '30d') =>
    [...queryKeys.all, 'moodAnalytics', userId, range] as const,

  // Mood insights (AI) queries
  moodInsights: (userId?: string, range: MoodAnalyticsRange = '30d', language: string = 'en') =>
    [...queryKeys.all, 'moodInsights', userId, range, language] as const,

  latestMoodInsights: (userId?: string) =>
    [...queryKeys.all, 'latestMoodInsights', userId] as const,
  latestMoodInsight: (
    userId?: string,
    range: MoodAnalyticsRange = '30d',
    language: string = 'en'
  ) => [...queryKeys.latestMoodInsights(userId), range, language] as const,
  moodInsightEntryCounts: (userId?: string) =>
    [...queryKeys.all, 'moodInsightEntryCounts', userId] as const,
  moodInsightEntryCount: (userId?: string, range: MoodAnalyticsRange = '30d') =>
    [...queryKeys.moodInsightEntryCounts(userId), range] as const,
} as const;
