import React, { useCallback, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../themes/types';
import { getPrimaryShadow } from '../../themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

interface OnboardingGratitudeInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  buttonText?: string;
  disabled?: boolean;
}

/**
 * 🌿 COORDINATED ONBOARDING GRATITUDE INPUT
 * 
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated complex Animated.sequence button press animation
 * - Replaced with coordinated press animation system
 * - Maintained all functionality with minimal, coordinated animations
 * - Enhanced consistency with app-wide animation system
 */
const OnboardingGratitudeInput: React.FC<OnboardingGratitudeInputProps> = ({
  onSubmit,
  placeholder = 'Örneğin: Kahvemin sıcaklığı...',
  buttonText = 'Dene',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = createStyles(theme);

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all animations
  const animations = useCoordinatedAnimations();

  const handleSubmit = useCallback(() => {
    if (inputText.trim() && !disabled) {
      // **COORDINATED PRESS FEEDBACK**: Use coordinated press animation
      animations.animatePressIn();
      setTimeout(() => {
        animations.animatePressOut();
      }, 150);

      onSubmit(inputText.trim());
    }
  }, [inputText, disabled, onSubmit, animations]);

  const isButtonEnabled = inputText.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.onSurfaceVariant + '50'}
          multiline
          maxLength={200}
          editable={!disabled}
          textAlignVertical="center"
        />

        {/* **COORDINATED BUTTON ANIMATION**: Use coordinated press transform */}
        <Animated.View style={{ transform: animations.pressTransform }}>
          <TouchableOpacity
            onPress={handleSubmit}
            onPressIn={animations.animatePressIn}
            onPressOut={animations.animatePressOut}
            style={[styles.button, !isButtonEnabled && styles.buttonDisabled]}
            disabled={!isButtonEnabled}
            activeOpacity={1} // We handle animation manually
          >
            <Text style={[styles.buttonText, !isButtonEnabled && styles.buttonTextDisabled]}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginVertical: theme.spacing.md,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
      minHeight: 56,
      // 🌟 Beautiful primary shadow for input container
      ...getPrimaryShadow.floating(theme),
    },
    inputContainerFocused: {
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    input: {
      flex: 1,
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      margin: 0,
      padding: 0,
      minHeight: 40,
      maxHeight: 80,
      paddingTop: Platform.OS === 'ios' ? 2 : 0,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      // 🌟 Beautiful primary shadow for button
      ...getPrimaryShadow.small(theme),
    },
    buttonDisabled: {
      backgroundColor: theme.colors.outline,
      opacity: 0.6,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      ...theme.typography.titleMedium,
      letterSpacing: 0.3,
    },
    buttonTextDisabled: {
      color: theme.colors.onSurfaceVariant,
    },
  });

export default OnboardingGratitudeInput;
