import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import useStreakStore, { StreakState, StreakActions } from '../store/streakStore';

import type { Streak } from '../schemas/streakSchema'; // Assuming Streak type has Date objects now

interface UseStreakReturn {
  streak: Streak | null;
  isLoading: boolean;
  error: string | null;
  fetchStreak: () => Promise<void>;
  refreshStreak: () => Promise<void>;
}

const useStreak = (): UseStreakReturn => {
  const {
    streakData,
    streakDataLoading,
    streakDataError,
    refreshStreak: storeRefreshAction, // Renaming for clarity within the hook
  } = useStreakStore(
    useShallow((state: StreakState & StreakActions) => ({
      streakData: state.streakData,
      streakDataLoading: state.streakDataLoading,
      streakDataError: state.streakDataError,
      refreshStreak: state.refreshStreak,
    }))
  );

  // Define a single, memoized function to perform the refresh action.
  const executeRefresh = useCallback(async () => {
    // storeRefreshAction is now directly from the destructured state and stable due to shallow compare
    await storeRefreshAction();
  }, [storeRefreshAction]);

  useFocusEffect(
    useCallback(() => {
      // Only trigger a refresh if not already loading.
      // streakDataLoading is from the store and reflects the current loading state.
      if (!streakDataLoading) {
        executeRefresh();
      }
    }, [executeRefresh, streakDataLoading]) // Added streakDataLoading
  );

  return {
    streak: streakData,
    isLoading: streakDataLoading, // Use the destructured name
    error: streakDataError, // Use the destructured name
    fetchStreak: executeRefresh,
    refreshStreak: executeRefresh,
  };
};

export default useStreak;
