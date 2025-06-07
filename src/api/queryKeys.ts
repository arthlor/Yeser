export const queryKeys = {
  // Root key for global invalidation
  all: ['yeser'] as const,

  // Profile queries
  profile: (userId?: string) => [...queryKeys.all, 'profile', userId] as const,

  // Gratitude entry queries
  gratitudeEntries: (userId?: string) => [...queryKeys.all, 'gratitudeEntries', userId] as const,
  gratitudeEntry: (userId: string | undefined, entryDate: string) =>
    [...queryKeys.gratitudeEntries(userId), { entryDate }] as const,
  gratitudeEntriesByMonth: (userId: string | undefined, year: number, month: number) =>
    [...queryKeys.gratitudeEntries(userId), { year, month }] as const,
  gratitudeTotalCount: (userId?: string) =>
    [...queryKeys.gratitudeEntries(userId), 'totalCount'] as const,

  // Streak queries
  streaks: (userId?: string) => [...queryKeys.all, 'streaks', userId] as const,

  // Random/throwback queries
  randomGratitudeEntry: (userId?: string) =>
    [...queryKeys.all, 'randomGratitudeEntry', userId] as const,

  // Daily prompt queries
  currentPrompt: (userId?: string) => [...queryKeys.all, 'currentPrompt', userId] as const,
} as const;
