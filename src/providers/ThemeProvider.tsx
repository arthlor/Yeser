import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useThemeStore } from '../store/themeStore';
import { lightTheme } from '../themes/lightTheme';
import { AppTheme, AccessibilityFeatures, ThemeContextType } from '../themes/types';
import { createThemeUtils } from '../themes/utils';
export type { AppTheme };

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

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { activeTheme, activeThemeName, setTheme, toggleTheme } = useThemeStore();
  const [accessibility, setAccessibilityState] = useState<AccessibilityFeatures>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
  });

  // Initialize accessibility features based on system settings
  useEffect(() => {
    const initializeAccessibility = async () => {
      try {
        const [
          isReduceMotionEnabled,
          isScreenReaderEnabled,
          // Note: highContrast and largeText would need additional platform-specific checks
        ] = await Promise.all([
          AccessibilityInfo.isReduceMotionEnabled?.() || Promise.resolve(false),
          AccessibilityInfo.isScreenReaderEnabled(),
        ]);

        setAccessibilityState((prev) => ({
          ...prev,
          reduceMotion: isReduceMotionEnabled,
          screenReader: isScreenReaderEnabled,
        }));
      } catch (error) {
        console.warn('Failed to initialize accessibility features:', error);
      }
    };

    initializeAccessibility();

    // Set up listeners for accessibility changes
    const subscriptions = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        setAccessibilityState((prev) => ({ ...prev, reduceMotion: enabled }));
      }),
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
        setAccessibilityState((prev) => ({ ...prev, screenReader: enabled }));
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => {
        subscription?.remove();
      });
    };
  }, []);

  // Create enhanced theme with accessibility and motion tokens
  const enhancedTheme: AppTheme = {
    ...activeTheme,
    accessibility,
    motionTokens: {
      fade: {
        in: { opacity: 1 },
        out: { opacity: 0 },
      },
      slide: {
        up: { translateY: -20 },
        down: { translateY: 20 },
        left: { translateX: -20 },
        right: { translateX: 20 },
      },
      scale: {
        in: { scale: 1 },
        out: { scale: 0.95 },
      },
      bounce: {
        in: { scale: 1.05 },
        out: { scale: 0.98 },
      },
    },
    semanticColors: {
      brand: {
        primary: activeTheme.colors.primary,
        secondary: activeTheme.colors.secondary,
        tertiary: activeTheme.colors.tertiary,
      },
      neutral: {
        50: activeTheme.name === 'light' ? '#F9FAFB' : '#18181B',
        100: activeTheme.name === 'light' ? '#F3F4F6' : '#27272A',
        200: activeTheme.name === 'light' ? '#E5E7EB' : '#3F3F46',
        300: activeTheme.name === 'light' ? '#D1D5DB' : '#52525B',
        400: activeTheme.name === 'light' ? '#9CA3AF' : '#71717A',
        500: activeTheme.name === 'light' ? '#6B7280' : '#A1A1AA',
        600: activeTheme.name === 'light' ? '#4B5563' : '#D4D4D8',
        700: activeTheme.name === 'light' ? '#374151' : '#E4E4E7',
        800: activeTheme.name === 'light' ? '#1F2937' : '#F4F4F5',
        900: activeTheme.name === 'light' ? '#111827' : '#FAFAFA',
      },
      feedback: {
        success: activeTheme.colors.success,
        warning: activeTheme.colors.warning,
        error: activeTheme.colors.error,
        info: activeTheme.colors.info,
      },
    },
  };

  // Create theme utilities
  const utils = createThemeUtils(enhancedTheme);

  const setAccessibility = (features: Partial<AccessibilityFeatures>) => {
    setAccessibilityState((prev) => ({ ...prev, ...features }));
  };

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
    theme: enhancedTheme,
    colorMode: activeThemeName,
    setColorMode,
    toggleColorMode: toggleTheme,
    utils,
    accessibility,
    setAccessibility,
  };

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
