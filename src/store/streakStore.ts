import { create } from 'zustand';

import { getStreakData } from '../api/streakApi';

import useAuthStore from './authStore'; // To listen for auth changes

import type { Streak } from '../schemas/streakSchema';

export interface StreakState {
  streakData: Streak | null;
  streakDataLoading: boolean;
  streakDataError: string | null;
  initialStreakFetchAttempted: boolean;
}

export interface StreakActions {
  setStreakDataLoading: (loading: boolean) => void;
  setStreakDataError: (error: string | null) => void;
  setStreakData: (data: Streak | null) => void;
  refreshStreak: (retryCount?: number) => Promise<void>;
  resetStreak: () => void;
  setInitialStreakFetchAttempted: (attempted: boolean) => void;
}

const initialState: StreakState = {
  streakData: null,
  streakDataLoading: false,
  streakDataError: null,
  initialStreakFetchAttempted: false,
};

// Helper function to deeply compare two Streak objects
const areStreaksEqual = (s1: Streak | null, s2: Streak | null): boolean => {
  if (s1 === s2) return true; // Handles case where both are null or same instance
  if (!s1 || !s2) return false; // One is null, the other isn't

  // Compare primitive fields
  if (
    s1.id !== s2.id ||
    s1.user_id !== s2.user_id ||
    s1.current_streak !== s2.current_streak ||
    s1.longest_streak !== s2.longest_streak
  ) {
    return false;
  }

  // Compare Date fields by their time value
  if (s1.created_at.getTime() !== s2.created_at.getTime()) return false;
  if (s1.updated_at.getTime() !== s2.updated_at.getTime()) return false;

  // Compare last_entry_date (can be Date or null)
  if (s1.last_entry_date === null && s2.last_entry_date !== null) return false;
  if (s1.last_entry_date !== null && s2.last_entry_date === null) return false;
  if (
    s1.last_entry_date &&
    s2.last_entry_date &&
    s1.last_entry_date.getTime() !== s2.last_entry_date.getTime()
  ) {
    return false;
  }

  return true;
};

export const useStreakStore = create<StreakState & StreakActions>()((set, get) => ({
  ...initialState,

  setStreakDataLoading: (streakDataLoading) => {
    set({ streakDataLoading });
  },
  setStreakDataError: (streakDataError) => {
    set({ streakDataError, streakDataLoading: false });
  },
  setStreakData: (streakData) => {
    set({ streakData, streakDataLoading: false, streakDataError: null });
  },
  setInitialStreakFetchAttempted: (attempted) => {
    set({ initialStreakFetchAttempted: attempted });
  },

  refreshStreak: async (retryCount = 0) => {
    const authUserId = useAuthStore.getState().user?.id;
    const {
      initialStreakFetchAttempted: currentInitialFetchAttempted,
      streakDataLoading: currentLoading,
    } = get();

    if (!authUserId) {
      console.log('[streakStore] refreshStreak: No authenticated user. Aborting.');
      set({ streakDataLoading: false, initialStreakFetchAttempted: true });
      return;
    }

    // If it's a new call (not a retry) AND initial fetch was already attempted AND we are not currently loading:
    // This guards against re-triggering a fetch unnecessarily from UI effects.
    if (retryCount === 0 && currentInitialFetchAttempted && !currentLoading) {
      console.log(
        '[streakStore] refreshStreak: Initial fetch already attempted, not a retry, and not currently loading. Aborting.'
      );
      return;
    }

    // If already loading (e.g. a fetch or retry is in progress) and this is a new call (not part of the retry chain):
    // Abort to prevent stacking another fetch.
    if (currentLoading && retryCount === 0) {
      console.log(
        '[streakStore] refreshStreak: Already loading and this is a new call. Aborting to prevent stacking.'
      );
      return;
    }

    // Set loading state. Clear previous error only on the first attempt of a sequence.
    set({
      streakDataLoading: true,
      streakDataError: retryCount === 0 ? null : get().streakDataError,
      initialStreakFetchAttempted: true,
    });

    const MAX_RETRIES = 1; // Total 2 attempts (initial + 1 retry)
    const RETRY_DELAY_MS = 1500;

    try {
      console.log(`[streakStore] Attempting to fetch streak data (attempt ${retryCount + 1})`);
      const streakDataResult = await getStreakData(); // Fetches from streakApi
      const currentStreakData = get().streakData;

      if (areStreaksEqual(currentStreakData, streakDataResult)) {
        // Data is the same, only update loading/error status if necessary
        if (get().streakDataLoading || get().streakDataError) {
          set({
            streakDataLoading: false,
            streakDataError: null,
          });
        }
      } else {
        // Data is different, update everything
        set({
          streakData: streakDataResult,
          streakDataLoading: false,
          streakDataError: null,
        });
      }
      console.log('[streakStore] Streak data fetched successfully:', streakDataResult);
    } catch (error: any) {
      console.error(`[streakStore] Error fetching streak data (attempt ${retryCount + 1}):`, error);
      if (retryCount < MAX_RETRIES) {
        console.log(
          `[streakStore] Retrying refreshStreak in ${RETRY_DELAY_MS}ms. Attempt ${retryCount + 2}...`
        );
        setTimeout(() => {
          get().refreshStreak(retryCount + 1);
        }, RETRY_DELAY_MS);
      } else {
        set({
          streakData: null,
          streakDataLoading: false,
          streakDataError: error.message || 'Failed to fetch streak data after multiple retries.',
        });
      }
    }
  },

  resetStreak: () => {
    console.log('[streakStore] Resetting streak state.');
    set(initialState);
  },
}));

// Subscribe to authStore to reset streak data on auth changes (logout)
useAuthStore.subscribe((state, prevState) => {
  // If the user logs out (user object goes from non-null to null)
  if (prevState.user && !state.user) {
    console.log('[streakStore] Auth state changed (user logged out), resetting streak store.');
    useStreakStore.getState().resetStreak();
  }
  // If a new user logs in (user object goes from null to non-null, or user.id changes)
  // We might want to trigger a refreshStreak here or let components do it.
  // For now, just resetting on logout is fine. Initial fetch will be triggered by components.
  if (
    (!prevState.user && state.user) ||
    (prevState.user && state.user && prevState.user.id !== state.user.id)
  ) {
    console.log(
      '[streakStore] Auth state changed (user logged in or changed), clearing initial fetch attempt flag.'
    );
    useStreakStore.getState().setInitialStreakFetchAttempted(false);
    // Components that need streak data should call refreshStreak on mount/focus if not already fetched.
  }
});

export default useStreakStore;
