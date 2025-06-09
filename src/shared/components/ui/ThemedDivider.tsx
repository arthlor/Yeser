import React from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';

export interface ThemedDividerProps {
  /**
   * Optional label to display in the middle of the divider
   */
  label?: string;

  /**
   * Variant of the divider
   * - 'full': spans the entire width
   * - 'inset': has horizontal padding
   * - 'middle': shorter divider centered in the container
   */
  variant?: 'full' | 'inset' | 'middle';

  /**
   * Thickness of the divider line
   */
  thickness?: number;

  /**
   * Color of the divider (overrides theme color)
   */
  color?: string;

  /**
   * Additional styles for the divider container
   */
  style?: ViewStyle;

  /**
   * Additional styles for the label text
   */
  labelStyle?: TextStyle;

  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
}

/**
 * ThemedDivider is a component that provides a consistent way to visually
 * separate content sections, with optional label and various styling options.
 *
 * @example
 * ```tsx
 * // Simple divider
 * <ThemedDivider />
 *
 * // Divider with label
 * <ThemedDivider label="Section" />
 *
 * // Inset divider with custom thickness
 * <ThemedDivider variant="inset" thickness={2} />
 * ```
 */
const ThemedDivider: React.FC<ThemedDividerProps> = ({
  label,
  variant = 'full',
  thickness = 1,
  color,
  style,
  labelStyle,
  accessibilityLabel,
}) => {
  const { theme } = useTheme();

  const dividerColor = color || theme.colors.outline;

  const styles = React.useMemo(
    () => createStyles(theme, variant, thickness, dividerColor),
    [theme, variant, thickness, dividerColor]
  );

  // If there's a label, render a divider with label in the middle
  if (label) {
    return (
      <View
        style={[styles.container, style]}
        accessibilityLabel={accessibilityLabel || `Divider: ${label}`}
        accessibilityRole="none"
      >
        <View style={styles.line} />
        <Text style={[styles.label, labelStyle]}>{label}</Text>
        <View style={styles.line} />
      </View>
    );
  }

  // Otherwise, render a simple divider line
  return (
    <View
      style={[styles.simpleDivider, style]}
      accessibilityLabel={accessibilityLabel || 'Divider'}
      accessibilityRole="none"
    />
  );
};

const createStyles = (
  theme: AppTheme,
  variant: 'full' | 'inset' | 'middle',
  thickness: number,
  color: string
) => {
  // Calculate horizontal margin based on variant
  let horizontalMargin = 0;
  switch (variant) {
    case 'inset':
      horizontalMargin = theme.spacing.md; // 16px modern standard
      break;
    case 'middle':
      horizontalMargin = theme.spacing.xl; // 32px for centered dividers
      break;
  }

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.sm, // 8px modern spacing
      marginHorizontal: horizontalMargin,
    },
    simpleDivider: {
      height: thickness,
      backgroundColor: color,
      marginVertical: theme.spacing.sm, // 8px modern spacing
      marginHorizontal: horizontalMargin,
    },
    line: {
      flex: 1,
      height: thickness,
      backgroundColor: color,
    },
    label: {
      fontFamily: 'Inter-Regular', // Sans-serif for divider labels - better readability
      fontSize: theme.typography.bodySmall.fontSize,
      fontWeight: theme.typography.bodySmall.fontWeight,
      lineHeight: theme.typography.bodySmall.lineHeight,
      letterSpacing: theme.typography.bodySmall.letterSpacing,
      color: theme.colors.onSurfaceVariant, // Better semantic color
      marginHorizontal: theme.spacing.sm, // 8px modern spacing
    },
  });
};

export default ThemedDivider;
