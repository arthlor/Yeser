import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';
import { semanticSpacing, unifiedShadows } from '../../../themes/utils';

// Simplified, essential button variants
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'compact' | 'standard' | 'large';

interface ThemedButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  iconLeft?: string; // Material Community Icons name
  iconRight?: string; // Material Community Icons name
  fullWidth?: boolean;

  // Enhanced interaction props
  enableHaptics?: boolean;
  loadingText?: string;
  pressAnimationScale?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

/**
 * 🎯 STREAMLINED THEMED BUTTON
 * Simplified, consistent button component using semantic spacing and unified shadows
 *
 * Features:
 * - 4 essential variants (primary, secondary, outline, ghost)
 * - Consistent 44pt+ touch targets
 * - Semantic spacing system
 * - Unified primary shadows
 * - Simplified styling logic
 */
export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'standard',
  disabled = false,
  isLoading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  enableHaptics = true,
  loadingText,
  pressAnimationScale = 0.95,
  style,
  textStyle,
  testID,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, variant, size, disabled, isLoading, fullWidth);

  const iconSize = getIconSize(size);
  const iconColor = styles.text.color;
  const isInteractionDisabled = disabled || isLoading;

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  // Enhanced loading animation
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(loadingAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      loadingAnim.setValue(0);
    }
  }, [isLoading, loadingAnim]);

  // Enhanced press animations
  const handlePressIn = () => {
    if (isInteractionDisabled) {
      return;
    }

    // Haptic feedback
    if (enableHaptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: pressAnimationScale || 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (isInteractionDisabled) {
      return;
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (isInteractionDisabled) {
      return;
    }

    // Additional haptic feedback on successful press
    if (enableHaptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onPress?.();
  };

  const loadingOpacity = loadingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  const displayText = isLoading && loadingText ? loadingText : title;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <Pressable
        style={[styles.button, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isInteractionDisabled}
        accessibilityRole="button"
        accessibilityState={{
          disabled: isInteractionDisabled,
          busy: isLoading,
        }}
        accessibilityLabel={`${title}${isLoading ? ', loading' : ''}${disabled ? ', disabled' : ''}`}
        testID={testID}
      >
        {/* Left Icon or Loading Indicator */}
        {isLoading ? (
          <Animated.View style={[styles.iconLeft, { opacity: loadingOpacity }]}>
            <ActivityIndicator size="small" color={iconColor} />
          </Animated.View>
        ) : iconLeft ? (
          <Icon name={iconLeft} size={iconSize} color={iconColor} style={styles.iconLeft} />
        ) : null}

        {/* Button Text with Enhanced Typography */}
        <Text style={[styles.text, textStyle]} accessibilityLabel={displayText}>
          {displayText}
        </Text>

        {/* Right Icon */}
        {iconRight && !isLoading && (
          <Icon name={iconRight} size={iconSize} color={iconColor} style={styles.iconRight} />
        )}
      </Pressable>
    </Animated.View>
  );
};

/**
 * Get icon size based on button size
 */
const getIconSize = (size: ButtonSize): number => {
  switch (size) {
    case 'compact':
      return 16;
    case 'large':
      return 24;
    default:
      return 20;
  }
};

/**
 * 🎨 SIMPLIFIED STYLING SYSTEM
 * Uses semantic spacing and unified shadows for consistency
 */
const createStyles = (
  theme: AppTheme,
  variant: ButtonVariant,
  size: ButtonSize,
  disabled?: boolean | null,
  isLoading?: boolean,
  fullWidth?: boolean
) => {
  const spacing = semanticSpacing(theme);
  const shadows = unifiedShadows(theme);

  // Get button dimensions and padding based on size
  const buttonConfig = {
    compact: {
      height: spacing.buttonHeight.compact,
      padding: spacing.buttonPadding.compact,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    standard: {
      height: spacing.buttonHeight.standard,
      padding: spacing.buttonPadding.standard,
      fontSize: 16,
      fontWeight: '600' as const,
    },
    large: {
      height: spacing.buttonHeight.large,
      padding: spacing.buttonPadding.large,
      fontSize: 18,
      fontWeight: '700' as const,
    },
  };

  const config = buttonConfig[size];

  // Get variant-specific styling
  const variantStyles = getVariantStyles(theme, variant, shadows);

  // Apply disabled state styling
  const finalStyles =
    disabled || isLoading ? getDisabledStyles(theme, variant, variantStyles) : variantStyles;

  return StyleSheet.create({
    button: {
      minHeight: config.height,
      paddingHorizontal: config.padding.horizontal,
      paddingVertical: config.padding.vertical,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      width: fullWidth ? '100%' : undefined,
      minWidth: size === 'compact' ? 120 : size === 'large' ? 150 : 130,
      ...finalStyles.container,
    } as ViewStyle,

    text: {
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      fontFamily: theme.typography.fontFamilyMedium,
      letterSpacing: 0.5,
      textAlign: 'center',
      flexShrink: 1,
      ...finalStyles.text,
    } as TextStyle,

    iconLeft: {
      marginRight: spacing.iconGap,
    },

    iconRight: {
      marginLeft: spacing.iconGap,
    },
  });
};

/**
 * 🎨 VARIANT STYLING
 * Clean, predictable styling for each button variant
 */
const getVariantStyles = (
  theme: AppTheme,
  variant: ButtonVariant,
  shadows: ReturnType<typeof unifiedShadows>
) => {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: theme.colors.primary,
          borderWidth: 0,
          ...shadows.subtle, // Subtle primary shadow for elevation
        },
        text: {
          color: theme.colors.onPrimary,
        },
      };

    case 'secondary':
      return {
        container: {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          ...shadows.subtle, // Consistent subtle shadow
        },
        text: {
          color: theme.colors.primary,
        },
      };

    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        },
        text: {
          color: theme.colors.primary,
        },
      };

    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        text: {
          color: theme.colors.primary,
        },
      };

    default:
      return getVariantStyles(theme, 'primary', shadows);
  }
};

/**
 * 🔒 DISABLED STATE STYLING
 * Consistent disabled appearance across all variants
 */
const getDisabledStyles = (
  theme: AppTheme,
  variant: ButtonVariant,
  baseStyles: { container: ViewStyle; text: TextStyle }
) => {
  const isTransparent = variant === 'outline' || variant === 'ghost';

  return {
    container: {
      ...baseStyles.container,
      backgroundColor: isTransparent ? 'transparent' : theme.colors.surfaceDisabled,
      borderColor: theme.colors.disabled,
      shadowOpacity: 0, // Remove shadows when disabled
      elevation: 0,
    },
    text: {
      ...baseStyles.text,
      color: theme.colors.disabled,
    },
  };
};

export default ThemedButton;
