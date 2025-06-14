import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button } from 'react-native-paper';

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
 * - Touch feedback and accessibility
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

  return (
    <Button
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      style={[styles.button, style]}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonText}
      accessibilityLabel={accessibilityLabel || title}
    >
      {title}
    </Button>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    button: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
      // Consistent shadow for all onboarding buttons
      ...getPrimaryShadow.medium(theme),
    },
    buttonContent: {
      paddingVertical: theme.spacing.sm, // 12px - consistent height
      minHeight: 48, // Minimum touch target for accessibility
    },
    buttonText: {
      ...theme.typography.bodyLarge,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
  });

export default OnboardingButton;
