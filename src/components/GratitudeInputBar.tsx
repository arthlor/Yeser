import React, { useState } from 'react';
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
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

interface GratitudeInputBarProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  buttonText?: string;
  error?: string | null;
}

const GratitudeInputBar: React.FC<GratitudeInputBarProps> = ({
  onSubmit,
  placeholder = 'Bugün neye minnettarsın?',
  buttonText = 'Ekle',
  error,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;

  const getThemedStyles = (currentColors: AppTheme['colors']) =>
    StyleSheet.create({
      outerContainer: {
        backgroundColor: currentColors.background,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0,
        position: 'relative',
      },
      gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: currentColors.primary,
        opacity: 0.1, // Use primary color with opacity for subtle gradient hint
      },
      container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: 'transparent',
      },
      inputContainer: {
        flex: 1,
        position: 'relative',
        backgroundColor: currentColors.surface,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: currentColors.outline,
        marginRight: 12,
        shadowColor: currentColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        transform: [{ scale: 1 }],
      },
      errorText: {
        color: currentColors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4, // Align with input container's horizontal padding or visual preference
        fontWeight: '500',
      },
      inputContainerFocused: {
        borderColor: currentColors.primary,
        shadowColor: currentColors.primary,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        transform: [{ scale: 1.01 }],
      },
      input: {
        minHeight: 52,
        maxHeight: 120,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        fontSize: 16,
        lineHeight: 22,
        color: currentColors.onSurface,
        fontWeight: '400',
        borderWidth: 0,
      },
      characterCount: {
        position: 'absolute',
        bottom: 8,
        right: 12,
        backgroundColor: currentColors.surface,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
      },
      characterCountText: {
        fontSize: 11,
        color: currentColors.onSurfaceVariant,
        fontWeight: '500',
      },
      button: {
        height: 52,
        borderRadius: 16,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: currentColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
      },
      buttonEnabled: {
        backgroundColor: currentColors.primary,
        borderWidth: 1,
        borderColor: currentColors.surface,
      },
      buttonDisabled: {
        backgroundColor: currentColors.surfaceDisabled,
        borderWidth: 1,
        borderColor: currentColors.outline,
        shadowOpacity: 0.03,
      },
      buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
      buttonText: {
        color: colors.onPrimary,
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3,
      },
      buttonTextDisabled: {
        color: currentColors.onDisabled,
      },
      buttonArrow: {
        color: colors.onPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 6,
        opacity: 0.8,
      },
      buttonArrowDisabled: {
        color: currentColors.onDisabled,
      },
    });

  const styles = getThemedStyles(colors);
  const placeholderTextColor = colors.onSurfaceVariant;

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));

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
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const isButtonEnabled = inputText.trim().length > 0;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.gradientOverlay} />
      <View style={styles.container}>
        <View style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused
        ]}>
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
          />
          {inputText.length > 0 && !error && (
            <View style={styles.characterCount}>
              <Text style={styles.characterCountText}>
                {inputText.length} / 500
              </Text>
            </View>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[
              styles.button,
              isButtonEnabled ? styles.buttonEnabled : styles.buttonDisabled
            ]}
            disabled={!isButtonEnabled}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Text
                style={[
                  styles.buttonText,
                  !isButtonEnabled && styles.buttonTextDisabled,
                ]}
              >
                {buttonText}
              </Text>
              <Text style={[
                styles.buttonArrow,
                !isButtonEnabled && styles.buttonArrowDisabled
              ]}>
                →
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

export default GratitudeInputBar;