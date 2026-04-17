import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { shouldEnableQueries, useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { QUERY_STALE_TIMES } from '@/shared/query/queryClient';
import { queryKeys } from '@/shared/query/queryKeys';
import type { MoodAnalyticsRange, MoodInsightSnapshot } from '@/types/moodAnalytics.types';

import { getLatestMoodInsightSnapshot, getRecentGratitudeEntryCount } from '../api';
import { getInsightSnapshotFreshness, resolveInsightLanguage } from '../utils/insightSnapshot';

const MIN_GRATITUDE_STATEMENTS_FOR_INSIGHTS = 3;

export interface UseLatestMoodInsightResult {
  snapshot: MoodInsightSnapshot | null;
  recentEntryCount: number;
  hasEnoughData: boolean;
  isFresh: boolean;
  needsGeneration: boolean;
  newEntriesSinceGeneration: number;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  language: 'en' | 'tr' | 'es';
  refetch: () => Promise<void>;
}

export const useLatestMoodInsight = (
  range: MoodAnalyticsRange = '30d'
): UseLatestMoodInsightResult => {
  const user = useCoreAuthStore((state) => state.user);
  const { i18n } = useTranslation();
  const language = resolveInsightLanguage(i18n.language);
  const enabled = shouldEnableQueries(user);

  const snapshotQuery = useQuery<MoodInsightSnapshot | null, Error>({
    queryKey: queryKeys.latestMoodInsight(user?.id, range, language),
    queryFn: () => getLatestMoodInsightSnapshot(range, language),
    enabled,
    staleTime: QUERY_STALE_TIMES.insightSnapshots,
    gcTime: 1000 * 60 * 60,
  });

  const countQuery = useQuery<number, Error>({
    queryKey: queryKeys.moodInsightEntryCount(user?.id, range),
    queryFn: () => getRecentGratitudeEntryCount(range),
    enabled,
    staleTime: QUERY_STALE_TIMES.insightEntryCounts,
    gcTime: 1000 * 60 * 30,
  });

  const recentEntryCount = countQuery.data ?? 0;
  const freshness = useMemo(
    () => getInsightSnapshotFreshness(snapshotQuery.data, recentEntryCount),
    [recentEntryCount, snapshotQuery.data]
  );

  const hasEnoughData = recentEntryCount >= MIN_GRATITUDE_STATEMENTS_FOR_INSIGHTS;

  const refetch = useCallback(async () => {
    await Promise.all([snapshotQuery.refetch(), countQuery.refetch()]);
  }, [countQuery, snapshotQuery]);

  return {
    snapshot: snapshotQuery.data ?? null,
    recentEntryCount,
    hasEnoughData,
    isFresh: freshness.isFresh,
    needsGeneration: hasEnoughData && !freshness.isFresh,
    newEntriesSinceGeneration: freshness.newEntriesSinceGeneration,
    isLoading:
      (snapshotQuery.isLoading && snapshotQuery.data === undefined) ||
      (countQuery.isLoading && countQuery.data === undefined),
    isRefetching: snapshotQuery.isRefetching || countQuery.isRefetching,
    error: snapshotQuery.error ?? countQuery.error ?? null,
    language,
    refetch,
  };
};
