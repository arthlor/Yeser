import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  testID?: string;
}

/**
 * 🎛️ COORDINATED THEMED SWITCH
 * 
 * **ANIMATION COORDINATION COMPLETED**:
 * - Maintained essential color interpolation (JS-driven for colors)
 * - Coordinated press feedback animations (native-driven)
 * - Simplified animation system while preserving functionality
 * - Enhanced consistency with coordinated animation philosophy
 */
const ThemedSwitch: React.FC<ThemedSwitchProps> = React.memo(
  ({ value, onValueChange, disabled = false, size = 'medium', testID }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme, size);
    
    // **ESSENTIAL SWITCH ANIMATION**: Keep color interpolation as JS-driven (required for color changes)
    const switchAnimatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
    
    // **COORDINATED PRESS FEEDBACK**: Use coordinated animation system for press feedback
    const animations = useCoordinatedAnimations();

    // **ESSENTIAL SWITCH STATE TRANSITION**: Keep for color interpolation
    const animateSwitchTransition = useCallback((toValue: number) => {
      Animated.timing(switchAnimatedValue, {
        toValue,
        duration: 250,
        useNativeDriver: false, // Required for color interpolation
      }).start();
    }, [switchAnimatedValue]);

    // Update animation when value changes
    useEffect(() => {
      animateSwitchTransition(value ? 1 : 0);
    }, [value, animateSwitchTransition]);

    const handlePress = useCallback(() => {
      if (!disabled) {
        onValueChange(!value);
      }
    }, [disabled, onValueChange, value]);

    // **ESSENTIAL COLOR INTERPOLATIONS**: Keep for switch functionality
    const trackColor = switchAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.outlineVariant, theme.colors.primary],
    });

    const thumbTranslateX = switchAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, getSwitchDimensions(size).width - getSwitchDimensions(size).thumbSize - 2],
    });

    const thumbColor = switchAnimatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.onSurfaceVariant, theme.colors.onPrimary],
    });

    return (
      <TouchableOpacity
        testID={testID}
        onPress={handlePress}
        onPressIn={animations.animatePressIn}
        onPressOut={animations.animatePressOut}
        disabled={disabled}
        activeOpacity={1} // We handle press animation manually
        style={[styles.container, disabled && styles.disabled]}
      >
        {/* **COORDINATED PRESS ANIMATION**: Use coordinated press transform */}
        <Animated.View 
          style={[
            {
              transform: animations.pressTransform, // Coordinated press feedback
            }
          ]}
        >
          {/* **ESSENTIAL COLOR ANIMATION**: Keep color interpolation for switch functionality */}
          <Animated.View 
            style={[
              styles.track, 
              { 
                backgroundColor: trackColor, // JS-driven color animation (essential)
              }
            ]}
          >
            <Animated.View
              style={[
                styles.thumb,
                {
                  backgroundColor: thumbColor,
                  transform: [
                    { translateX: thumbTranslateX }, // JS-driven position change (essential)
                  ],
                },
              ]}
            />
          </Animated.View>
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
