import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getProfile as fetchProfileApi,
  updateProfile as updateProfileApi,
} from '../api/profileApi'; // Import API functions
import {
  cancelAllScheduledNotifications,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '../services/notificationService';
import useAuthStore from './authStore'; // Import authStore to listen for auth changes

export interface ProfileState {
  id: string | null; // User's Supabase Auth ID
  username: string | null;
  reminder_enabled: boolean;
  reminder_time: string; // Format HH:MM:SS
  onboarded: boolean;
  throwback_reminder_enabled: boolean;
  throwback_reminder_frequency: string; // 'daily', 'weekly', 'monthly'
  // Streak related state
  streak: number | null;
  streakLoading: boolean;
  streakError: string | null;
  // For potential errors during profile operations
  error: string | null;
  // To indicate if profile data is being fetched/updated
  loading: boolean;
  initialProfileFetchAttempted: boolean; // Tracks if the initial fetch for the current user has been tried
}

interface ProfileActions {
  setProfile: (profileData: Partial<ProfileState>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetProfile: () => void;
  // Streak actions implementation
  setStreakLoading: (streakLoading: boolean) => void;
  setStreakError: (streakError: string | null) => void;
  setStreak: (streak: number | null) => void;
  fetchProfile: (retryCount?: number) => Promise<void>; // New action, accepts optional retryCount
  updateThrowbackPreferences: (prefs: {
    throwback_reminder_enabled: boolean;
    throwback_reminder_frequency: string;
  }) => Promise<void>;
  updateDailyReminderSettings: (prefs: {
    reminder_enabled: boolean;
    reminder_time: string;
  }) => Promise<void>;
  setInitialProfileFetchAttempted: (attempted: boolean) => void; // Action to set the flag
}

const initialState: ProfileState = {
  id: null,
  username: null,
  reminder_enabled: true,
  reminder_time: '20:00:00',
  onboarded: false,
  throwback_reminder_enabled: true,
  throwback_reminder_frequency: 'weekly',
  streak: null,
  streakLoading: true,
  streakError: null,
  error: null,
  loading: false, // MODIFIED: Initial profile loading state should be false
  initialProfileFetchAttempted: false,
};

export const useProfileStore = create<ProfileState & ProfileActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setProfile: (profileData: Partial<ProfileState>) =>
        set(state => ({
          ...state,
          ...profileData,
          error: null,
          loading: false,
        })),
      setLoading: loading => set({ loading }),
      setError: error => set({ error, loading: false }),
      // Streak actions implementation
      setStreakLoading: streakLoading => set({ streakLoading }),
      setStreakError: streakError => set({ streakError, streakLoading: false }),
      setStreak: streak =>
        set({ streak, streakLoading: false, streakError: null }),
      fetchProfile: async (retryCount: number = 0) => {
        const {
          id: currentProfileId,
          // loading, // No longer need to check 'loading' here for initial abort
          initialProfileFetchAttempted: currentInitialProfileFetchAttempted, // Renamed to avoid conflict
        } = get();
        const authUserId = useAuthStore.getState().user?.id;

        // Only fetch if authenticated, not already loading, and either:
        // 1. Profile fetch hasn't been attempted for the current auth user.
        // 2. The current profile ID in store doesn't match the authenticated user ID (relevant after re-auth or user switch).
        if (!authUserId) {
          console.log(
            '[profileStore] fetchProfile: No authenticated user. Aborting.'
          );
          set({ loading: false, initialProfileFetchAttempted: true }); // Mark as attempted for non-user state
          return;
        }

        // If initialProfileFetchAttempted is true AND currentProfileId matches authUserId,
        // AND it's an initial call (not a retry), assume profile is current.
        // RootNavigator's useEffect logic should prevent redundant calls primarily.
        if (
          currentInitialProfileFetchAttempted && // Use the renamed variable
          currentProfileId === authUserId &&
          retryCount === 0 // Only apply this optimization for non-retry calls
        ) {
          console.log(
            '[profileStore] fetchProfile: Initial fetch already attempted for this user and profile ID matches. Aborting initial call.'
          );
          set({ loading: false }); // Ensure loading is false if we abort here
          return;
        }

        console.log(
          `[profileStore] fetchProfile called. authUserId: ${authUserId}, currentProfileId: ${currentProfileId}, initialProfileFetchAttempted_from_store: ${currentInitialProfileFetchAttempted}, retryCount: ${retryCount}`
        );
        set({ loading: true, error: null, initialProfileFetchAttempted: true }); // Set attempted true immediately
        // The console.log below is now slightly redundant due to the one before set(), but harmless.
        console.log(
          `[profileStore] fetchProfile called (processing). retryCount: ${retryCount}`
        );
        try {
          const profileData = await fetchProfileApi();
          console.log('[profileStore] profileData from API:', profileData);
          if (profileData && profileData.id) {
            set(state => {
              const newState = {
                ...state,
                ...profileData,
                id: profileData.id, // Explicitly set id from fetched data
                loading: false,
                error: null, // Clear any previous error
              };
              console.log('[profileStore] New state after setting profile:', {
                id: newState.id,
                onboarded: newState.onboarded, // Log onboarded status for clarity
                loading: newState.loading,
              });
              return newState;
            });
          } else if (profileData && !profileData.id) {
            console.warn(
              '[profileStore] Profile data received, but ID is missing:',
              profileData
            );
            set({
              loading: false,
              error: 'Profil bilgisi eksik (ID bulunamadı).',
            });
          } else {
            // profileData is null
            const MAX_RETRIES = 2;
            const RETRY_DELAY_MS = 1000;
            console.log('[profileStore] No profile data returned from API.');
            if (retryCount < MAX_RETRIES) {
              console.log(
                `[profileStore] Scheduling retry attempt ${retryCount + 1} of ${MAX_RETRIES}. Current retryCount: ${retryCount}. Next call with: ${retryCount + 1}.`
              );
              setTimeout(() => {
                console.log(
                  `[profileStore] setTimeout: Calling fetchProfile with retryCount: ${retryCount + 1}`
                );
                get().fetchProfile(retryCount + 1);
              }, RETRY_DELAY_MS);
            } else {
              console.log(
                `[profileStore] Max retries (${MAX_RETRIES}) reached. Final attempt (retryCount=${retryCount}) failed. Setting error.`
              );
              set({ loading: false, error: 'Profil bulunamadı.' });
            }
          }
        } catch (e: unknown) {
          console.error('[profileStore] Error fetching profile in store:', e);
          let errorMessage = 'Profil alınırken bir hata oluştu.';
          if (
            typeof e === 'object' &&
            e !== null &&
            'message' in e &&
            typeof (e as { message: unknown }).message === 'string'
          ) {
            errorMessage = (e as { message: string }).message;
          } else if (typeof e === 'string') {
            errorMessage = e;
          }
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },
      resetProfile: () => {
        console.log('[profileStore] Resetting profile to initial state.');
        set(initialState);
      },
      updateThrowbackPreferences: async prefs => {
        const currentUserId = get().id;
        if (!currentUserId) {
          set({
            error: 'User ID not found. Cannot update throwback preferences.',
            loading: false,
          });
          return;
        }
        set({ loading: true, error: null });
        try {
          // Assuming updateProfileApi can handle partial updates
          const updatedProfile = await updateProfileApi({
            id: currentUserId, // Pass the user ID for the update
            throwback_reminder_enabled: prefs.throwback_reminder_enabled,
            throwback_reminder_frequency: prefs.throwback_reminder_frequency,
          });
          if (updatedProfile) {
            set({
              throwback_reminder_enabled:
                updatedProfile.throwback_reminder_enabled,
              throwback_reminder_frequency:
                updatedProfile.throwback_reminder_frequency,
              loading: false,
              error: null,
            });
          } else {
            // This case might indicate an issue with updateProfileApi returning null on success
            // or if the API itself didn't return the full updated profile.
            // For now, optimistically update state if API doesn't error.
            set({
              throwback_reminder_enabled: prefs.throwback_reminder_enabled,
              throwback_reminder_frequency: prefs.throwback_reminder_frequency,
              loading: false,
              error: null,
            });
            console.warn(
              '[profileStore] updateThrowbackPreferences: updateProfileApi returned no data, but no error. State updated optimistically.'
            );
          }
        } catch (e: unknown) {
          console.error(
            '[profileStore] Error updating throwback preferences:',
            e
          );
          let errorMessage = 'Failed to update throwback preferences.';
          if (
            typeof e === 'object' &&
            e !== null &&
            'message' in e &&
            typeof (e as { message: unknown }).message === 'string'
          ) {
            errorMessage = (e as { message: string }).message;
          } else if (typeof e === 'string') {
            errorMessage = e;
          }
          set({
            error: errorMessage,
            loading: false,
          });
          // Optionally, re-throw or handle more gracefully
        }
      },
      setInitialProfileFetchAttempted: (attempted: boolean) =>
        set({ initialProfileFetchAttempted: attempted }),
      updateDailyReminderSettings: async prefs => {
        const currentUserId = get().id;
        if (!currentUserId) {
          set({
            error: 'User ID not found. Cannot update daily reminder settings.',
            loading: false,
          });
          return;
        }
        set({ loading: true, error: null });

        let finalReminderEnabled = prefs.reminder_enabled;

        try {
          if (prefs.reminder_enabled) {
            const permissionGranted = await requestNotificationPermissions();
            if (permissionGranted) {
              const [hours, minutes] = prefs.reminder_time
                .split(':')
                .map(Number);
              await scheduleDailyReminder(
                hours,
                minutes,
                'Günlük Minnettarlık Zamanı',
                'Bugün neleri fark ettin? Yazmaya ne dersin?'
              );
            } else {
              finalReminderEnabled = false; // Permission denied, force disable
              await cancelAllScheduledNotifications(); // Ensure any old ones are cancelled
            }
          } else {
            await cancelAllScheduledNotifications();
          }

          const updatedProfile = await updateProfileApi({
            id: currentUserId,
            reminder_enabled: finalReminderEnabled,
            reminder_time: prefs.reminder_time,
          });

          if (updatedProfile) {
            set({
              reminder_enabled: updatedProfile.reminder_enabled,
              reminder_time: updatedProfile.reminder_time,
              loading: false,
              error: null,
            });
          } else {
            // Optimistic update if API returns no data but no error
            set({
              reminder_enabled: finalReminderEnabled,
              reminder_time: prefs.reminder_time,
              loading: false,
              error: null,
            });
            console.warn(
              '[profileStore] updateDailyReminderSettings: updateProfileApi returned no data, but no error. State updated optimistically.'
            );
          }
        } catch (e: unknown) {
          console.error(
            '[profileStore] Error updating daily reminder settings:',
            e
          );
          let errorMessage = 'Failed to update daily reminder settings.';
          if (
            typeof e === 'object' &&
            e !== null &&
            'message' in e &&
            typeof (e as { message: unknown }).message === 'string'
          ) {
            errorMessage = (e as { message: string }).message;
          } else if (typeof e === 'string') {
            errorMessage = e;
          }
          set({
            error: errorMessage,
            loading: false,
          });
        }
      },
    }),
    {
      name: 'yeser-profile-storage', // unique name for persist middleware
      storage: createJSONStorage(() => AsyncStorage),
    }
  ) // This closes the persist middleware call
); // This closes the create() call

