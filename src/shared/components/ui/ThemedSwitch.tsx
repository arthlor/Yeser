import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

const ThemedSwitch: React.FC<ThemedSwitchProps> = React.memo(
  ({ value, onValueChange, disabled = false, size = 'medium', testID }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme, size);

    // Animation value for smooth transitions
    const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    // Update animation when value changes
    React.useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: value ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }, [value, animatedValue]);

    const handlePress = useCallback(() => {
      if (!disabled) {
        onValueChange(!value);
      }
    }, [disabled, onValueChange, value]);

    // Interpolated values for smooth animations
    const trackColor = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.outlineVariant, theme.colors.primary],
    });

    const thumbTranslateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, getSwitchDimensions(size).width - getSwitchDimensions(size).thumbSize - 2],
    });

    const thumbColor = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.onSurfaceVariant, theme.colors.onPrimary],
    });

    return (
      <TouchableOpacity
        testID={testID}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[styles.container, disabled && styles.disabled]}
      >
        <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: thumbColor,
                transform: [{ translateX: thumbTranslateX }],
              },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  }
);

ThemedSwitch.displayName = 'ThemedSwitch';

// Helper function to get switch dimensions based on size
const getSwitchDimensions = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return { width: 36, height: 20, thumbSize: 16 };
    case 'large':
      return { width: 56, height: 32, thumbSize: 28 };
    case 'medium':
    default:
      return { width: 48, height: 28, thumbSize: 24 };
  }
};

const createStyles = (theme: AppTheme, size: 'small' | 'medium' | 'large') => {
  const dimensions = getSwitchDimensions(size);

  return StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    track: {
      width: dimensions.width,
      height: dimensions.height,
      borderRadius: dimensions.height / 2,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    thumb: {
      width: dimensions.thumbSize,
      height: dimensions.thumbSize,
      borderRadius: dimensions.thumbSize / 2,
      position: 'absolute',
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    disabled: {
      opacity: 0.5,
    },
  });
};

export default ThemedSwitch;
