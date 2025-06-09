import AsyncStorage from '@react-native-async-storage/async-storage';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { darkTheme } from '../themes/darkTheme';
import { lightTheme } from '../themes/lightTheme';
import { AppTheme } from '../themes/types'; // Assuming AppTheme includes a 'name' property

type ThemeName = 'light' | 'dark' | 'auto';

interface ThemeState {
  activeThemeName: ThemeName;
  activeTheme: AppTheme;
  renderedTheme: 'light' | 'dark';
  setTheme: (themeName: ThemeName) => void;
  setRenderedTheme: (renderedTheme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

const getThemeObjectByName = (themeName: 'light' | 'dark'): AppTheme =>
  themeName === 'light' ? lightTheme : darkTheme;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      activeThemeName: 'light', // Default theme
      activeTheme: lightTheme, // Default theme object
      renderedTheme: 'light', // Default rendered theme
      setTheme: (themeName) => {
        if (themeName === 'auto') {
          // When setting to auto, keep current rendered theme until system detection
          set({
            activeThemeName: themeName,
            // Don't change activeTheme here - let ThemeProvider handle system detection
          });
        } else {
          set({
            activeThemeName: themeName,
            activeTheme: getThemeObjectByName(themeName),
            renderedTheme: themeName,
          });
        }
      },
      setRenderedTheme: (renderedTheme) => {
        set({
          activeTheme: getThemeObjectByName(renderedTheme),
          renderedTheme,
        });
      },
      toggleTheme: () => {
        const currentThemeName = get().activeThemeName;
        if (currentThemeName === 'auto') {
          // If in auto mode, switch to the opposite of current rendered theme
          const currentRendered = get().renderedTheme;
          const newThemeName = currentRendered === 'light' ? 'dark' : 'light';
          set({
            activeThemeName: newThemeName,
            activeTheme: getThemeObjectByName(newThemeName),
            renderedTheme: newThemeName,
          });
        } else {
          const newThemeName = currentThemeName === 'light' ? 'dark' : 'light';
          set({
            activeThemeName: newThemeName,
            activeTheme: getThemeObjectByName(newThemeName),
            renderedTheme: newThemeName,
          });
        }
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
          if (state.activeThemeName === 'auto') {
            // For auto mode, start with light theme until system detection occurs
            state.activeTheme = lightTheme;
            state.renderedTheme = 'light';
          } else {
            state.activeTheme = getThemeObjectByName(state.activeThemeName);
            state.renderedTheme = state.activeThemeName;
          }
        }
      },
    }
  )
);
