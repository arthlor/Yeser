import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';

interface OnboardingProgressDotsProps {
  total: number;
  current: number; // zero-based index
}

/**
 * Soft dotted progress indicator used at the top of the onboarding flow.
 * The active dot stretches into a pill shape to give a sense of progress
 * without the mechanical feel of a straight bar.
 */
export const OnboardingProgressDots: React.FC<OnboardingProgressDotsProps> = ({
  total,
  current,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === current;
        const isCompleted = index < current;
        return (
          <View
            key={index}
            style={[styles.dot, isActive && styles.dotActive, isCompleted && styles.dotCompleted]}
          />
        );
      })}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.outline + '40',
    },
    dotCompleted: {
      backgroundColor: theme.colors.primary + '66',
    },
    dotActive: {
      width: 22,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.primary,
    },
  });

export default OnboardingProgressDots;