// Subscribe to authStore to reset profile on auth changes
// This subscription should be defined *after* the store itself is created.
// The 'authUnsubscribe' function can be used to stop listening to authStore changes, e.g., in tests or component unmounts.
// It's not explicitly called here as the subscription is intended to be active for the app's lifecycle.
const authUnsubscribe = useAuthStore.subscribe((state, prevState) => {
  const profileStoreState = useProfileStore.getState(); // Get current state of profileStore
  const currentAuthUserId = state.user?.id;
  const previousAuthUserId = prevState.user?.id;

  console.log(
    '[profileStore] AuthStore subscription triggered. Current authUser ID:',
    currentAuthUserId,
    'Previous authUser ID:',
    previousAuthUserId,
    'Current profile ID:',
    profileStoreState.id
  );

  // Check if the authenticated user has actually changed
  if (currentAuthUserId !== previousAuthUserId) {
    if (!currentAuthUserId) {
      // User logged out
      console.log('[profileStore] User logged out. Resetting profile store.');
      profileStoreState.resetProfile(); // Resets to initialState, which includes initialProfileFetchAttempted: false
    } else {
      // User logged in or changed
      // Reset profile if the new auth user ID is different from the current profile ID in store
      // This handles new logins and user switches correctly.
      if (currentAuthUserId !== profileStoreState.id) {
        console.log(
          '[profileStore] New/different user detected. Resetting profile store.'
        );
        profileStoreState.resetProfile(); // Resets to initialState, including initialProfileFetchAttempted: false
      }
    }
  }
});

// It's good practice to offer a way to unsubscribe if the store were to be dismantled,
// though for global stores it's often not needed outside of specific scenarios like hot module replacement.
// Example for HMR:
// if (module.hot) { module.hot.dispose(() => { authUnsubscribe(); }); }
