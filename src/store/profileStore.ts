import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getProfile as fetchProfileApi,
  updateProfile as updateProfileApi,
  fetchUserStreak, // Will be replaced by getStreakData or getStreakData will be added
  getStreakData,   // Import the new function
} from '../api/profileApi'; // Import API functions
import { profileSchema, type Profile, type UpdateProfilePayload } from '../schemas/profileSchema';
import { streakSchema, type Streak } from '../schemas/streakSchema'; // Import Streak type and schema
import {
  cancelAllScheduledNotifications,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '../services/notificationService';
import useAuthStore from './authStore'; // Import authStore to listen for auth changes

export interface ProfileState {
  // Fields from the Zod Profile schema
  id: string | null; // Initially null, then string (user's Supabase Auth ID)
  username: Profile['username'];
  onboarded: Profile['onboarded'];
  reminder_enabled: Profile['reminder_enabled'];
  reminder_time: Profile['reminder_time'] | null; // Allow null in store state
  // theme_preference removed from here, will be a separate top-level state
  throwback_reminder_enabled: Profile['throwback_reminder_enabled']; // Added
  throwback_reminder_frequency: Profile['throwback_reminder_frequency'];
  // last_entry_date removed from here, streak data managed separately
  created_at: Profile['created_at'] | null;
  updated_at: string | null | undefined; // ISO 8601 datetime string
  daily_gratitude_goal: Profile['daily_gratitude_goal'];
  // email is intentionally omitted as per schema (not directly stored/managed here)

  // Client-side theme preference
  theme: 'light' | 'dark' | 'system';

  // Streak related state
  streakData: Streak | null; 
  streakDataLoading: boolean;
  streakDataError: string | null;

  // Store-specific operational state
  error: string | null;
  loading: boolean;
  initialProfileFetchAttempted: boolean;
}

export interface ProfileActions {
  setProfile: (profileData: Partial<Profile>) => void; // Argument should be Partial<Profile> from the new schema
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetProfile: () => void;
  // Theme action
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  // Streak actions implementation
  setStreakDataLoading: (streakDataLoading: boolean) => void;
  setStreakDataError: (streakDataError: string | null) => void;
  setStreakData: (streakData: Streak | null) => void;
  fetchProfile: (retryCount?: number) => Promise<void>; // New action, accepts optional retryCount
  updateThrowbackPreferences: (prefs: {
    throwback_reminder_enabled: Profile['throwback_reminder_enabled'];
    throwback_reminder_frequency: Profile['throwback_reminder_frequency'];
  }) => Promise<void>;
  updateDailyReminderSettings: (prefs: {
    reminder_enabled: boolean;
    reminder_time: string | null;
  }) => Promise<void>;
  setInitialProfileFetchAttempted: (attempted: boolean) => void; // Action to set the flag
  refreshStreak: () => Promise<void>; // Action to specifically refresh streak
}

const initialState: ProfileState = {
  id: null,
  username: null,
  reminder_enabled: true, // Default from original schema
  reminder_time: '20:00:00', // Default time, can be null
  onboarded: false, // Default from original schema
  throwback_reminder_enabled: true, // Added, default from DB schema
  throwback_reminder_frequency: 'weekly', // Or 'weekly', 'monthly', 'disabled'
  daily_gratitude_goal: 3, // Default daily goal from original schema
  created_at: null,
  updated_at: null,
  theme: 'system', // Default client-side theme
  streakData: null,
  streakDataLoading: true,
  streakDataError: null,
  error: null,
  loading: false,
  initialProfileFetchAttempted: false,
};

export const useProfileStore = create<ProfileState & ProfileActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setProfile: (profileUpdates: Partial<Profile>) => {
        const filteredUpdates: Partial<ProfileState> = {};
        for (const key in profileUpdates) {
          if (Object.prototype.hasOwnProperty.call(profileUpdates, key)) {
            const typedKey = key as keyof Profile;
            if (profileUpdates[typedKey] !== undefined) {
              (filteredUpdates as any)[typedKey] = profileUpdates[typedKey];
            }
          }
        }
        set((state) => ({
          ...state,
          ...filteredUpdates, // Spread the filtered updates
          error: null,
          loading: false,
        }));
      },
      setTheme: (theme) => set({ theme }),
      setLoading: loading => set({ loading }),
      setError: error => set({ error, loading: false }),
      // Streak actions implementation
      setStreakDataLoading: streakDataLoading => set({ streakDataLoading }),
      setStreakDataError: streakDataError => set({ streakDataError, streakDataLoading: false }),
      setStreakData: streakData =>
        set({ streakData, streakDataLoading: false, streakDataError: null }),
      fetchProfile: async (retryCount: number = 0) => {
        const {
          id: currentProfileId,
          initialProfileFetchAttempted: currentInitialProfileFetchAttempted,
        } = get();
        const authUserId = useAuthStore.getState().user?.id;

        if (!authUserId) {
          console.log('[profileStore] fetchProfile: No authenticated user. Aborting.');
          set({ loading: false, initialProfileFetchAttempted: true });
          return;
        }

        // If initial fetch was already done for this user (currentProfileId === authUserId) 
        // and this is not an explicit retry (retryCount === 0), then don't re-fetch.
        if (currentInitialProfileFetchAttempted && currentProfileId === authUserId && retryCount === 0) {
          console.log('[profileStore] fetchProfile: Initial fetch already successfully completed for this user. Aborting redundant fetch.');
          set({ loading: false }); // Ensure loading is false if we abort early
          return;
        }

        console.log(`[profileStore] fetchProfile called. authUserId: ${authUserId}, currentProfileId: ${currentProfileId}, initialProfileFetchAttempted_from_store: ${currentInitialProfileFetchAttempted}, retryCount: ${retryCount}`);
        // Set loading true only if it's the first attempt of a fetch sequence or a retry is in progress.
        // Error is nulled out at the beginning of a fetch attempt sequence.
        if (retryCount === 0) {
          set({ loading: true, error: null, initialProfileFetchAttempted: true });
        } else {
          set({ loading: true, initialProfileFetchAttempted: true }); // Keep existing error until final failure or success
        }

        const MAX_RETRIES = 2; // Total 3 attempts (initial + 2 retries)
        const RETRY_DELAY_MS = 2000;

        try {
          const rawProfileData = await fetchProfileApi();
          console.log('[profileStore] rawProfileData from API:', rawProfileData);

          if (rawProfileData) {
            const profileData = profileSchema.parse(rawProfileData); // This can throw ZodError
            if (profileData.id) {
              set(state => ({
                ...state,
                ...profileData,
                id: profileData.id,
                loading: false,
                error: null, // Clear error on success
              }));
              // Streak refresh logic
              try {
                console.log('[profileStore] Profile fetched successfully, attempting to refresh streak.');
                await get().refreshStreak();
              } catch (streakError) {
                console.error('[profileStore] Error during streak refresh after profile fetch:', streakError);
              }
              return; // Successful fetch, exit
            } else {
              console.warn('[profileStore] Parsed profile data is valid but missing an ID:', profileData);
              set({ loading: false, error: 'Profil bilgisi ayrıştırıldı ancak ID eksik.' });
              return; // Non-retryable data issue
            }
          } else {
            // rawProfileData is null, meaning profile not found
            console.log('[profileStore] No profile data returned from API (profile not found).');
            set({ loading: false, error: 'Profil bulunamadı.' });
            return; // Non-retryable, profile doesn't exist
          }
        } catch (err: any) {
          console.error(`[profileStore] Error in fetchProfile (attempt ${retryCount + 1} of ${MAX_RETRIES + 1}):`, err);

          if (err.constructor.name === 'ZodError') {
            const errorMessage = 'Alınan profil verisi beklenen formatta değil: ' + (err.issues || err.errors)?.map((e: any) => `${e.path.join('.')} (${e.message})`).join(', ') || 'Zod validation error.';
            set({ error: errorMessage, loading: false });
          } else if (retryCount < MAX_RETRIES) {
            console.log(`[profileStore] Retrying fetchProfile in ${RETRY_DELAY_MS}ms. Attempt ${retryCount + 2}...`);
            setTimeout(() => {
              get().fetchProfile(retryCount + 1);
            }, RETRY_DELAY_MS);
            // loading remains true, error (if any from previous retries) might persist until final failure or success
          } else {
            // Max retries reached for other errors
            let errorMessage = 'Profil yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.';
            if (err instanceof Error && err.message) {
              errorMessage = err.message;
            } else if (typeof err === 'string' && err) {
              errorMessage = err;
            }
            console.error('[profileStore] Max retries reached for fetchProfile.');
            set({ error: errorMessage, loading: false });
          }
        }
      },
      resetProfile: () => {
        console.log('[profileStore] Resetting profile to initial state.');
        set(initialState);
      },
      refreshStreak: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) {
          console.log('[profileStore] refreshStreak: No user ID, cannot refresh streak data.');
          set({ streakData: null, streakDataLoading: false, streakDataError: 'Kullanıcı bulunamadı.' });
          return;
        }

        console.log('[profileStore] Refreshing streak data...');
        set({ streakDataLoading: true, streakDataError: null });
        try {
          const rawStreakData = await getStreakData();
          console.log('[profileStore] Fetched raw streak data:', rawStreakData);
          if (rawStreakData === null) {
            set({ streakData: null, streakDataLoading: false, streakDataError: null });
          } else {
            const parsedStreakData = streakSchema.parse(rawStreakData);
            console.log('[profileStore] Parsed streak data:', parsedStreakData);
            set({ streakData: parsedStreakData, streakDataLoading: false, streakDataError: null });
          }
        } catch (err: any) {
          console.error('[profileStore] Error refreshing streak data:', err);
          let errorMessage = 'Minnet serisi bilgisi yenilenirken bir hata oluştu.';
          if (err.constructor.name === 'ZodError') {
            errorMessage = 'Alınan seri verisi beklenen formatta değil: ' + (err.issues || err.errors)?.map((e: any) => `${e.path.join('.')} (${e.message})`).join(', ') || 'Zod validation error.';
          } else if (err instanceof Error) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }
          set({
            streakData: null, // Keep streakData null on error
            streakDataLoading: false,
            streakDataError: errorMessage,
          });
        }
      },
      updateThrowbackPreferences: async (prefs: {
        throwback_reminder_enabled: Profile['throwback_reminder_enabled'];
        throwback_reminder_frequency: Profile['throwback_reminder_frequency'];
      }) => {
        const currentUserIdFromGet = get().id; // This is string | null
        if (!currentUserIdFromGet) {
          set({
            error: 'User ID not found. Cannot update throwback preferences.',
            loading: false,
          });
          return;
        }
        const currentUserId: string = currentUserIdFromGet; // Explicitly typed after guard

        set({ loading: true, error: null });
        try {
          // Construct the payload for the API call - should be UpdateProfilePayload
          const currentPrefs = {
            throwback_reminder_enabled: get().throwback_reminder_enabled,
            throwback_reminder_frequency: get().throwback_reminder_frequency,
          };

          const updatePayload: UpdateProfilePayload = {
            throwback_reminder_enabled: prefs.throwback_reminder_enabled,
            throwback_reminder_frequency: prefs.throwback_reminder_frequency,
          };

          // Call the API to update the profile
          const rawUpdatedProfileData = await updateProfileApi(updatePayload);

          // Note: updateProfileApi is expected to return the updated profile data
          // which should conform to the Profile schema (or a subset if that's how the API is designed).
          // If updateProfileApi throws, it's caught below. If it returns null/undefined unexpectedly,
          // profileSchema.parse will likely fail if the schema doesn't allow null/undefined at the root.
          const parsedProfileData = profileSchema.parse(rawUpdatedProfileData);

          // Assuming parse is successful, parsedProfileData is a valid Profile object
          set(state => ({
            ...state,
            ...parsedProfileData, // Spread the parsed and validated profile data
            loading: false,
            error: null,
          }));
          // Potentially call get().refreshStreak(); if these settings could affect streak, but they don't directly.
        } catch (err: any) {
          console.error('[profileStore] Error updating throwback preferences:', err);
          let errorMessage = 'Geriye dönüş hatırlatıcı tercihleri güncellenirken bir hata oluştu.';
          if (err.constructor.name === 'ZodError') {
            errorMessage = 'Alınan profil verisi beklenen formatta değil: ' + (err.issues || err.errors)?.map((e: any) => `${e.path.join('.')} (${e.message})`).join(', ') || 'Zod validation error.';
          } else if (err instanceof Error) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }
          set({
            error: errorMessage,
            loading: false,
          });
        }
      }, // End of updateThrowbackPreferences

      updateDailyReminderSettings: async (prefs: { reminder_enabled: boolean; reminder_time: string | null }) => {
        const currentUserId = get().id;
        if (!currentUserId) {
          set({ error: 'User ID not found. Cannot update daily reminder settings.', loading: false });
          return;
        }

        set({ loading: true, error: null });
        try {
          const updatePayload: UpdateProfilePayload = {
            reminder_enabled: prefs.reminder_enabled,
            reminder_time: prefs.reminder_time,
          };

          const rawUpdatedProfileData = await updateProfileApi(updatePayload);
          const parsedProfileData = profileSchema.parse(rawUpdatedProfileData);

          // parsedProfileData is a valid Profile object
          set(state => ({
            ...state,
            ...parsedProfileData, // Spread the parsed and validated profile data
            loading: false,
            error: null,
          }));

          // Use reminder_enabled and reminder_time directly from parsedProfileData for notification logic
          if (parsedProfileData.reminder_enabled && typeof parsedProfileData.reminder_time === 'string') {
            const [hoursStr, minutesStr] = parsedProfileData.reminder_time.split(':');
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);
            if (!isNaN(hours) && !isNaN(minutes)) {
              await requestNotificationPermissions();
              await scheduleDailyReminder(hours, minutes, 'Günlük Minnettarlık Hatırlatması', 'Bugün neleri fark ettin? Yazmaya ne dersin?');
            } else {
              console.warn('[profileStore] Invalid reminder_time format for scheduling:', parsedProfileData.reminder_time);
              await cancelAllScheduledNotifications(); // Cancel if time is invalid
            }
          } else {
            // If reminders are disabled or time is not set/invalid, cancel all
            await cancelAllScheduledNotifications();
          }
        } catch (err: any) {
          console.error('[profileStore] Error updating daily reminder settings:', err);
          let errorMessage = 'Günlük hatırlatıcı ayarları güncellenirken bir hata oluştu.';
          if (err.constructor.name === 'ZodError') {
            errorMessage = 'Alınan profil verisi beklenen formatta değil: ' + (err.issues || err.errors)?.map((e: any) => `${e.path.join('.')} (${e.message})`).join(', ') || 'Zod validation error.';
          } else if (err instanceof Error) {
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }
          set({ error: errorMessage, loading: false });
        }
      }, // End of updateDailyReminderSettings

      setInitialProfileFetchAttempted: (attempted: boolean) =>
        set({ initialProfileFetchAttempted: attempted }),

    }), // This closes the (set, get) => ({...}) actions object
    {
      name: 'yeser-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1, // Added a version for migration
      migrate: (persistedState: any, version: number) => {
        console.log('[profileStore] Attempting migration. Current persisted version:', version, 'Target version: 1');
        if (version < 1) {
          // This block runs if the persisted state is older than version 1
          if (persistedState && typeof persistedState.reminder_time === 'string') {
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
            if (!timeRegex.test(persistedState.reminder_time)) {
              console.warn(`[profileStore] Migrating invalid reminder_time "${persistedState.reminder_time}" from AsyncStorage to null.`);
              persistedState.reminder_time = null;
            }
          }
        }
        return persistedState;
      },
    } // This is the persist config object
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
