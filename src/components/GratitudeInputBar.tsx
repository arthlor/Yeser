import React, { useState, useEffect, useRef } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Platform,
  KeyboardEvent,
} from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

interface GratitudeInputBarProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  buttonText?: string;
  error?: string | null;
  disableKeyboardAnimation?: boolean;
  onFocusChange?: (focused: boolean) => void;
  disabled?: boolean;
}

const GratitudeInputBar: React.FC<GratitudeInputBarProps> = ({
  onSubmit,
  placeholder = 'Bugün neye minnettarsın?',
  buttonText = 'Ekle',
  error,
  disableKeyboardAnimation,
  onFocusChange,
  disabled,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  const getThemedStyles = (currentColors: AppTheme['colors']) =>
    StyleSheet.create({
      outerContainer: {
        backgroundColor: 'transparent',
        paddingVertical: theme.spacing.md,
      },
      container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
      },
      inputContainer: {
        flex: 1,
        backgroundColor: currentColors.surface,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 2,
        borderColor: currentColors.outline,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        minHeight: 56,
        shadowColor: currentColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative',
      },
      // Gradient border container
      gradientBorderContainer: {
        position: 'absolute',
        top: -3,
        left: -3,
        right: -3,
        bottom: -3,
        borderRadius: theme.borderRadius.xl + 3,
        padding: 3,
        zIndex: -1,
      },
      gradientBorder: {
        flex: 1,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: 'transparent',
      },
      inputContainerFocused: {
        borderColor: currentColors.primary,
        shadowColor: currentColors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
      },
      input: {
        fontSize: 16,
        lineHeight: 24,
        color: currentColors.onSurface,
        fontWeight: '400',
        margin: 0,
        padding: 0,
      },
      button: {
        height: 56,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.borderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
        shadowColor: currentColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      buttonEnabled: {
        backgroundColor: currentColors.primary,
      },
      buttonDisabled: {
        backgroundColor: currentColors.surfaceVariant,
        shadowOpacity: 0.03,
        elevation: 1,
      },
      buttonText: {
        color: currentColors.onPrimary,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
      },
      buttonTextDisabled: {
        color: currentColors.onSurfaceVariant,
      },
      errorText: {
        color: currentColors.error,
        fontSize: 12,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.lg,
        fontWeight: '500',
      },
    });

  const styles = getThemedStyles(colors);
  const placeholderTextColor = colors.onSurfaceVariant;

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));

  // Simplified keyboard handling - just track if keyboard is visible
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Animation values for gradient border effects
  const borderPulse = useRef(new Animated.Value(0)).current;
  const gradientOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (disableKeyboardAnimation) return;

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [disableKeyboardAnimation]);

  const handleSubmit = () => {
    if (inputText.trim()) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      onSubmit(inputText.trim());
      setInputText('');
      Keyboard.dismiss();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocusChange?.(true);

    // Start gradient border animations with consistent native driver usage
    Animated.parallel([
      // Opacity animation - cannot use native driver for opacity on gradient
      Animated.timing(gradientOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      // Color pulse animation - cannot use native driver for backgroundColor
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderPulse, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(borderPulse, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onFocusChange?.(false);

    // Stop all animations
    borderPulse.stopAnimation();

    Animated.timing(gradientOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const isButtonEnabled = inputText.trim().length > 0 && !disabled;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          {/* Animated gradient border */}
          <Animated.View
            style={[
              styles.gradientBorderContainer,
              {
                opacity: gradientOpacity,
                backgroundColor: colors.primary + '30', // Fixed 30% opacity instead of interpolated
              },
            ]}
          >
            {/* Pulsing overlay for subtle animation */}
            <Animated.View
              style={[
                styles.gradientBorder,
                {
                  backgroundColor: colors.primary + '20',
                  opacity: borderPulse,
                },
              ]}
            />
          </Animated.View>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            multiline
            textAlignVertical="top"
            maxLength={500}
            accessibilityLabel={placeholder}
            accessibilityHint="Gratitude entry input field"
            accessibilityRole="text"
            editable={!disabled}
          />
        </View>

        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.button, isButtonEnabled ? styles.buttonEnabled : styles.buttonDisabled]}
            disabled={!isButtonEnabled}
            activeOpacity={0.8}
            accessibilityLabel={buttonText}
            accessibilityHint="Submit gratitude entry"
            accessibilityRole="button"
            accessibilityState={{ disabled: !isButtonEnabled }}
          >
            <Text style={[styles.buttonText, !isButtonEnabled && styles.buttonTextDisabled]}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default GratitudeInputBar;
