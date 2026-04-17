import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/providers/ThemeProvider';

interface OnboardingGradientBackgroundProps {
  /**
   * Kept for API compatibility with step callers. The variant no longer
   * tints any decorative orbs (they were removed by design request); the
   * gradient itself is a soft neutral wash.
   */
  variant?: 'warm' | 'sunrise' | 'calm' | 'celebrate';
}

/**
 * Soft full-bleed gradient behind the onboarding content. Purely decorative
 * and non-interactive.
 */
export const OnboardingGradientBackground: React.FC<OnboardingGradientBackgroundProps> = () => {
  const { theme } = useTheme();

  const gradientColors = React.useMemo<[string, string]>(() => {
    const bg = theme.colors.background;
    const surface = theme.colors.surfaceBright ?? theme.colors.surface;
    return [surface, bg];
  }, [theme]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

export default OnboardingGradientBackground;
