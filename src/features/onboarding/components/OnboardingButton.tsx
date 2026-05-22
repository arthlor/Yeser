import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';

interface OnboardingButtonProps {
  onPress: () => void;
  title: string;
  mode?: 'contained' | 'outlined' | 'text';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Standardized onboarding button component ensuring consistent:
 * - Button sizes across all onboarding steps
 * - Typography and styling
 * - Touch feedback with scale animation
 * - Loading states
 */
export const OnboardingButton: React.FC<OnboardingButtonProps> = ({
  onPress,
  title,
  mode = 'contained',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style, styles.container]}>
      <Button
        mode={mode}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        loading={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonText}
        accessibilityLabel={accessibilityLabel || title}
        buttonColor={mode === 'contained' ? theme.colors.primary : undefined}
      >
        {title}
      </Button>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    button: {
      width: '100%',
      borderRadius: theme.borderRadius.xl, // Softer, more rounded corners
      ...getPrimaryShadow.overlay(theme), // Softer diffused shadow
    },
    buttonContent: {
      paddingVertical: theme.spacing.xs + 2, // Slightly taller for more breathing room
      minHeight: 48, // Enhanced touch target
    },
    buttonText: {
      ...theme.typography.bodyMedium,
      fontSize: 16, // Slightly larger
      fontWeight: '600',
      letterSpacing: 0.2,
    },
  });

export default OnboardingButton;
