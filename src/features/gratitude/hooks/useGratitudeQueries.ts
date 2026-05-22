import {
  getEntryDatesForMonth,
  getGratitudeDailyEntries,
  getGratitudeDailyEntriesPaginated,
  getGratitudeDailyEntryByDate,
  getGratitudeDailyEntryById,
  getRandomGratitudeEntry,
  getTotalGratitudeEntriesCount,
} from '@/features/gratitude/api';
import { queryKeys } from '@/shared/query/queryKeys';
import { QUERY_STALE_TIMES } from '@/shared/query/queryClient';
import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { shouldEnableQueries, useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

export const useGratitudeEntries = () => {
  const user = useCoreAuthStore((state) => state.user);

  return useQuery<GratitudeEntry[], Error>({
    queryKey: queryKeys.gratitudeEntries(user?.id),
    queryFn: getGratitudeDailyEntries,
    enabled: shouldEnableQueries(user),
    staleTime: QUERY_STALE_TIMES.entries, // 2 minutes - user actively modifying
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });
};

export const useGratitudeEntriesPaginated = (pageSize: number = 20, searchTerm: string = '') => {
  const user = useCoreAuthStore((state) => state.user);

  return useInfiniteQuery({
    queryKey: queryKeys.gratitudeEntriesPaginated(user?.id, pageSize, searchTerm),
    queryFn: ({ pageParam = 0 }) =>
      getGratitudeDailyEntriesPaginated(pageParam, pageSize, searchTerm),
    enabled: shouldEnableQueries(user),
    staleTime: QUERY_STALE_TIMES.entries, // 2 minutes - dynamic content
    gcTime: 15 * 60 * 1000, // 15 minutes for pagination UX
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.currentPage + 1 : undefined;
    },
    initialPageParam: 0,
  });
};

export const useGratitudeEntry = (entryDate: string) => {
  const user = useCoreAuthStore((state) => state.user);

  return useQuery<GratitudeEntry | null, Error>({
    queryKey: queryKeys.gratitudeEntry(user?.id, entryDate),
    queryFn: () => getGratitudeDailyEntryByDate(entryDate),
    enabled: shouldEnableQueries(user) && !!entryDate,
    staleTime: QUERY_STALE_TIMES.entries, // 2 minutes - individual entries can be edited
    gcTime: 20 * 60 * 1000, // 20 minutes for navigation UX
  });
};

export const useGratitudeEntryById = (entryId: string) => {
  const user = useCoreAuthStore((state) => state.user);

  return useQuery<GratitudeEntry | null, Error>({
    queryKey: queryKeys.gratitudeEntryById(user?.id, entryId),
    queryFn: () => getGratitudeDailyEntryById(entryId),
    enabled: shouldEnableQueries(user) && !!entryId,
    staleTime: QUERY_STALE_TIMES.entries,
    gcTime: 20 * 60 * 1000,
  });
};

export const useEntryDatesForMonth = (year: number, month: number) => {
  const user = useCoreAuthStore((state) => state.user);

  return useQuery<string[], Error>({
    queryKey: queryKeys.gratitudeEntriesByMonth(user?.id, year, month),
    queryFn: () => getEntryDatesForMonth(year, month),
    enabled: shouldEnableQueries(user),
    staleTime: QUERY_STALE_TIMES.monthlyData, // 20 minutes - historical data changes less
    gcTime: 30 * 60 * 1000, // 30 minutes cache for calendar navigation
  });
};

export const useGratitudeTotalCount = () => {
  const user = useCoreAuthStore((state) => state.user);

  return useQuery<number, Error>({
    queryKey: queryKeys.gratitudeTotalCount(user?.id),
    queryFn: getTotalGratitudeEntriesCount,
    enabled: shouldEnableQueries(user),
    staleTime: QUERY_STALE_TIMES.totalCount, // 10 minutes - count changes slowly
    gcTime: 25 * 60 * 1000, // 25 minutes cache
  });
};

export const useRandomGratitudeEntry = () => {
  const user = useCoreAuthStore((state) => state.user);

  const query = useQuery<GratitudeEntry | null, Error>({
    queryKey: queryKeys.randomGratitudeEntry(user?.id),
    queryFn: getRandomGratitudeEntry,
    enabled: shouldEnableQueries(user),
    staleTime: QUERY_STALE_TIMES.randomEntry, // 0 - always fresh for variety
    gcTime: 5 * 60 * 1000, // 5 minutes for back navigation
    retry: (failureCount) => failureCount < 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });

  return query;
};
