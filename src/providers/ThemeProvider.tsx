import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { MD3DarkTheme, MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';

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

  // Create Paper theme based on current theme
  const paperTheme = useMemo(() => {
    const baseTheme = activeThemeName === 'dark' ? MD3DarkTheme : MD3LightTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: activeTheme.colors.primary,
        onPrimary: activeTheme.colors.onPrimary,
        primaryContainer: activeTheme.colors.primaryContainer,
        onPrimaryContainer: activeTheme.colors.onPrimaryContainer,
        secondary: activeTheme.colors.secondary,
        onSecondary: activeTheme.colors.onSecondary,
        secondaryContainer: activeTheme.colors.secondaryContainer,
        onSecondaryContainer: activeTheme.colors.onSecondaryContainer,
        tertiary: activeTheme.colors.tertiary,
        onTertiary: activeTheme.colors.onTertiary,
        tertiaryContainer: activeTheme.colors.tertiaryContainer,
        onTertiaryContainer: activeTheme.colors.onTertiaryContainer,
        surface: activeTheme.colors.surface,
        onSurface: activeTheme.colors.onSurface,
        surfaceVariant: activeTheme.colors.surfaceVariant,
        onSurfaceVariant: activeTheme.colors.onSurfaceVariant,
        background: activeTheme.colors.background,
        onBackground: activeTheme.colors.onBackground,
        error: activeTheme.colors.error,
        onError: activeTheme.colors.onError,
        errorContainer: activeTheme.colors.errorContainer,
        onErrorContainer: activeTheme.colors.onErrorContainer,
        outline: activeTheme.colors.outline,
        outlineVariant: activeTheme.colors.outlineVariant,
      },
    };
  }, [activeTheme, activeThemeName]);

  const contextValue: ThemeContextType = {
    theme: activeTheme,
    colorMode: activeThemeName,
    setColorMode,
    toggleColorMode: toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <PaperProvider theme={paperTheme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export type { AppTheme };
