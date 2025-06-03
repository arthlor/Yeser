import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

type InputState = 'default' | 'error' | 'success' | 'disabled';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: string;
  helper?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputContainerStyle?: ViewStyle;
  messageStyle?: TextStyle;
}

/**
 * ThemedInput is an enhanced text input component with support for
 * labels, validation states, helper text, and icons.
 *
 * @param label - The label text for the input
 * @param error - Error message to display (puts input in error state)
 * @param success - Success message to display (puts input in success state)
 * @param helper - Helper text to display when no error or success is present
 * @param startIcon - Icon to display at the start of the input
 * @param endIcon - Icon to display at the end of the input
 * @param containerStyle - Additional styles for the container
 * @param labelStyle - Additional styles for the label
 * @param inputContainerStyle - Additional styles for the input container
 * @param messageStyle - Additional styles for the message text
 */
const ThemedInput: React.FC<ThemedInputProps> = ({
  label,
  error,
  success,
  helper,
  startIcon,
  endIcon,
  style,
  containerStyle,
  labelStyle,
  inputContainerStyle,
  messageStyle,
  onFocus,
  onBlur,
  editable = true,
  ...rest
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  // Determine the input state
  let inputState: InputState = 'default';
  if (!editable) {
    inputState = 'disabled';
  } else if (error) {
    inputState = 'error';
  } else if (success) {
    inputState = 'success';
  }

  const styles = createStyles(theme, inputState, isFocused);

  // Animation for focus state
  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: theme.animations.duration?.normal || 300,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focusAnim, theme.animations.duration?.normal]);

  // Interpolate border color based on focus and state
  const getBorderColor = () => {
    switch (inputState) {
      case 'error':
        return theme.colors.error;
      case 'success':
        return theme.colors.success;
      case 'disabled':
        return theme.colors.disabled;
      default:
        return isFocused ? theme.colors.primary : theme.colors.outline;
    }
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [getBorderColor(), theme.colors.primary],
  });

  // Handle focus and blur events
  const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Determine message to display
  const message = error || success || helper;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Animated.Text
          style={[
            styles.label,
            labelStyle,
            {
              color: isFocused ? theme.colors.primary : theme.colors.onSurface,
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}

      <Animated.View style={[styles.inputContainer, inputContainerStyle, { borderColor }]}>
        {startIcon && <View style={styles.iconStart}>{startIcon}</View>}

        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={
            inputState === 'disabled' ? theme.colors.disabled : theme.colors.textSecondary
          }
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          accessibilityLabel={label}
          accessibilityState={{
            disabled: !editable,
            // Note: React Native doesn't have a built-in 'invalid' or 'error' state
            // for accessibility. We're using just disabled state here.
          }}
          {...rest}
        />

        {endIcon && <View style={styles.iconEnd}>{endIcon}</View>}
      </Animated.View>

      {message ? (
        <Text
          style={[
            styles.message,
            messageStyle,
            error ? styles.errorMessage : success ? styles.successMessage : styles.helperMessage,
          ]}
          accessibilityLabel={error ? `Error: ${error}` : success ? `Success: ${success}` : helper}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
};

const createStyles = (theme: AppTheme, state: InputState, _isFocused: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    label: {
      ...theme.typography.labelMedium,
      marginBottom: theme.spacing.xs,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: theme.borderRadius.sm,
      backgroundColor:
        state === 'disabled' ? theme.colors.surfaceDisabled : theme.colors.inputBackground,
      borderColor:
        state === 'error'
          ? theme.colors.error
          : state === 'success'
            ? theme.colors.success
            : state === 'disabled'
              ? theme.colors.disabled
              : theme.colors.outline,
    },
    input: {
      flex: 1,
      color: state === 'disabled' ? theme.colors.onDisabled : theme.colors.inputText,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      ...theme.typography.bodyMedium,
    },
    iconStart: {
      marginLeft: theme.spacing.sm,
    },
    iconEnd: {
      marginRight: theme.spacing.sm,
    },
    message: {
      marginTop: theme.spacing.xs,
      ...theme.typography.labelSmall,
    },
    errorMessage: {
      color: theme.colors.error,
    },
    successMessage: {
      color: theme.colors.success,
    },
    helperMessage: {
      color: theme.colors.textSecondary,
    },
  });

export default ThemedInput;
