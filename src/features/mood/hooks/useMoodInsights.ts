import { useQuery } from '@tanstack/react-query';
import { analyzeMoodInsights } from '@/api/moodAnalyticsApi';
import useAuthStore from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { AIInsightResponse, MoodAnalyticsRange } from '@/types/moodAnalytics.types';

export const useMoodInsights = (range: MoodAnalyticsRange) => {
  const user = useAuthStore((state) => state.user);
  const { i18n } = useTranslation();
  const language = (['tr', 'es'].includes(i18n.language) ? i18n.language : 'en') as
    | 'tr'
    | 'es'
    | 'en';

  const query = useQuery<AIInsightResponse, Error>({
    queryKey: ['mood-insights', user?.id, range, language],
    queryFn: () => analyzeMoodInsights(range, language),
    enabled: false, // On-demand only
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
  });

  return query;
};
