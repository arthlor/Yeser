import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

import { useProfileStore } from '../store/profileStore';
import type { Streak } from '../schemas/streakSchema'; // Assuming Streak type has Date objects now

interface UseStreakReturn {
  streak: Streak | null;
  isLoading: boolean;
  error: string | null;
  fetchStreak: () => Promise<void>;
  refreshStreak: () => Promise<void>;
}

const useStreak = (): UseStreakReturn => {
  const streakData = useProfileStore((state) => state.streakData);
  const streakLoading = useProfileStore((state) => state.streakDataLoading);
  const streakError = useProfileStore((state) => state.streakDataError);

  // Assuming state.refreshStreak is the actual function in the store to call for data refresh.
  const storeRefreshAction = useProfileStore(state => state.refreshStreak);

  // Define a single, memoized function to perform the refresh action.
  // This function will be returned for both fetchStreak and refreshStreak.
  const executeRefresh = useCallback(async () => {
    if (storeRefreshAction) {
      await storeRefreshAction();
    } else {
      // It's good practice to handle the case where the action might not be available,
      // though typically Zustand actions are always defined.
      console.warn('useStreak: refreshStreak action is not available in the profile store.');
      // Optionally, you could set an error state here or return a rejected promise.
      // For now, it just logs a warning and does nothing.
    }
  }, [storeRefreshAction]); // Dependency: storeRefreshAction from Zustand selector

  useFocusEffect(
    useCallback(() => {
      // Call the unified refresh function on screen focus.
      executeRefresh();
    }, [executeRefresh]) // Dependency: our memoized executeRefresh function
  );

  return {
    streak: streakData,
    isLoading: streakLoading,
    error: streakError,
    fetchStreak: executeRefresh,   // Both properties point to the same function
    refreshStreak: executeRefresh, // Consistent API for the consumer
  };
};

export default useStreak;