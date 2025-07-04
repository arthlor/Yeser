import React from 'react';
import {
  Animated,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';
import { semanticSpacing } from '../../../themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: string; // Material Community Icons name
  rightIcon?: string; // Material Community Icons name
  onRightIconPress?: () => void;
  variant?: 'outlined' | 'filled';
  size?: 'compact' | 'standard' | 'large';

  // Enhanced interaction props
  rightIconAccessibilityLabel?: string;
  showClearButton?: boolean; // Auto-show clear button when text is present
  onClear?: () => void;

  // 🆕 Enhanced validation props
  validationState?: 'default' | 'success' | 'warning' | 'error';
  showValidationIcon?: boolean; // Show validation state icon
  isRequired?: boolean; // Mark field as required
  characterLimit?: number; // Show character count
}

/**
 * 🎯 SIMPLIFIED THEMED INPUT
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated complex 4-step shake animation sequence for errors
 * - Replaced with haptic feedback and coordinated press animations
 * - Maintained focus animation with coordinated entrance
 * - Simplified all interactions to use coordinated animation system
 * - Enhanced accessibility and performance with minimal animations
 */
const ThemedInput: React.FC<ThemedInputProps> = ({
  label,
  helperText,
  errorText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'standard',
  rightIconAccessibilityLabel,
  showClearButton = false,
  onClear,
  validationState = 'default',
  showValidationIcon = true,
  isRequired = false,
  characterLimit,
  style,
  editable = true,
  value,
  ...rest
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all animations
  const animations = useCoordinatedAnimations();

  // Character count logic
  const characterCount = value?.length || 0;
  const isOverLimit = characterLimit ? characterCount > characterLimit : false;

  // Determine validation state
  const effectiveValidationState = React.useMemo(() => {
    if (errorText || isOverLimit) {
      return 'error';
    }
    return validationState;
  }, [errorText, isOverLimit, validationState]);

  const hasError = effectiveValidationState === 'error';
  const isDisabled = !editable;

  const styles = createStyles(theme, variant, size, isFocused, hasError, isDisabled);

  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    // **COORDINATED ENTRANCE**: Subtle focus animation
    animations.animateEntrance({ duration: 200 });
    rest.onFocus?.(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    rest.onBlur?.(e);
  };

  // **SIMPLIFIED ERROR FEEDBACK**: Replace complex shake with haptic feedback and minimal visual cue
  React.useEffect(() => {
    if (errorText || isOverLimit) {
      // **HAPTIC FEEDBACK**: Essential for accessibility and error awareness
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // **MINIMAL VISUAL FEEDBACK**: Simple coordinated press animation for subtle visual cue
      animations.animatePressIn();
      setTimeout(() => {
        animations.animatePressOut();
      }, 150);
    }
  }, [errorText, isOverLimit, animations]);

  // Show clear button logic
  const shouldShowClear = showClearButton && value && value.length > 0 && !rightIcon;

  // Show validation icon logic
  const shouldShowValidationIcon =
    showValidationIcon && effectiveValidationState !== 'default' && !shouldShowClear && !rightIcon;

  // Handle clear button press
  const handleClear = () => {
    onClear?.();
    // Also trigger onChange if available for controlled inputs
    rest.onChangeText?.('');
  };

  // Get validation icon
  const getValidationIcon = () => {
    switch (effectiveValidationState) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert-circle';
      case 'error':
        return 'close-circle';
      default:
        return null;
    }
  };

  // Get validation icon color
  const getValidationIconColor = () => {
    switch (effectiveValidationState) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <Text
          style={styles.label}
          accessibilityRole="text"
          accessibilityLabel={`${label}${isRequired ? ', required' : ''}${errorText ? `, Error: ${errorText}` : ''}`}
        >
          {label}
          {isRequired && <Text style={styles.requiredIndicator}> *</Text>}
        </Text>
      )}

      {/* Input Container with Coordinated Animation */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            transform: animations.pressTransform, // Use coordinated press transform
          },
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={getIconSize(size)}
            color={styles.icon.color}
            style={styles.leftIcon}
            accessibilityRole="image"
            accessibilityLabel={`${leftIcon} icon`}
          />
        )}

        {/* Text Input */}
        <TextInput
          style={[styles.input, style]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          value={value}
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.primary}
          accessibilityLabel={label}
          accessibilityHint={helperText}
          accessibilityState={{
            disabled: !editable,
          }}
          {...rest}
        />

        {/* 🆕 Validation Icon */}
        {shouldShowValidationIcon &&
          (() => {
            const validationIcon = getValidationIcon();
            return validationIcon ? (
              <Icon
                name={validationIcon}
                size={getIconSize(size)}
                color={getValidationIconColor()}
                style={styles.validationIcon}
                accessibilityRole="image"
                accessibilityLabel={`${effectiveValidationState} state`}
              />
            ) : null;
          })()}

        {/* Clear Button (Auto-show when text present) */}
        {shouldShowClear && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size={getIconSize(size)} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Right Icon */}
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconButton}
            disabled={!onRightIconPress}
            accessibilityRole={onRightIconPress ? 'button' : 'image'}
            accessibilityLabel={rightIconAccessibilityLabel || `${rightIcon} icon`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={rightIcon} size={getIconSize(size)} color={styles.icon.color} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Enhanced Helper/Error Text with Character Count */}
      {(helperText || errorText || characterLimit) && (
        <View style={styles.messageContainer}>
          <View style={styles.messageContent}>
            {(errorText || (isOverLimit && characterLimit)) && (
              <Icon
                name="alert-circle-outline"
                size={12}
                color={theme.colors.error}
                style={styles.messageIcon}
              />
            )}
            <Text
              style={[
                styles.helperText,
                errorText || isOverLimit ? styles.errorText : undefined,
                effectiveValidationState === 'success' ? styles.successText : undefined,
                effectiveValidationState === 'warning' ? styles.warningText : undefined,
              ]}
              accessibilityRole="text"
              accessibilityLiveRegion={errorText || isOverLimit ? 'polite' : 'none'}
            >
              {errorText || (isOverLimit ? `Character limit exceeded` : helperText)}
            </Text>
          </View>

          {/* Character Count */}
          {characterLimit && (
            <Text
              style={[styles.characterCount, isOverLimit && styles.characterCountError]}
              accessibilityRole="text"
              accessibilityLabel={`${characterCount} of ${characterLimit} characters`}
            >
              {characterCount}/{characterLimit}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Get icon size based on input size
 */
const getIconSize = (size: 'compact' | 'standard' | 'large'): number => {
  switch (size) {
    case 'compact':
      return 18;
    case 'large':
      return 24;
    default:
      return 20;
  }
};

/**
 * 🎨 ENHANCED STYLING SYSTEM
 * Refined styling with better visual hierarchy and interactions
 */
const createStyles = (
  theme: AppTheme,
  variant: 'outlined' | 'filled',
  size: 'compact' | 'standard' | 'large',
  isFocused: boolean,
  hasError: boolean,
  isDisabled: boolean
) => {
  const spacing = semanticSpacing(theme);

  // Get size-specific configurations
  const sizeConfig = {
    compact: {
      height: 36,
      fontSize: 14,
      paddingHorizontal: spacing.inputPadding.horizontal,
    },
    standard: {
      height: spacing.touchTarget, // 44pt for accessibility
      fontSize: 16,
      paddingHorizontal: spacing.inputPadding.horizontal,
    },
    large: {
      height: 52,
      fontSize: 18,
      paddingHorizontal: spacing.inputPadding.horizontal,
    },
  };

  const config = sizeConfig[size];

  // Get variant-specific styling
  const variantStyles = getVariantStyles(theme, variant);

  // Determine text color based on state
  const getTextColor = () => {
    if (isDisabled) {
      return theme.colors.disabled;
    }
    return theme.colors.text;
  };

  return StyleSheet.create({
    container: {
      marginBottom: spacing.fieldGap,
    },

    label: {
      fontSize: 14,
      fontWeight: '600', // Slightly bolder for better hierarchy
      fontFamily: theme.typography.fontFamilyMedium,
      color: hasError ? theme.colors.error : isFocused ? theme.colors.primary : theme.colors.text,
      marginBottom: spacing.labelGap,
      letterSpacing: 0.1,
    } as TextStyle,

    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: config.height,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 2,
      backgroundColor: variantStyles.backgroundColor,
      paddingHorizontal: config.paddingHorizontal,
      opacity: isDisabled ? 0.6 : 1,
      borderColor: hasError
        ? theme.colors.error
        : isDisabled
          ? theme.colors.disabled
          : isFocused
            ? theme.colors.primary
            : variantStyles.borderColor,
      ...(isFocused &&
        !hasError && {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 0.5,
          elevation: 1,
        }),
      ...(hasError && {
        backgroundColor: theme.colors.errorContainer + '10',
        shadowColor: theme.colors.error,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }),
    } as ViewStyle,

    input: {
      flex: 1,
      fontSize: config.fontSize,
      fontFamily: theme.typography.fontFamilyRegular,
      color: getTextColor(),
      margin: 0,
      padding: 0,
      height: config.height - 4,
      paddingHorizontal: spacing.elementGap,
      paddingVertical: Platform.OS === 'ios' ? theme.spacing.xxs : 0,
      textAlignVertical: 'center',
      includeFontPadding: false,
      letterSpacing: 0.15,
    } as TextStyle,

    leftIcon: {
      marginRight: spacing.iconGap,
      alignSelf: 'center',
    },

    iconButton: {
      padding: 4, // Proper touch target
      marginLeft: spacing.iconGap / 2,
      borderRadius: theme.borderRadius.sm,
      alignSelf: 'center',
    },

    icon: {
      color: isDisabled
        ? theme.colors.disabled
        : hasError
          ? theme.colors.error
          : isFocused
            ? theme.colors.primary
            : theme.colors.textSecondary,
    },

    messageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', // Space between message and character count
      marginTop: spacing.helperGap,
      minHeight: 16, // Consistent height for layout stability
    },

    messageContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1, // Take available space
    },

    messageIcon: {
      marginRight: spacing.elementGap,
      alignSelf: 'flex-start',
      marginTop: 2, // Slight offset to align with text baseline
    },

    helperText: {
      flex: 1,
      fontSize: 12,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.textSecondary,
      lineHeight: 16,
      includeFontPadding: false,
    } as TextStyle,

    errorText: {
      color: theme.colors.error,
      fontWeight: '500', // Slightly bolder for errors
    } as TextStyle,

    requiredIndicator: {
      color: theme.colors.error,
      fontWeight: '500',
    } as TextStyle,

    validationIcon: {
      marginLeft: spacing.iconGap,
      alignSelf: 'center',
    },

    successText: {
      color: theme.colors.success,
    } as TextStyle,

    warningText: {
      color: theme.colors.warning,
    } as TextStyle,

    characterCount: {
      fontSize: 12,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.textSecondary,
      marginLeft: spacing.elementGap,
    } as TextStyle,

    characterCountError: {
      color: theme.colors.error,
    } as TextStyle,
  });
};

/**
 * 🎨 VARIANT STYLING
 * Clean styling for input variants
 */
const getVariantStyles = (theme: AppTheme, variant: 'outlined' | 'filled') => {
  switch (variant) {
    case 'filled':
      return {
        backgroundColor: theme.colors.inputBackground,
        borderColor: 'transparent',
      };

    case 'outlined':
    default:
      return {
        backgroundColor: 'transparent',
        borderColor: theme.colors.outline,
      };
  }
};

export default ThemedInput;
export type { ThemedInputProps };
