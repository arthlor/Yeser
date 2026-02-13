import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * 🎯 SEGMENTED CONTROL
 * A horizontal toggle control for selecting between multiple options.
 * Used for date range selection in Mood Analysis and similar features.
 */
export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onValueChange,
  disabled = false,
  style,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handlePress = useCallback(
    (value: T) => {
      if (disabled || value === selectedValue) {
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onValueChange(value);
    },
    [disabled, selectedValue, onValueChange]
  );

  return (
    <View style={[styles.container, disabled && styles.containerDisabled, style]}>
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              isSelected && styles.segmentSelected,
              isFirst && styles.segmentFirst,
              isLast && styles.segmentLast,
            ]}
            onPress={() => handlePress(option.value)}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      padding: 4,
    },
    containerDisabled: {
      opacity: 0.5,
    },
    segment: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
    },
    segmentSelected: {
      backgroundColor: theme.colors.surface,
      shadowColor: theme.colors.scrim,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentFirst: {
      marginRight: 2,
    },
    segmentLast: {
      marginLeft: 2,
    },
    label: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    labelSelected: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

export default SegmentedControl;
