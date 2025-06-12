import {
  getEntryDatesForMonth,
  getGratitudeDailyEntries,
  getGratitudeDailyEntriesPaginated,
  getGratitudeDailyEntryByDate,
  getRandomGratitudeEntry,
  getTotalGratitudeEntriesCount,
} from '@/api/gratitudeApi';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_STALE_TIMES } from '@/api/queryClient';
import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import useAuthStore from '@/store/authStore';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';

export const useGratitudeEntries = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery<GratitudeEntry[], Error>({
    queryKey: queryKeys.gratitudeEntries(user?.id),
    queryFn: getGratitudeDailyEntries,
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.entries, // 2 minutes - user actively modifying
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
};

export const useGratitudeEntriesPaginated = (pageSize: number = 20) => {
  const user = useAuthStore((state) => state.user);

  return useInfiniteQuery({
    queryKey: queryKeys.gratitudeEntriesPaginated(user?.id, pageSize),
    queryFn: ({ pageParam = 0 }) => getGratitudeDailyEntriesPaginated(pageParam, pageSize),
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.entries, // 2 minutes - dynamic content
    gcTime: 15 * 60 * 1000, // 15 minutes for pagination UX
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 0,
  });
};

export const useGratitudeEntry = (entryDate: string) => {
  const user = useAuthStore((state) => state.user);

  return useQuery<GratitudeEntry | null, Error>({
    queryKey: queryKeys.gratitudeEntry(user?.id, entryDate),
    queryFn: () => getGratitudeDailyEntryByDate(entryDate),
    enabled: !!user?.id && !!entryDate,
    staleTime: QUERY_STALE_TIMES.entries, // 2 minutes - individual entries can be edited
    gcTime: 20 * 60 * 1000, // 20 minutes for navigation UX
  });
};

export const useEntryDatesForMonth = (year: number, month: number) => {
  const user = useAuthStore((state) => state.user);

  return useQuery<string[], Error>({
    queryKey: queryKeys.gratitudeEntriesByMonth(user?.id, year, month),
    queryFn: () => getEntryDatesForMonth(year, month),
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.monthlyData, // 20 minutes - historical data changes less
    gcTime: 30 * 60 * 1000, // 30 minutes cache for calendar navigation
  });
};

export const useGratitudeTotalCount = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery<number, Error>({
    queryKey: queryKeys.gratitudeTotalCount(user?.id),
    queryFn: getTotalGratitudeEntriesCount,
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.totalCount, // 10 minutes - count changes slowly
    gcTime: 25 * 60 * 1000, // 25 minutes cache
  });
};

export const useRandomGratitudeEntry = () => {
  const user = useAuthStore((state) => state.user);

  const query = useQuery<GratitudeEntry | null, Error>({
    queryKey: queryKeys.randomGratitudeEntry(user?.id),
    queryFn: async () => {
      logger.debug('useRandomGratitudeEntry: Starting query', {
        userId: user?.id,
        userExists: !!user,
        queryEnabled: !!user?.id,
        timestamp: new Date().toISOString(),
      });

      try {
        const result = await getRandomGratitudeEntry();
        logger.debug('useRandomGratitudeEntry: Query completed successfully', {
          hasResult: !!result,
          entryDate: result?.entry_date,
          statementsCount: result?.statements?.length,
          firstStatement: result?.statements?.[0]?.substring(0, 100),
          fullResult: result, // Log the full result for debugging
        });
        return result;
      } catch (error) {
        logger.error('useRandomGratitudeEntry: Query failed', {
          error: error instanceof Error ? error.message : String(error),
          userId: user?.id,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.randomEntry, // 0 - always fresh for variety
    gcTime: 5 * 60 * 1000, // 5 minutes for back navigation
    retry: (failureCount, error) => {
      logger.debug('useRandomGratitudeEntry: Retry attempt', {
        failureCount,
        error: error?.message,
        willRetry: failureCount < 2,
      });
      return failureCount < 2; // Only retry twice
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });

  return query;
};
