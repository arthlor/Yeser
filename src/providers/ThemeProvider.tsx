import React, { createContext, ReactNode, useContext, useEffect } from 'react';

import { useThemeStore } from '../store/themeStore';
import { lightTheme } from '../themes/lightTheme';
import { AppTheme } from '../themes/types';
export type { AppTheme };

interface ThemeContextType {
  theme: AppTheme;
  currentThemeName: 'light' | 'dark';
  setTheme: (themeName: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

// Create a context with a default theme (lightTheme) and placeholder functions
// The actual initial theme will be set by the provider from the Zustand store.
const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme, // Placeholder, will be overwritten by provider
  currentThemeName: 'light', // Placeholder
  setTheme: () =>
    console.warn('ThemeProvider not found or setTheme not initialized'),
  toggleTheme: () =>
    console.warn('ThemeProvider not found or toggleTheme not initialized'),
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { activeTheme, setTheme, toggleTheme, activeThemeName } =
    useThemeStore();

  // Ensure the theme object is correctly loaded on initial mount after rehydration
  useEffect(() => {
    // This effect helps if the initial state from zustand might not be fully processed
    // or if you want to do something when the theme name changes explicitly.
    // For most cases, `activeTheme` from the store should be sufficient.
  }, [activeThemeName]);

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        currentThemeName: activeThemeName,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
