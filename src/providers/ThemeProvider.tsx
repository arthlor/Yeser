import React, { createContext, ReactNode, useContext } from 'react';

import { useThemeStore } from '../store/themeStore';
import { AppTheme, ThemeContextType } from '../themes/types';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

// SIMPLIFIED: Single source of truth ThemeProvider
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { activeTheme, activeThemeName, setTheme, toggleTheme } = useThemeStore();

  const setColorMode = (mode: 'light' | 'dark' | 'auto') => {
    if (mode === 'auto') {
      // For now, default to light when auto is selected
      // In a real implementation, you would detect system preference
      setTheme('light');
    } else {
      setTheme(mode);
    }
  };

  const contextValue: ThemeContextType = {
    theme: activeTheme,
    colorMode: activeThemeName,
    setColorMode,
    toggleColorMode: toggleTheme,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export type { AppTheme };
