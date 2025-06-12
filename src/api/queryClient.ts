import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { logger } from '@/utils/debugConfig';

// Configure online manager for React Native
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

/**
 * Optimized stale time configurations based on data volatility
 */
export const QUERY_STALE_TIMES = {
  // Very dynamic data - short cache
  entries: 2 * 60 * 1000, // 2 minutes (user actively modifying)
  randomEntry: 0, // 0 - always fresh for variety

  // Moderately dynamic data - medium cache
  profile: 8 * 60 * 1000, // 8 minutes (settings change occasionally)
  streaks: 6 * 60 * 1000, // 6 minutes (updates with new entries)
  prompts: 15 * 60 * 1000, // 15 minutes (varied but not critical)

  // Static data - long cache
  benefits: 24 * 60 * 60 * 1000, // 24 hours (very static content)
  totalCount: 10 * 60 * 1000, // 10 minutes (changes slowly)
  monthlyData: 20 * 60 * 1000, // 20 minutes (historical data)
} as const;

/**
 * Create and configure TanStack Query client with optimal settings
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Optimized default stale time for better performance
      staleTime: QUERY_STALE_TIMES.entries, // 2 minutes default for dynamic content

      // Cache time: How long inactive data stays in memory
      gcTime: 15 * 60 * 1000, // 15 minutes (increased for better UX)

      // Enhanced retry configuration with performance optimization
      retry: (failureCount, error: unknown) => {
        // Don't retry for authentication/authorization errors
        if (
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          (error.status === 404 || error.status === 401 || error.status === 403)
        ) {
          return false;
        }

        // Performance-aware retry limits
        const maxRetries = Platform.OS === 'ios' && __DEV__ ? 3 : 2; // Reduced for performance
        return failureCount < maxRetries;
      },

      // Optimized retry delay with faster initial retry
      retryDelay: (attemptIndex) => {
        const baseDelay = Platform.OS === 'ios' && __DEV__ ? 1500 : 1000; // Faster initial retry
        const maxDelay = Platform.OS === 'ios' && __DEV__ ? 10000 : 8000; // Lower max delay
        return Math.min(baseDelay * 2 ** attemptIndex, maxDelay);
      },

      // Network mode: Don't fetch when offline
      networkMode: 'online',

      // Performance optimizations
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',

      // Background refetching for better UX
      refetchOnMount: true,
      refetchInterval: false, // Will be configured per-query as needed
    },
    mutations: {
      retry: 1,
      retryDelay: 800, // Faster mutation retry
      networkMode: 'online',
    },
  },
});

// Enhanced error handling with performance monitoring
queryClient.getQueryCache().config.onError = (error, query) => {
  logger.error('Query error occurred', {
    extra: {
      queryKey: query.queryKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
  });
};

queryClient.getMutationCache().config.onError = (error, variables, context, mutation) => {
  logger.error('Mutation error occurred', {
    extra: {
      mutationKey: mutation.options.mutationKey,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
  });
};

// Performance monitoring hooks
queryClient.getQueryCache().config.onSuccess = (data, query) => {
  if (__DEV__) {
    logger.debug('Query success', {
      extra: {
        queryKey: query.queryKey,
        dataSize: typeof data === 'object' && data ? Object.keys(data).length : 'primitive',
        cached: query.state.dataUpdatedAt < Date.now() - 1000, // Approximate cache detection
      },
    });
  }
};

// DevTools for development (React Native)
if (__DEV__) {
  import('@tanstack/react-query-devtools').then(() => {
    // DevTools will be available in Flipper or web-based debugging
    logger.debug('React Query DevTools loaded for development');
  });
}
