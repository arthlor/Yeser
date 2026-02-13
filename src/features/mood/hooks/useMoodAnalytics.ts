import { useCallback, useMemo } from 'react';

import { getMoodAnalytics } from '@/features/mood/api';
import { queryKeys } from '@/shared/query/queryKeys';
import { QUERY_STALE_TIMES } from '@/shared/query/queryClient';
import type { MoodAnalyticsRange, MoodAnalyticsResponse } from '@/types/moodAnalytics.types';
import { shouldEnableQueries, useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { useQuery } from '@tanstack/react-query';

const DEFAULT_RANGE: MoodAnalyticsRange = '30d';

export interface UseMoodAnalyticsResult {
  data: MoodAnalyticsResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  range: MoodAnalyticsRange;
  refetch: () => Promise<MoodAnalyticsResponse | undefined>;
  isRefetching: boolean;
  totals: {
    statementsPerEntry: number;
  } | null;
}

export const useMoodAnalytics = (
  range: MoodAnalyticsRange = DEFAULT_RANGE
): UseMoodAnalyticsResult => {
  const user = useCoreAuthStore((state) => state.user);

  const query = useQuery<MoodAnalyticsResponse, Error>({
    queryKey: queryKeys.moodAnalytics(user?.id, range),
    queryFn: () => getMoodAnalytics(range),
    enabled: shouldEnableQueries(user),
    staleTime: QUERY_STALE_TIMES.analytics ?? 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const totals = useMemo(() => {
    if (!query.data || query.data.overview.totalEntries === 0) {
      return null;
    }

    const statementsPerEntry =
      query.data.overview.analyzedStatements / query.data.overview.totalEntries;

    return {
      statementsPerEntry: Number.isFinite(statementsPerEntry)
        ? Number(statementsPerEntry.toFixed(1))
        : 0,
    };
  }, [query.data]);

  const safeRefetch = useCallback(async () => {
    const result = await query.refetch();
    return result.data;
  }, [query]);

  return {
    data: query.data,
    error: query.error ?? null,
    isLoading: query.isLoading,
    range,
    refetch: safeRefetch,
    isRefetching: query.isRefetching,
    totals,
  };
};
