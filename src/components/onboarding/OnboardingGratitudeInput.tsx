import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../themes/types';
import { getPrimaryShadow } from '../../themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import type { MoodEmoji } from '@/types/mood.types';
import { MOOD_EMOJIS } from '@/types/mood.types';
import { moodStorageService } from '@/services/moodStorageService';

interface OnboardingGratitudeInputProps {
  onSubmit?: (text: string) => void;
  onSubmitWithMood?: (text: string, mood: MoodEmoji | null) => void;
  placeholder?: string;
  buttonText?: string;
  disabled?: boolean;
  onMoodChange?: (mood: MoodEmoji | null) => void;
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
  onSubmitWithMood,
  placeholder = '',
  buttonText = '',
  disabled = false,
  onMoodChange,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { colors } = theme;
  const styles = createStyles(theme);

  // Use i18n keys or fallback to props
  const actualPlaceholder = placeholder || t('shared.onboarding.gratitudeInput.placeholder');
  const actualButtonText = buttonText || t('shared.onboarding.gratitudeInput.buttonText');

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiPosition, setEmojiPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [recents, setRecents] = useState<string[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodEmoji | null>(null);

  const inputRef = useRef<TextInput>(null);
  const emojiButtonRef = useRef<View>(null);
  const emojiAnim = useRef(new Animated.Value(0)).current;

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all animations
  const animations = useCoordinatedAnimations();

  // Load recent emojis
  useEffect(() => {
    let isMounted = true;
    const loadRecents = async () => {
      const recent = await moodStorageService.getRecents();
      if (isMounted) {
        setRecents(recent);
      }
    };
    loadRecents();
    return () => {
      isMounted = false;
    };
  }, []);

  // Open emoji picker
  const openEmoji = useCallback(() => {
    if (emojiButtonRef.current) {
      emojiButtonRef.current.measure((_x, _y, _width, _height, pageX, pageY) => {
        setEmojiPosition({
          top: pageY + _height + 8,
          left: Math.max(16, pageX - 100),
        });
        setEmojiOpen(true);
        Animated.spring(emojiAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      });
    }
  }, [emojiAnim]);

  // Close emoji picker
  const closeEmoji = useCallback(() => {
    Animated.timing(emojiAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setEmojiOpen(false));
  }, [emojiAnim]);

  // Insert emoji at cursor position
  const insertEmoji = useCallback(
    async (emoji: string) => {
      const typedEmoji = emoji as MoodEmoji;
      setSelectedMood(typedEmoji);
      onMoodChange?.(typedEmoji);

      await moodStorageService.addRecent(typedEmoji);
      const updated = await moodStorageService.getRecents();
      setRecents(updated);

      closeEmoji();

      // Refocus input for continuity
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    },
    [closeEmoji, onMoodChange]
  );

  const handleSubmit = useCallback(() => {
    if (inputText.trim() && !disabled) {
      // **COORDINATED PRESS FEEDBACK**: Use coordinated press animation
      animations.animatePressIn();
      setTimeout(() => {
        animations.animatePressOut();
      }, 150);

      const trimmed = inputText.trim();
      const mood = selectedMood;

      if (onSubmitWithMood) {
        onSubmitWithMood(trimmed, mood);
      }

      onSubmit?.(trimmed);

      setSelectedMood(null);
      onMoodChange?.(null);
    }
  }, [inputText, disabled, animations, onSubmit, onSubmitWithMood, selectedMood, onMoodChange]);

  const isButtonEnabled = useMemo(
    () => inputText.trim().length > 0 && !disabled,
    [inputText, disabled]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        {/* Emoji Button */}
        <View ref={emojiButtonRef}>
          <TouchableOpacity
            onPress={openEmoji}
            style={styles.emojiButton}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityLabel={t('shared.emoji.openPicker')}
            accessibilityRole="button"
          >
            {selectedMood ? (
              <Text style={styles.selectedMood}>{selectedMood}</Text>
            ) : (
              <Ionicons
                name="happy-outline"
                size={20}
                color={disabled ? colors.onSurfaceVariant : colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={actualPlaceholder}
          placeholderTextColor={colors.onSurfaceVariant + '50'}
          multiline
          maxLength={200}
          editable={!disabled}
          textAlignVertical="center"
        />

        {/* **COORDINATED BUTTON ANIMATION**: Use coordinated press transform */}
        <Animated.View
          style={React.useMemo(
            () => ({ transform: animations.pressTransform }),
            [animations.pressTransform]
          )}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            onPressIn={animations.animatePressIn}
            onPressOut={animations.animatePressOut}
            style={[styles.button, !isButtonEnabled && styles.buttonDisabled]}
            disabled={!isButtonEnabled}
            activeOpacity={1} // We handle animation manually
          >
            <Text style={[styles.buttonText, !isButtonEnabled && styles.buttonTextDisabled]}>
              {actualButtonText}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Emoji Picker Modal */}
      <Modal visible={emojiOpen} transparent animationType="none" onRequestClose={closeEmoji}>
        <TouchableOpacity style={styles.emojiBackdrop} onPress={closeEmoji} activeOpacity={1} />
        <Animated.View
          style={[
            styles.emojiPicker,
            {
              top: emojiPosition.top,
              left: emojiPosition.left,
              opacity: emojiAnim,
              transform: [
                {
                  scale: emojiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
                {
                  translateY: emojiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.emojiRow}>
            {[...new Set([...recents, ...MOOD_EMOJIS])].slice(0, 10).map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiItem}
                onPress={() => insertEmoji(emoji)}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={t('shared.mood.setMood.a11y', { emoji })}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Modal>
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
    selectedMood: {
      fontSize: 20,
    },
    emojiButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '30',
    },
    emojiBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface + '08',
    },
    emojiPicker: {
      position: 'absolute',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      minWidth: 240,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    emojiItem: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
    },
    emojiText: {
      fontSize: 20,
    },
  });

export default OnboardingGratitudeInput;
