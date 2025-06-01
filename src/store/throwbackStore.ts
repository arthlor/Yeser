import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getRandomGratitudeEntry, GratitudeEntry } from '../api/gratitudeApi';

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

const initialState: Omit<
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
          const entry = await getRandomGratitudeEntry();
          if (entry) {
            set({
              randomEntry: entry,
              isLoading: false,
              isThrowbackVisible: true,
              lastThrowbackShownAt: Date.now(),
            });
          } else {
            set({ randomEntry: null, isLoading: false }); // Ensure randomEntry is null if no entry found
          }
        } catch (e: unknown) {
          console.error('Error fetching random gratitude entry:', e);
          let errorMessage = 'Failed to fetch random entry';
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
