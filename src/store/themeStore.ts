import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { darkTheme } from '../themes/darkTheme';
import { lightTheme } from '../themes/lightTheme';
import { AppTheme } from '../themes/types'; // Assuming AppTheme includes a 'name' property

type ThemeName = 'light' | 'dark';

interface ThemeState {
  activeThemeName: ThemeName;
  activeTheme: AppTheme;
  setTheme: (themeName: ThemeName) => void;
  toggleTheme: () => void;
}

const getThemeObjectByName = (themeName: ThemeName): AppTheme =>
  themeName === 'light' ? lightTheme : darkTheme;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeThemeName: 'light', // Default theme
      activeTheme: lightTheme, // Default theme object
      setTheme: (themeName) => {
        set({
          activeThemeName: themeName,
          activeTheme: getThemeObjectByName(themeName),
        });
      },
      toggleTheme: () => {
        const currentThemeName = get().activeThemeName;
        const newThemeName = currentThemeName === 'light' ? 'dark' : 'light';
        set({
          activeThemeName: newThemeName,
          activeTheme: getThemeObjectByName(newThemeName),
        });
      },
    }),
    {
      name: 'app-theme-storage', // Name of the item in AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the theme name, not the entire theme object
      partialize: (state) => ({ activeThemeName: state.activeThemeName }),
      // When rehydrating, set the activeTheme object based on the persisted name
      onRehydrateStorage: () => (state, _error) => {
        if (state) {
          state.activeTheme = getThemeObjectByName(state.activeThemeName);
        }
      },
    }
  )
);
