import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { useTranslation } from 'react-i18next';
import { MOOD_EMOJIS } from '@/types/mood.types';
import { moodStorageService } from '@/services/moodStorageService';

interface GratitudeInputBarProps {
  onSubmit: (text: string) => void;
  onSubmitWithMood?: (text: string, mood: import('@/types/mood.types').MoodEmoji | null) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  promptText?: string;
  promptLoading?: boolean;
  promptError?: string | null;
  onRefreshPrompt?: () => void;
  showPrompt?: boolean;
  currentCount?: number;
  goal?: number;
}

export interface GratitudeInputBarRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

/**
 * 📝 Premium Gratitude Input - Redesigned
 *
 * Design: High-contrast card, clean typography, intuitive actions.
 */
const GratitudeInputBar = forwardRef<GratitudeInputBarRef, GratitudeInputBarProps>(
  (
    {
      onSubmit,
      onSubmitWithMood,
      placeholder: _placeholder,
      error: _error,
      disabled = false,
      autoFocus = false,
      promptText,
      promptLoading,
      promptError: _promptError,
      onRefreshPrompt,
      showPrompt = true,
      currentCount: _currentCount,
      goal: _goal,
    },
    ref
  ) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme, disabled), [theme, disabled]);
    const inputRef = useRef<TextInput>(null);

    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [fallbackPromptIndex, setFallbackPromptIndex] = useState(0);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const emojiAnim = useRef(new Animated.Value(0)).current;
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    const animations = useCoordinatedAnimations();

    // Button feedback
    const buttonScale = useRef(new Animated.Value(1)).current;

    const fallbackPrompts = t('gratitude.prompt.fallbackList', { returnObjects: true }) as string[];

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => setInputText(''),
    }));

    // Auto-focus logic
    useEffect(() => {
      if (autoFocus && !disabled) {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    }, [autoFocus, disabled]);

    // Entrance
    useEffect(() => {
      animations.animateEntrance({ duration: 500 });
    }, [animations]);

    // Previously loaded recents from moodStorageService - now handled internally by mood selection

    const handleSubmit = useCallback(() => {
      if (inputText.trim() && !disabled) {
        hapticFeedback.light();

        // Button animation
        Animated.sequence([
          Animated.timing(buttonScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
          Animated.spring(buttonScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]).start();

        if (onSubmitWithMood) {
          onSubmitWithMood(
            inputText.trim(),
            (selectedMood as unknown as import('@/types/mood.types').MoodEmoji) ?? null
          );
        } else {
          onSubmit(inputText.trim());
        }
        setInputText('');
        setSelectedMood(null);

        // Keep focus
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, [inputText, disabled, onSubmit, selectedMood, onSubmitWithMood, buttonScale]);

    const handlePromptRefresh = useCallback(() => {
      onRefreshPrompt?.();
      setFallbackPromptIndex((prev) => (prev + 1) % fallbackPrompts.length);
      hapticFeedback.light();
    }, [onRefreshPrompt, fallbackPrompts]);

    const toggleEmoji = useCallback(() => {
      hapticFeedback.light();
      if (emojiOpen) {
        Animated.timing(emojiAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
          setEmojiOpen(false)
        );
      } else {
        setEmojiOpen(true);
        Animated.timing(emojiAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    }, [emojiOpen, emojiAnim]);

    const insertEmoji = useCallback(
      async (emoji: string | null) => {
        hapticFeedback.light();
        setSelectedMood(emoji);
        if (emoji) {
          moodStorageService.addRecent(emoji as never).catch(() => {});
        }
        toggleEmoji();
      },
      [toggleEmoji]
    );

    const displayPrompt = promptText || fallbackPrompts[fallbackPromptIndex];
    const isButtonEnabled = inputText.trim().length > 0 && !disabled;

    return (
      <Animated.View
        style={[
          styles.container,
          { opacity: animations.fadeAnim, transform: animations.entranceTransform },
        ]}
      >
        {/* PROMPT HEADER */}
        {showPrompt && !inputText && (
          <View style={styles.promptContainer}>
            <View style={styles.promptIcon}>
              <Icon name="sprout-outline" size={16} color={theme.colors.primary} />
            </View>
            {promptLoading ? (
              <Text style={[styles.promptText, styles.promptLoadingOpacity]}>
                {t('shared.loading')}
              </Text>
            ) : (
              <Text style={styles.promptText}>{displayPrompt}</Text>
            )}
            <TouchableOpacity
              onPress={handlePromptRefresh}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="refresh" size={14} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT CARD */}
        <View style={[styles.inputCard, isFocused && styles.inputCardFocused]}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t('gratitude.input.placeholder', 'I am grateful for...')}
            placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
            multiline
            textAlignVertical="top"
            maxLength={500}
            editable={!disabled}
          />

          {/* FOOTER ACTIONS */}
          <View style={styles.inputFooter}>
            <TouchableOpacity onPress={toggleEmoji} style={styles.moodButton}>
              {selectedMood ? (
                <View style={styles.selectedMoodBadge}>
                  <Text style={styles.selectedMoodText}>{selectedMood}</Text>
                </View>
              ) : (
                <Icon
                  name="emoticon-happy-outline"
                  size={22}
                  color={theme.colors.onSurfaceVariant + '80'}
                />
              )}
            </TouchableOpacity>

            <View style={styles.characterCount}>
              <Text
                style={[styles.countText, inputText.length > 450 && { color: theme.colors.error }]}
              >
                {inputText.length > 0 ? `${inputText.length}/500` : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isButtonEnabled}
              style={[styles.sendButton, !isButtonEnabled && styles.sendButtonDisabled]}
            >
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                {disabled ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  <Icon
                    name="arrow-up"
                    size={20}
                    color={isButtonEnabled ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                  />
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* EMOJI MODAL (Simplified) */}
        <Modal visible={emojiOpen} transparent animationType="none" onRequestClose={toggleEmoji}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={toggleEmoji}>
            <Animated.View
              style={[
                styles.emojiSheet,
                {
                  transform: [
                    {
                      translateY: emojiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [300, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.emojiHandle} />
              <Text style={styles.emojiTitle}>
                {t('gratitude.input.moods.primary', 'How does this make you feel?')}
              </Text>

              <View style={styles.emojiGrid}>
                {MOOD_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => insertEmoji(emoji)}
                    style={styles.emojiItem}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => insertEmoji(null)} style={styles.clearMoodBtn}>
                <Text style={styles.clearMoodText}>
                  {t('gratitude.input.moods.clear', 'Clear mood')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </Animated.View>
    );
  }
);

GratitudeInputBar.displayName = 'GratitudeInputBar';

const createStyles = (theme: AppTheme, disabled: boolean) =>
  StyleSheet.create({
    container: {
      width: '100%',
      gap: theme.spacing.sm,
      opacity: disabled ? 0.7 : 1,
    },
    promptContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      gap: theme.spacing.sm,
      marginBottom: 4,
    },
    promptIcon: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.full,
      padding: 4,
    },
    promptText: {
      flex: 1,
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      fontSize: 13,
    },
    inputCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      width: '100%',
      minHeight: 160,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    inputCardFocused: {
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    textInput: {
      flex: 1,
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontSize: 17,
      lineHeight: 26,
      minHeight: 90,
    },
    inputFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    moodButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant + '60',
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedMoodBadge: {
      width: 40,
      height: 40,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    characterCount: {
      flex: 1,
      alignItems: 'flex-end',
      paddingRight: theme.spacing.md,
    },
    countText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    sendButton: {
      backgroundColor: theme.colors.primary,
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    sendButtonDisabled: {
      backgroundColor: theme.colors.surfaceVariant,
      shadowOpacity: 0,
      elevation: 0,
    },

    // Emoji Sheet
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    emojiSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    emojiHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.outline + '40',
      alignSelf: 'center',
      borderRadius: 2,
      marginBottom: theme.spacing.lg,
    },
    emojiTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    emojiItem: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderRadius: theme.borderRadius.full,
    },
    emojiText: {
      fontSize: 24,
    },
    clearMoodBtn: {
      marginTop: theme.spacing.lg,
      alignItems: 'center',
    },
    clearMoodText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
    },
    promptLoadingOpacity: {
      opacity: 0.5,
    },
    selectedMoodText: {
      fontSize: 16,
    },
  });

export default GratitudeInputBar;
