import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getProfile as fetchProfileApi,
  updateProfile as updateProfileApi,
} from '../api/profileApi'; // Import API functions
import { profileSchema, type Profile, type UpdateProfilePayload } from '../schemas/profileSchema';
import {
  cancelAllScheduledNotifications,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '../services/notificationService';

import useAuthStore from './authStore'; // Import authStore to listen for auth changes

// Helper function to compare two Profile objects
const areProfilesEqual = (profileA: Profile, profileB: Profile): boolean => {
  if (profileA === profileB) return true;

  return (
    profileA.id === profileB.id &&
    profileA.username === profileB.username &&
    profileA.onboarded === profileB.onboarded &&
    profileA.reminder_enabled === profileB.reminder_enabled &&
    profileA.reminder_time === profileB.reminder_time && // Profile type has this as string (Zod default)
    profileA.throwback_reminder_enabled === profileB.throwback_reminder_enabled &&
    profileA.throwback_reminder_frequency === profileB.throwback_reminder_frequency &&
    profileA.created_at === profileB.created_at && // string | null | undefined
    profileA.updated_at === profileB.updated_at && // string | null | undefined
    profileA.daily_gratitude_goal === profileB.daily_gratitude_goal &&
    profileA.useVariedPrompts === profileB.useVariedPrompts
  );
};

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
  useVariedPrompts: Profile['useVariedPrompts']; // Added for varied prompts preference
  // email is intentionally omitted as per schema (not directly stored/managed here)

  // Client-side theme preference
  theme: 'light' | 'dark' | 'system';

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
  updateUseVariedPromptsPreference: (useVariedPrompts: boolean) => Promise<void>; // Added
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
  useVariedPrompts: false, // Added, default to false
  theme: 'system', // Default client-side theme,
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
      setTheme: (theme) => {
        set({ theme });
      },
      setLoading: (loading) => {
        set({ loading });
      },
      setError: (error) => {
        set({ error, loading: false });
      },
      fetchProfile: async (retryCount = 0) => {
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
        if (
          currentInitialProfileFetchAttempted &&
          currentProfileId === authUserId &&
          retryCount === 0
        ) {
          console.log(
            '[profileStore] fetchProfile: Initial fetch already successfully completed for this user. Aborting redundant fetch.'
          );
          set({ loading: false }); // Ensure loading is false if we abort early
          return;
        }

        console.log(
          `[profileStore] fetchProfile called. authUserId: ${authUserId}, currentProfileId: ${currentProfileId}, initialProfileFetchAttempted_from_store: ${currentInitialProfileFetchAttempted}, retryCount: ${retryCount}`
        );
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
              const currentStoreState = get();

              if (currentStoreState.id === profileData.id) {
                // Construct a Profile object from current store state for accurate comparison
                const storeProfileAsProfileType: Profile = {
                  id: currentStoreState.id, // Known to be non-null and matching profileData.id here
                  username: currentStoreState.username,
                  onboarded: currentStoreState.onboarded,
                  reminder_enabled: currentStoreState.reminder_enabled,
                  // Profile['reminder_time'] is 'string' (from Zod default '20:00:00').
                  // currentStoreState.reminder_time is 'string | null'. Coalesce null to default string.
                  reminder_time: currentStoreState.reminder_time ?? '20:00:00',
                  throwback_reminder_enabled: currentStoreState.throwback_reminder_enabled,
                  throwback_reminder_frequency: currentStoreState.throwback_reminder_frequency,
                  // Profile.created_at is 'string'. Asserting currentStoreState.created_at is string in this context.
                  created_at: currentStoreState.created_at!,
                  // Profile.updated_at is 'string'. Asserting currentStoreState.updated_at is string in this context.
                  updated_at: currentStoreState.updated_at!,
                  daily_gratitude_goal: currentStoreState.daily_gratitude_goal,
                  useVariedPrompts: currentStoreState.useVariedPrompts,
                };

                if (!areProfilesEqual(storeProfileAsProfileType, profileData)) {
                  console.log('[profileStore] Profile data changed. Updating store.');
                  set((state) => ({
                    ...state,
                    ...profileData, // Spread the new, validated profile data
                    id: profileData.id, // Ensure the ID from the new data is used
                    loading: false,
                    error: null,
                  }));
                } else {
                  console.log(
                    '[profileStore] Profile data is the same. No store update needed for profile fields.'
                  );
                  set({ loading: false, error: null }); // Only update operational state
                }
              } else {
                // New profile fetched (ID mismatch or currentStoreState.id was null)
                console.log('[profileStore] New profile data or ID mismatch. Updating store.');
                set((state) => ({
                  ...state,
                  ...profileData,
                  id: profileData.id,
                  loading: false,
                  error: null,
                }));
              }
              return; // Successful fetch, exit
            } else {
              console.warn(
                '[profileStore] Parsed profile data is valid but missing an ID:',
                profileData
              );
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
          console.error(
            `[profileStore] Error in fetchProfile (attempt ${retryCount + 1} of ${MAX_RETRIES + 1}):`,
            err
          );

          if (err.constructor.name === 'ZodError') {
            const errorMessage =
              'Alınan profil verisi beklenen formatta değil: ' +
                (err.issues || err.errors)
                  ?.map((e: any) => `${e.path.join('.')} (${e.message})`)
                  .join(', ') || 'Zod validation error.';
            set({ error: errorMessage, loading: false });
          } else if (retryCount < MAX_RETRIES) {
            console.log(
              `[profileStore] Retrying fetchProfile in ${RETRY_DELAY_MS}ms. Attempt ${retryCount + 2}...`
            );
            setTimeout(() => {
              get().fetchProfile(retryCount + 1);
            }, RETRY_DELAY_MS);
            // loading remains true, error (if any from previous retries) might persist until final failure or success
          } else {
            // Max retries reached for other errors
            let errorMessage =
              'Profil yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.';
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
      updateUseVariedPromptsPreference: async (useVariedPrompts) => {
        const { id } = get();
        if (!id) {
          console.error('[profileStore] updateUseVariedPromptsPreference: User ID not found.');
          set({ error: 'Kullanıcı kimliği bulunamadı.', loading: false });
          return;
        }
        set({ loading: true });
        try {
          await updateProfileApi({ useVariedPrompts });
          set({ useVariedPrompts, loading: false, error: null });
          console.log('[profileStore] Varied prompts preference updated successfully.');
        } catch (err: any) {
          console.error('[profileStore] Error updating varied prompts preference:', err);
          const errorMessage =
            err.message || 'Farklı günlük yönlendirme tercihi güncellenirken bir hata oluştu.';
          set({ error: errorMessage, loading: false });
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
          set((state) => ({
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
            errorMessage =
              'Alınan profil verisi beklenen formatta değil: ' +
                (err.issues || err.errors)
                  ?.map((e: any) => `${e.path.join('.')} (${e.message})`)
                  .join(', ') || 'Zod validation error.';
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

      updateDailyReminderSettings: async (prefs: {
        reminder_enabled: boolean;
        reminder_time: string | null;
      }) => {
        const currentProfileId = get().id;
        if (!currentProfileId) {
          console.error('[profileStore] updateDailyReminderSettings: No profile ID found.');
          set({ error: 'User profile not loaded.', loading: false });
          return;
        }

        set({ loading: true, error: null });

        // Prepare the payload for the API
        // Ensure reminder_time is never null when sending to API, use Zod default if necessary.
        const reminderTimeToSave = prefs.reminder_time ?? '20:00:00';

        const updatePayload: UpdateProfilePayload = {
          reminder_enabled: prefs.reminder_enabled,
          reminder_time: reminderTimeToSave, // Ensures non-null value
        };

        try {
          const rawUpdatedProfileData = await updateProfileApi(updatePayload);
          // Ensure rawUpdatedProfileData is not null before parsing
          if (!rawUpdatedProfileData) {
            // Set error and loading false, then throw to be caught by the generic catch block
            set({ error: 'No profile data returned from API after update.', loading: false });
            throw new Error('No profile data returned from API after update.');
          }
          const parsedProfileData = profileSchema.parse(rawUpdatedProfileData);

          set((state) => ({
            ...state, // Preserve existing state
            ...parsedProfileData, // Update state with the new preferences and other returned profile data
            loading: false,
            error: null,
          }));

          // Use reminder_enabled and reminder_time directly from parsedProfileData for notification logic
          if (
            parsedProfileData.reminder_enabled &&
            typeof parsedProfileData.reminder_time === 'string'
          ) {
            const [hoursStr, minutesStr] = parsedProfileData.reminder_time.split(':');
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);
            if (!isNaN(hours) && !isNaN(minutes)) {
              await requestNotificationPermissions();
              await scheduleDailyReminder(
                hours,
                minutes,
                'Günlük Minnettarlık Hatırlatması',
                'Bugün neleri fark ettin? Yazmaya ne dersin?'
              );
            } else {
              console.warn(
                '[profileStore] Invalid reminder_time format for scheduling:',
                parsedProfileData.reminder_time
              );
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
            errorMessage =
              'Alınan profil verisi beklenen formatta değil: ' +
                (err.issues || err.errors)
                  ?.map((e: any) => `${e.path.join('.')} (${e.message})`)
                  .join(', ') || 'Zod validation error.';
          } else if (
            err instanceof Error &&
            err.message !== 'No profile data returned from API after update.'
          ) {
            // Avoid duplicating the specific error message we set above
            errorMessage = err.message;
          } else if (typeof err === 'string') {
            errorMessage = err;
          }
          // If the error was already set (e.g. for null rawUpdatedProfileData), don't overwrite with generic message
          if (get().error !== 'No profile data returned from API after update.') {
            set({ error: errorMessage, loading: false });
          }
        }
      }, // End of updateDailyReminderSettings

      setInitialProfileFetchAttempted: (attempted: boolean) => {
        set({ initialProfileFetchAttempted: attempted });
      },
    }), // This closes the (set, get) => ({...}) actions object
    {
      name: 'yeser-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1, // Added a version for migration
      migrate: (persistedState: any, version: number) => {
        console.log(
          '[profileStore] Attempting migration. Current persisted version:',
          version,
          'Target version: 1'
        );
        if (version < 1) {
          // This block runs if the persisted state is older than version 1
          if (persistedState && typeof persistedState.reminder_time === 'string') {
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
            if (!timeRegex.test(persistedState.reminder_time)) {
              console.warn(
                `[profileStore] Migrating invalid reminder_time "${persistedState.reminder_time}" from AsyncStorage to null.`
              );
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
        console.log('[profileStore] New/different user detected. Resetting profile store.');
        profileStoreState.resetProfile(); // Resets to initialState, including initialProfileFetchAttempted: false
      }
    }
  }
});

// It's good practice to offer a way to unsubscribe if the store were to be dismantled,
// though for global stores it's often not needed outside of specific scenarios like hot module replacement.
// Example for HMR:
// if (module.hot) { module.hot.dispose(() => { authUnsubscribe(); }); }
