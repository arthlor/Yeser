import { getRandomGratitudeEntry } from '@/api/gratitudeApi';
import { queryKeys } from '@/api/queryKeys';
import { type GratitudeEntry, gratitudeEntrySchema } from '@/schemas/gratitudeEntrySchema';
import useAuthStore from '@/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';
import { useGlobalError } from '@/providers/GlobalErrorProvider';

export type ThrowbackFrequency = 'daily' | 'weekly' | 'monthly' | 'disabled';

interface ThrowbackSettings {
  isEnabled: boolean;
  frequency: ThrowbackFrequency;
}

interface CheckThrowbackArgs extends ThrowbackSettings {
  totalEntryCount: number;
}

const LAST_THROWBACK_KEY = 'lastThrowbackShownAt';

/**
 * Hook to get a random gratitude entry for throwback
 * Uses TanStack Query for caching and background updates
 */
export const useRandomGratitudeEntry = (enabled = true) => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.randomGratitudeEntry(user?.id),
    queryFn: async (): Promise<GratitudeEntry | null> => {
      const rawEntry = await getRandomGratitudeEntry();

      if (!rawEntry) {
        return null;
      }

      const validationResult = gratitudeEntrySchema.safeParse(rawEntry);

      if (validationResult.success) {
        return validationResult.data;
      } else {
        logger.error('Zod validation error in useRandomGratitudeEntry:', {
          extra: validationResult.error.flatten(),
        });
        throw new Error('Received invalid throwback data. Please try again.');
      }
    },
    enabled: !!user?.id && enabled,
    staleTime: 0, // Always fetch fresh random entry
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

/**
 * Hook for managing throwback mutations and client state
 */
export const useThrowbackMutations = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { handleMutationError } = useGlobalError();

  const fetchNewRandomEntry = useMutation({
    mutationFn: async (): Promise<GratitudeEntry | null> => {
      const rawEntry = await getRandomGratitudeEntry();

      if (!rawEntry) {
        return null;
      }

      const validationResult = gratitudeEntrySchema.safeParse(rawEntry);

      if (validationResult.success) {
        // Update last shown timestamp
        await AsyncStorage.setItem(LAST_THROWBACK_KEY, Date.now().toString());
        return validationResult.data;
      } else {
        logger.error('Zod validation error in fetchNewRandomEntry:', {
          extra: validationResult.error.flatten(),
        });
        throw new Error('Received invalid throwback data. Please try again.');
      }
    },

    onSuccess: (newEntry) => {
      // Update the random entry cache with new data
      queryClient.setQueryData(queryKeys.randomGratitudeEntry(user?.id), newEntry);
    },

    onError: (error) => {
      logger.error('[useThrowbackMutations] Error fetching random entry:', error);
      handleMutationError(error, 'fetch new random entry');
    },
  });

  const clearRandomEntry = () => {
    queryClient.setQueryData(queryKeys.randomGratitudeEntry(user?.id), null);
  };

  return {
    fetchNewRandomEntry: fetchNewRandomEntry.mutate,
    isFetchingRandomEntry: fetchNewRandomEntry.isPending,
    fetchRandomEntryError: fetchNewRandomEntry.error,
    clearRandomEntry,
  };
};

/**
 * Hook for managing throwback timing and visibility logic
 */
export const useThrowbackLogic = () => {
  const getLastThrowbackTime = async (): Promise<number | null> => {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_THROWBACK_KEY);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      logger.error('Error getting last throwback time:', error as Error);
      return null;
    }
  };

  const setLastThrowbackTime = async (timestamp: number): Promise<void> => {
    try {
      await AsyncStorage.setItem(LAST_THROWBACK_KEY, timestamp.toString());
    } catch (error) {
      logger.error('Error setting last throwback time:', error as Error);
    }
  };

  const shouldShowThrowback = async (args: CheckThrowbackArgs): Promise<boolean> => {
    const { isEnabled, frequency, totalEntryCount } = args;

    if (!isEnabled) {
      return false;
    }

    // Minimum entry count checks
    const MIN_ENTRIES_WEEKLY = 7;
    const MIN_ENTRIES_MONTHLY = 15;
    const MIN_ENTRIES_DAILY = 1;

    if (frequency === 'weekly' && totalEntryCount < MIN_ENTRIES_WEEKLY) {
      return false;
    }
    if (frequency === 'monthly' && totalEntryCount < MIN_ENTRIES_MONTHLY) {
      return false;
    }
    if (frequency === 'daily' && totalEntryCount < MIN_ENTRIES_DAILY) {
      return false;
    }
    if (totalEntryCount < 1) {
      return false;
    }

    const lastThrowbackShownAt = await getLastThrowbackTime();
    const now = Date.now();
    let timeThreshold = 0;

    switch (frequency) {
      case 'daily':
        timeThreshold = 23 * 60 * 60 * 1000; // Slightly less than 24h
        break;
      case 'weekly':
        timeThreshold = 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        timeThreshold = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        return false;
    }

    return lastThrowbackShownAt === null || now - lastThrowbackShownAt > timeThreshold;
  };

  return {
    getLastThrowbackTime,
    setLastThrowbackTime,
    shouldShowThrowback,
  };
};

/**
 * Main throwback hook that combines all functionality
 * Replaces the old throwbackStore with TanStack Query + client state logic
 */
export const useThrowback = (_settings?: ThrowbackSettings & { totalEntryCount?: number }) => {
  const { fetchNewRandomEntry, isFetchingRandomEntry, clearRandomEntry } = useThrowbackMutations();
  const { shouldShowThrowback, setLastThrowbackTime } = useThrowbackLogic();

  const {
    data: randomEntry,
    isLoading: isLoadingRandomEntry,
    error: randomEntryError,
    refetch: refetchRandomEntry,
  } = useRandomGratitudeEntry(false); // Don't auto-fetch

  const checkAndShowThrowbackIfNeeded = async (args: CheckThrowbackArgs) => {
    const shouldShow = await shouldShowThrowback(args);

    if (shouldShow) {
      fetchNewRandomEntry();
    }
  };

  const showThrowback = () => {
    if (!randomEntry) {
      fetchNewRandomEntry();
    }
  };

  const hideThrowback = async () => {
    clearRandomEntry();
    await setLastThrowbackTime(Date.now());
  };

  const refreshThrowback = () => {
    fetchNewRandomEntry();
  };

  return {
    // Data
    randomEntry,
    isLoading: isLoadingRandomEntry || isFetchingRandomEntry,
    error: randomEntryError,

    // Actions
    checkAndShowThrowbackIfNeeded,
    showThrowback,
    hideThrowback,
    refreshThrowback,
    refetchRandomEntry,

    // State
    hasRandomEntry: !!randomEntry,
  };
};
