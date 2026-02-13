import { queryKeys } from './queryKeys';
import { QueryClient } from '@tanstack/react-query';

/**
 * Query key utilities for cache management
 */
export const queryKeyHelpers = {
  /**
   * Invalidate all user data
   */
  invalidateUserData: (userId: string) => [
    queryKeys.profile(userId),
    queryKeys.gratitudeEntries(userId),
    queryKeys.streaks(userId),
  ],

  /**
   * Invalidate entry-related data
   */
  invalidateEntryData: (userId: string, entryDate?: string) =>
    [
      queryKeys.gratitudeEntries(userId),
      entryDate ? queryKeys.gratitudeEntry(userId, entryDate) : null,
      queryKeys.streaks(userId),
      queryKeys.gratitudeTotalCount(userId),
    ].filter(Boolean),

  /**
   * Invalidate calendar data for a specific month
   */
  invalidateCalendarData: (userId: string, year: number, month: number) => [
    queryKeys.gratitudeEntriesByMonth(userId, year, month),
    queryKeys.gratitudeEntries(userId), // Also invalidate main list
  ],

  /**
   * Clear all cache data (for logout)
   */
  clearAllUserCache: (queryClient: QueryClient, userId: string) => {
    const keysToRemove = [
      queryKeys.profile(userId),
      queryKeys.gratitudeEntries(userId),
      queryKeys.streaks(userId),
      queryKeys.randomGratitudeEntry(userId),
      queryKeys.currentPrompt(userId),
    ];

    keysToRemove.forEach((key) => {
      queryClient.removeQueries({ queryKey: key });
    });
  },
};
