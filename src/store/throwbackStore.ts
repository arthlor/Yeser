import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getRandomGratitudeEntry } from '@/api/gratitudeApi';
import { gratitudeEntrySchema, type GratitudeEntry } from '../schemas/gratitudeEntrySchema';

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
  resetThrowback: () => void; // Added reset action
}

export const initialState: Omit<
  ThrowbackState,
  | 'fetchRandomEntry'
  | 'showThrowback'
  | 'hideThrowback'
  | 'clearError'
  | 'setLastThrowbackShown'
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
            console.error('Zod validation error in throwbackStore:', validationResult.error.flatten());
            set({
              error: 'Received invalid throwback data. Please try again.', // User-friendly Zod error
              isLoading: false,
              randomEntry: null,
            });
          }
        } catch (apiError: unknown) { // Catches errors from getRandomGratitudeEntry() itself
          console.error('API error fetching random gratitude entry:', apiError);
          let errorMessage = 'Failed to fetch throwback entry due to a network or server issue.';
          if (typeof apiError === 'object' && apiError !== null && 'message' in apiError && typeof (apiError as { message: unknown }).message === 'string') {
            errorMessage = (apiError as { message: string }).message;
          } else if (typeof apiError === 'string') {
            errorMessage = apiError;
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
    }),
    {
      name: 'throwback-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only lastThrowbackShownAt. Other states are transient for a session.
      partialize: state => ({
        lastThrowbackShownAt: state.lastThrowbackShownAt,
      }),
    }
  )
);
