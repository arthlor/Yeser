import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getRandomGratitudeEntry } from '@/api/gratitudeApi';

import { gratitudeEntrySchema, type GratitudeEntry } from '../schemas/gratitudeEntrySchema';
// Assuming profile types are available, e.g., from a central types file or profileStore
// For now, let's define a simple type for what we need from profile settings.
export type ThrowbackFrequency = 'daily' | 'weekly' | 'monthly' | string; // Allow string for flexibility

interface ThrowbackSettings {
  isEnabled: boolean;
  frequency: ThrowbackFrequency;
}

interface CheckThrowbackArgs extends ThrowbackSettings {
  totalEntryCount: number;
}

interface ThrowbackState {
  lastThrowbackShownAt: number | null; // Timestamp of when a throwback was last shown
  randomEntry: GratitudeEntry | null;
  isThrowbackVisible: boolean;
  isLoading: boolean;
  error: string | null;
  fetchRandomEntry: () => Promise<void>;
  showThrowback: () => void;
  hideThrowback: () => void;
  clearError: () => void;
  setLastThrowbackShown: (timestamp: number) => void;
  checkAndShowThrowbackIfNeeded: (args: CheckThrowbackArgs) => Promise<void>; // New function
  resetThrowback: () => void;
}

export const initialState: Omit<
  ThrowbackState,
  | 'fetchRandomEntry'
  | 'showThrowback'
  | 'hideThrowback'
  | 'clearError'
  | 'setLastThrowbackShown'
  | 'checkAndShowThrowbackIfNeeded' // Added here
  | 'resetThrowback'
> = {
  randomEntry: null,
  isThrowbackVisible: false,
  isLoading: false,
  error: null,
  lastThrowbackShownAt: null,
};

export const useThrowbackStore = create<ThrowbackState>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchRandomEntry: async () => {
        set({ isLoading: true, error: null });
        try {
          const rawEntry = await getRandomGratitudeEntry(); // API call

          if (!rawEntry) {
            set({ randomEntry: null, isLoading: false, error: 'No throwback entry found.' });
            return;
          }

          const validationResult = gratitudeEntrySchema.safeParse(rawEntry);

          if (validationResult.success) {
            set({
              randomEntry: validationResult.data,
              isLoading: false,
              isThrowbackVisible: true,
              lastThrowbackShownAt: Date.now(),
              error: null, // Clear previous errors
            });
          } else {
            console.error(
              'Zod validation error in throwbackStore:',
              validationResult.error.flatten()
            );
            set({
              error: 'Received invalid throwback data. Please try again.', // User-friendly Zod error
              isLoading: false,
              randomEntry: null,
            });
          }
        } catch (apiError: unknown) {
          // Catches errors from getRandomGratitudeEntry() itself
          console.error('API error fetching random gratitude entry:', apiError);
          let errorMessage = 'Failed to fetch throwback entry due to a network or server issue.';

          // Type guard for error with message property
          const isErrorWithMessage = (error: unknown): error is { message: string } =>
            typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof (error as any).message === 'string';

          if (isErrorWithMessage(apiError)) {
            errorMessage = apiError.message;
          } else if (typeof apiError === 'string') {
            errorMessage = apiError;
          } else if (apiError instanceof Error) {
            errorMessage = apiError.message;
          }
          set({
            error: errorMessage,
            isLoading: false,
            randomEntry: null,
          });
        }
      },

      setLastThrowbackShown: (timestamp: number) => {
        set({ lastThrowbackShownAt: timestamp });
      },

      showThrowback: () => {
        // Only show if there's an entry to display
        if (get().randomEntry) {
          set({ isThrowbackVisible: true });
        }
      },

      hideThrowback: () => {
        set({ isThrowbackVisible: false, randomEntry: null }); // Clear entry on hide to ensure next fetch is fresh
      },

      clearError: () => {
        set({ error: null });
      },

      resetThrowback: () => {
        set(initialState);
      },

      checkAndShowThrowbackIfNeeded: async ({
        isEnabled,
        frequency,
        totalEntryCount,
      }: CheckThrowbackArgs) => {
        if (!isEnabled) {
          return;
        }

        // Minimum entry count checks
        const MIN_ENTRIES_WEEKLY = 7;
        const MIN_ENTRIES_MONTHLY = 15; // Example, adjust as needed
        const MIN_ENTRIES_DAILY = 1;

        if (frequency === 'weekly' && totalEntryCount < MIN_ENTRIES_WEEKLY) {
          return;
        }
        if (frequency === 'monthly' && totalEntryCount < MIN_ENTRIES_MONTHLY) {
          return;
        }
        if (frequency === 'daily' && totalEntryCount < MIN_ENTRIES_DAILY) {
          return;
        }
        // General minimum if no specific frequency match or a very low threshold frequency
        if (totalEntryCount < 1) {
          return;
        }

        const { lastThrowbackShownAt, fetchRandomEntry } = get();
        const now = Date.now();
        let timeThreshold = 0;

        switch (frequency) {
          case 'daily':
            timeThreshold = 23 * 60 * 60 * 1000; // Slightly less than 24h to be safe with app open times
            break;
          case 'weekly':
            timeThreshold = 7 * 24 * 60 * 60 * 1000;
            break;
          case 'monthly':
            timeThreshold = 30 * 24 * 60 * 60 * 1000; // Approximate
            break;
          default:
            // If frequency is unknown or not set, don't show. Or default to a safe value.
            // For now, let's not show if frequency isn't recognized.
            return;
        }

        if (lastThrowbackShownAt === null || now - lastThrowbackShownAt > timeThreshold) {
          // It's time to show a throwback
          await fetchRandomEntry();
          // fetchRandomEntry already sets lastThrowbackShownAt and isThrowbackVisible
        }
      },
    }),
    {
      name: 'throwback-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only lastThrowbackShownAt. Other states are transient for a session.
      partialize: (state) => ({
        lastThrowbackShownAt: state.lastThrowbackShownAt,
      }),
    }
  )
);
