import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { queryKeyHelpers } from '@/api/queryKeyHelpers';
import { logger } from '@/utils/debugConfig';
import { queryClient } from '@/api/queryClient';

interface MutationData {
  entryDate?: string;
  [key: string]: unknown;
}

export class CacheService {
  constructor(private queryClient: QueryClient) {}

  /**
   * Smart invalidation based on operation type
   */
  invalidateAfterMutation(operation: string, userId: string, data?: MutationData) {
    logger.debug(`Invalidating cache after ${operation}`, { userId, data });

    switch (operation) {
      case 'add_statement':
      case 'edit_statement':
      case 'delete_statement':
        queryKeyHelpers.invalidateEntryData(userId, data?.entryDate).forEach(key => {
          if (key) {
            this.queryClient.invalidateQueries({ queryKey: key });
          }
        });
        break;

      case 'update_profile':
        this.queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        // Profile changes might affect other queries
        this.queryClient.invalidateQueries({ queryKey: queryKeys.streaks(userId) });
        break;

      case 'logout':
        queryKeyHelpers.clearAllUserCache(this.queryClient, userId);
        break;

      default:
        logger.warn(`Unknown operation for cache invalidation: ${operation}`);
    }
  }

  /**
   * Prefetch commonly used data
   */
  async prefetchUserData(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    // Prefetch today's entry
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.gratitudeEntry(userId, today),
      queryFn: () => import('@/api/gratitudeApi').then(api => api.getGratitudeDailyEntryByDate(today)),
    });

    // Prefetch user profile
    await this.queryClient.prefetchQuery({
      queryKey: queryKeys.profile(userId),
      queryFn: () => import('@/api/profileApi').then(api => api.getProfile()),
    });
  }

  /**
   * Clean up stale cache entries
   */
  cleanupCache() {
    this.queryClient.getQueryCache().clear();
    logger.debug('Cache cleaned up');
  }
}

// Singleton instance
export const cacheService = new CacheService(queryClient); 