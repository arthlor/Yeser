import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getGratitudeBenefits } from '@/api/whyGratitudeApi';
import { queryKeys } from '@/api/queryKeys';
import { logger } from '@/utils/debugConfig';
// GratitudeBenefit type is available from types file when needed

/**
 * Custom hook to fetch and cache the gratitude benefits content.
 * This data changes infrequently, so a long staleTime is used.
 *
 * @returns TanStack Query result with data, loading, and error states
 */
export const useGratitudeBenefits = () => {
  const query = useQuery({
    queryKey: queryKeys.gratitudeBenefits(),
    queryFn: getGratitudeBenefits,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours (content changes rarely)
    gcTime: 25 * 60 * 60 * 1000, // 25 hours
    retry: (failureCount, error: Error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle side effects manually since onError/onSuccess are deprecated in v5
  React.useEffect(() => {
    if (query.error) {
      logger.error('Failed to fetch gratitude benefits:', { error: query.error });
    }
  }, [query.error]);

  React.useEffect(() => {
    if (query.data) {
      logger.debug(`Successfully cached ${query.data.length} gratitude benefits`);
    }
  }, [query.data]);

  return query;
};
