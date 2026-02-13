import { useQuery } from '@tanstack/react-query';
import { analyzeMoodInsights } from '@/features/mood/api';
import { queryKeys } from '@/shared/query/queryKeys';
import { QUERY_STALE_TIMES } from '@/shared/query/queryClient';
import { useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { useTranslation } from 'react-i18next';
import { AIInsightResponse, MoodAnalyticsRange } from '@/types/moodAnalytics.types';

export const useMoodInsights = (range: MoodAnalyticsRange) => {
  const user = useCoreAuthStore((state) => state.user);
  const { i18n } = useTranslation();
  const language = (['tr', 'es'].includes(i18n.language) ? i18n.language : 'en') as
    | 'tr'
    | 'es'
    | 'en';

  const query = useQuery<AIInsightResponse, Error>({
    queryKey: queryKeys.moodInsights(user?.id, range, language),
    queryFn: () => analyzeMoodInsights(range, language),
    enabled: false, // On-demand only
    staleTime: QUERY_STALE_TIMES.moodInsights,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  return query;
};
