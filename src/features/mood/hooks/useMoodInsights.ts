import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyzeMoodInsights } from '@/features/mood/api';
import { queryKeys } from '@/shared/query/queryKeys';
import { QUERY_STALE_TIMES } from '@/shared/query/queryClient';
import { useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { useTranslation } from 'react-i18next';
import { AIInsightResponse, MoodAnalyticsRange } from '@/types/moodAnalytics.types';

import { resolveInsightLanguage, toMoodInsightSnapshot } from '../utils/insightSnapshot';

export const useMoodInsights = (range: MoodAnalyticsRange) => {
  const user = useCoreAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const language = resolveInsightLanguage(i18n.language);

  const query = useQuery<AIInsightResponse, Error>({
    queryKey: queryKeys.moodInsights(user?.id, range, language),
    queryFn: () => analyzeMoodInsights(range, language),
    enabled: false, // On-demand only
    staleTime: QUERY_STALE_TIMES.moodInsights,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const snapshot = toMoodInsightSnapshot(query.data, range, language);

    if (!snapshot) {
      return;
    }

    queryClient.setQueryData(queryKeys.latestMoodInsight(user.id, range, language), snapshot);
  }, [language, query.data, queryClient, range, user?.id]);

  return query;
};
