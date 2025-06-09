import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';

// Configure online manager for React Native
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});



/**
 * Create and configure TanStack Query client with optimal settings
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cache time: How long inactive data stays in memory
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)

      // Retry configuration
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
        return failureCount < 3;
      },

      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network mode: Don't fetch when offline
      networkMode: 'online',

      // Refetch on window focus (for web)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// Global error handling
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

// DevTools for development (React Native)
if (__DEV__) {
  import('@tanstack/react-query-devtools').then(() => {
    // DevTools will be available in Flipper or web-based debugging
    logger.debug('React Query DevTools loaded for development');
  });
}
