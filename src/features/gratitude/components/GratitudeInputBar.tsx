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
  Keyboard,
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
import { AIUsageIndicator } from '@/shared/components/ui/AIUsageIndicator';
import { MOOD_EMOJIS } from '@/types/mood.types';
import { moodStorageService } from '@/services/moodStorageService';
import { useEntryEnhancement } from '@/features/gratitude/hooks/useEntryEnhancement';
import { useSubscription } from '@/hooks/useSubscription';
import { useLanguageStore } from '@/store/languageStore';

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

    // Controlled height for the inline emoji picker
    const emojiHeightAnim = useRef(new Animated.Value(0)).current;

    const [selectedMood, setSelectedMood] = useState<string | null>(null);
    const [showEnhancePreview, setShowEnhancePreview] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);

    const animations = useCoordinatedAnimations();

    // AI Enhancement (PRO only)
    const { isPro } = useSubscription();
    const language = useLanguageStore((state) => state.language);
    const {
      enhancedText,
      isLoading: isEnhancing,
      remaining: aiRemaining,
      resetInSeconds: aiResetInSeconds,
      enhanceEntry,
      clearEnhancement,
    } = useEntryEnhancement({ language: language === 'tr' ? 'tr' : 'en' });

    const handleEnhance = useCallback(async () => {
      // Show feedback if text is too short, or just disable button (handled by UI condition, but good to double check)
      if (!inputText.trim() || inputText.trim().length < 5) {
        return;
      }
      hapticFeedback.light();
      const result = await enhanceEntry(inputText.trim());

      if (result) {
        setShowEnhancePreview(true);
      } else {
        // If no result, check if it was due to limit
        // We can check if aiRemaining is 0, or just rely on the fact that if it failed and we are Pro, it's likely a limit or error.
        // Since we want to show the specific reset timer if exhausted:
        // The hook updates 'aiRemaining' and 'aiResetInSeconds' even on error.
        // We'll give state update a tick to propagate if needed, but usually it's batched.
        // Actually, we can check the hook values. But relying on state might be slightly delayed?
        // useEntryEnhancement updates state *before* returning null? Yes.

        // Let's force a check on the updated state in a useEffect or just Assume if failure happens we check remaining.
        // But since we can't see the *new* value immediately in this closure...
        // We will set a flag or just assume if it returns null, we check the global store/hook state.

        // Better: The hook returns null but sets state.
        // We can set showLimitModal(true) and let the modal decide what to show (e.g. "Limit Reached" or "Error").
        // But we only want to show it if it really is the limit.
        // Let's rely on the fact that the hook updates 'error' too?
        setShowLimitModal(true);
      }
    }, [inputText, enhanceEntry]);

    const applyEnhancement = useCallback(() => {
      if (enhancedText) {
        setInputText(enhancedText);
        setShowEnhancePreview(false);
        clearEnhancement();
        hapticFeedback.success();
      }
    }, [enhancedText, clearEnhancement]);

    const discardEnhancement = useCallback(() => {
      setShowEnhancePreview(false);
      clearEnhancement();
    }, [clearEnhancement]);

    // Button feedback
    const buttonScale = useRef(new Animated.Value(1)).current;

    const fallbackPrompts = useMemo(() => {
      const list = t('gratitude.prompt.fallbackList', { returnObjects: true });
      return Array.isArray(list) ? (list as string[]) : [t('gratitude.prompt.fallbackText')];
    }, [t]);

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

    // **STABILITY SAFETY**: Reset animations if they get stuck or component stays hidden
    useEffect(() => {
      const timer = setTimeout(() => {
        if (!animations.isAnimating()) {
          animations.safeReset();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }, [animations]);

    // Entrance
    useEffect(() => {
      animations.animateEntrance({ duration: 500 });
    }, [animations]);

    // Previously loaded recents from moodStorageService - now handled internally by mood selection

    const toggleEmoji = useCallback(() => {
      hapticFeedback.light();
      if (emojiOpen) {
        // Close
        Animated.parallel([
          Animated.timing(emojiAnim, { toValue: 0, duration: 200, useNativeDriver: false }), // Fixed: JS Driver
          Animated.timing(emojiHeightAnim, {
            toValue: 0,
            duration: 250,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
          }),
        ]).start(() => setEmojiOpen(false));
      } else {
        // Open
        Keyboard.dismiss(); // Dismiss keyboard when opening emojis
        setEmojiOpen(true);
        Animated.parallel([
          Animated.timing(emojiAnim, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false, // Fixed: JS Driver
          }),
          Animated.timing(emojiHeightAnim, {
            toValue: 200, // Approximate height of the emoji grid
            duration: 300,
            easing: Easing.out(Easing.back(1)),
            useNativeDriver: false,
          }),
        ]).start();
      }
    }, [emojiOpen, emojiAnim, emojiHeightAnim]);

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

        // Close emoji picker if open
        if (emojiOpen) {
          toggleEmoji();
        }

        // Keep focus
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, [
      inputText,
      disabled,
      onSubmit,
      selectedMood,
      onSubmitWithMood,
      buttonScale,
      emojiOpen,
      toggleEmoji,
    ]);

    const handlePromptRefresh = useCallback(() => {
      onRefreshPrompt?.();
      setFallbackPromptIndex((prev) => (prev + 1) % fallbackPrompts.length);
      hapticFeedback.light();
    }, [onRefreshPrompt, fallbackPrompts]);

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
              disabled={!isPro}
              style={!isPro ? styles.promptRefreshLocked : undefined}
            >
              <Icon
                name={!isPro ? 'lock-outline' : 'refresh'}
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
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
            onFocus={() => {
              setIsFocused(true);
              if (emojiOpen) {
                toggleEmoji();
              }
            }}
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
                  name={emojiOpen ? 'keyboard-close' : 'emoticon-happy-outline'}
                  size={22}
                  color={theme.colors.onSurfaceVariant + '80'}
                />
              )}
            </TouchableOpacity>

            {/* AI Enhance Button (PRO only) */}
            {isPro && (
              <TouchableOpacity
                onPress={handleEnhance}
                disabled={isEnhancing || inputText.trim().length < 5}
                style={[
                  styles.enhanceButton,
                  inputText.trim().length < 5 && styles.enhanceButtonDisabled,
                ]}
              >
                {isEnhancing ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimaryContainer} />
                ) : (
                  <>
                    <Icon name="auto-fix" size={18} color={theme.colors.onPrimaryContainer} />
                    <Text style={styles.enhanceButtonText}>
                      {t('ai.enhance.button', 'Enhance')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

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

          {/* INLINE EMOJI PICKER */}
          <Animated.View
            style={[
              styles.emojiInlineContainer,
              {
                height: emojiHeightAnim,
                opacity: emojiAnim,
              },
            ]}
          >
            <View style={styles.emojiDivider} />
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
        </View>

        {/* ENHANCEMENT PREVIEW MODAL - Keeps using Modal as it is a temporary overlay */}
        <Modal
          visible={showEnhancePreview && !!enhancedText}
          transparent
          animationType="fade"
          onRequestClose={discardEnhancement}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.enhanceSheet}>
              <View style={styles.emojiHandle} />
              <Text style={styles.enhanceTitle}>{t('ai.enhance.title', '✨ Enhanced Entry')}</Text>

              <View style={styles.usageContainer}>
                <AIUsageIndicator
                  remaining={isEnhancing ? null : aiRemaining}
                  resetInSeconds={aiResetInSeconds}
                  showAlways={true}
                />
                {/* Note: useEntryEnhancement returns 'remaining' which is assigned to a variable in the hook call */}
              </View>

              <View style={styles.enhancePreview}>
                <Text style={styles.enhancePreviewText}>{enhancedText}</Text>
              </View>

              <View style={styles.enhanceActions}>
                <TouchableOpacity onPress={discardEnhancement} style={styles.enhanceDiscardBtn}>
                  <Text style={styles.enhanceDiscardText}>
                    {t('ai.enhance.discard', 'Discard')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={applyEnhancement} style={styles.enhanceApplyBtn}>
                  <Icon name="check" size={18} color={theme.colors.onPrimary} />
                  <Text style={styles.enhanceApplyText}>{t('ai.enhance.apply', 'Apply')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={showLimitModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLimitModal(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.limitSheet}>
              <Text style={styles.limitTitle}>
                {aiRemaining === 0
                  ? t('ai.usage.limit_reached', 'Daily AI Limit Reached')
                  : t('shared.error', 'Something went wrong')}
              </Text>
              {aiRemaining === 0 ? (
                <View style={styles.limitContent}>
                  <Text style={styles.limitMessage}>
                    {t('ai.usage.limit_desc', 'You have used all your AI enhancements for today.')}
                  </Text>
                  <AIUsageIndicator
                    remaining={0}
                    resetInSeconds={aiResetInSeconds}
                    showAlways={true}
                  />
                </View>
              ) : (
                <Text style={styles.limitMessage}>
                  {t('ai.enhance.failed', 'Failed to enhance entry. Please try again.')}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => setShowLimitModal(false)}
                style={styles.limitCloseBtn}
              >
                <Text style={styles.limitCloseText}>{t('shared.close', 'Close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    promptRefreshLocked: {
      opacity: 0.45,
    },
    inputCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      width: '100%',
      // minHeight removed to allow wrapping
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
      shadowColor: theme.colors.scrim,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
      overflow: 'hidden', // Ensure animation stays inside
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

    // Inline Emoji Picker
    emojiInlineContainer: {
      width: '100%',
      overflow: 'hidden',
    },
    emojiDivider: {
      height: 1,
      backgroundColor: theme.colors.outline + '20',
      marginVertical: theme.spacing.md,
      width: '100%',
    },
    emojiTitle: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    emojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    emojiItem: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderRadius: theme.borderRadius.full,
    },
    emojiText: {
      fontSize: 22,
    },
    clearMoodBtn: {
      marginTop: theme.spacing.xs,
      alignItems: 'center',
      paddingBottom: theme.spacing.sm,
    },
    clearMoodText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
    },

    // Legacy/Modal Styles (for Enhance Preview)
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'center', // Changed to center for enhancement modal
      padding: theme.spacing.lg,
    },
    emojiHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.colors.outline + '40',
      alignSelf: 'center',
      borderRadius: 2,
      marginBottom: theme.spacing.lg,
    },
    promptLoadingOpacity: {
      opacity: 0.5,
    },
    selectedMoodText: {
      fontSize: 16,
    },
    // AI Enhancement
    enhanceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      marginLeft: theme.spacing.xs,
      gap: 6,
    },
    enhanceButtonDisabled: {
      opacity: 0.5,
    },
    enhanceButtonText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '600',
    },
    enhanceSheet: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      // marginHorizontal: theme.spacing.lg, // handled by padding of backdrop
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    enhanceTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    enhancePreview: {
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    enhancePreviewText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 26,
    },
    enhanceActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    enhanceDiscardBtn: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
    },
    enhanceDiscardText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurfaceVariant,
    },
    enhanceApplyBtn: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    enhanceApplyText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onPrimary,
    },
    usageContainer: {
      alignItems: 'center',
      marginBottom: 12,
    },
    limitSheet: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      width: '90%',
      maxWidth: 340,
      alignSelf: 'center',
      alignItems: 'center',
    },
    limitTitle: {
      ...theme.typography.titleMedium,
      marginBottom: theme.spacing.sm,
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    limitContent: {
      alignItems: 'center',
      width: '100%',
      gap: theme.spacing.md,
    },
    limitMessage: {
      ...theme.typography.bodyMedium,
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.md,
    },
    limitCloseBtn: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.secondaryContainer,
      borderRadius: theme.borderRadius.full,
    },
    limitCloseText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSecondaryContainer,
    },
  });

export default GratitudeInputBar;
