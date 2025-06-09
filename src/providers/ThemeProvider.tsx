import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
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

// 🚨 FIX: Utility function to simplify color mapping
const mapThemeColors = (baseTheme: typeof MD3LightTheme, appTheme: AppTheme) => ({
  ...baseTheme.colors,
  primary: appTheme.colors.primary,
  onPrimary: appTheme.colors.onPrimary,
  primaryContainer: appTheme.colors.primaryContainer,
  onPrimaryContainer: appTheme.colors.onPrimaryContainer,
  secondary: appTheme.colors.secondary,
  onSecondary: appTheme.colors.onSecondary,
  secondaryContainer: appTheme.colors.secondaryContainer,
  onSecondaryContainer: appTheme.colors.onSecondaryContainer,
  tertiary: appTheme.colors.tertiary,
  onTertiary: appTheme.colors.onTertiary,
  tertiaryContainer: appTheme.colors.tertiaryContainer,
  onTertiaryContainer: appTheme.colors.onTertiaryContainer,
  surface: appTheme.colors.surface,
  onSurface: appTheme.colors.onSurface,
  surfaceVariant: appTheme.colors.surfaceVariant,
  onSurfaceVariant: appTheme.colors.onSurfaceVariant,
  background: appTheme.colors.background,
  onBackground: appTheme.colors.onBackground,
  error: appTheme.colors.error,
  onError: appTheme.colors.onError,
  errorContainer: appTheme.colors.errorContainer,
  onErrorContainer: appTheme.colors.onErrorContainer,
  outline: appTheme.colors.outline,
  outlineVariant: appTheme.colors.outlineVariant,
});

// SIMPLIFIED: Single source of truth ThemeProvider
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { activeTheme, activeThemeName, renderedTheme, setTheme, setRenderedTheme, toggleTheme } =
    useThemeStore();

  // 🚨 FIX: Implement proper auto theme detection
  const setColorMode = (mode: 'light' | 'dark' | 'auto') => {
    if (mode === 'auto') {
      const systemColorScheme: ColorSchemeName = Appearance.getColorScheme();
      const detectedTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
      setTheme('auto');
      setRenderedTheme(detectedTheme);
    } else {
      setTheme(mode);
    }
  };

  // 🚨 FIX: Listen for system theme changes when in auto mode
  useEffect(() => {
    if (activeThemeName === 'auto') {
      const listener = ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
        const detectedTheme = colorScheme === 'dark' ? 'dark' : 'light';
        setRenderedTheme(detectedTheme);
      };

      const subscription = Appearance.addChangeListener(listener);

      // Set initial theme based on system preference
      const systemColorScheme = Appearance.getColorScheme();
      const detectedTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
      setRenderedTheme(detectedTheme);

      return () => subscription?.remove();
    }
  }, [activeThemeName, setRenderedTheme]);

  // 🚨 FIX: Simplified Paper theme creation using utility function
  const paperTheme = useMemo(() => {
    const baseTheme = renderedTheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
    return {
      ...baseTheme,
      colors: mapThemeColors(baseTheme, activeTheme),
    };
  }, [activeTheme, renderedTheme]);

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
