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
import { logger } from '@/utils/logger';

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
  // New prompt functionality props
  promptText?: string;
  promptLoading?: boolean;
  promptError?: string | null;
  onRefreshPrompt?: () => void;
  showPrompt?: boolean;
  currentCount?: number;
  goal?: number;
}

// **IMPERATIVE HANDLE**: Expose focus method for parent components
export interface GratitudeInputBarRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

/**
 * 📝 ENHANCED GRATITUDE INPUT BAR WITH GRADIENT ANIMATED BORDER
 *
 * **SPECIAL ANIMATION EXCEPTION**:
 * - Added gradient animated border for visual appeal
 * - Custom gradient rotation animation
 * - Enhanced focus state with animated border
 * - **PERFORMANCE FIX**: Added forwardRef for imperative focus control
 */
const GratitudeInputBar = forwardRef<GratitudeInputBarRef, GratitudeInputBarProps>(
  (
    {
      onSubmit,
      onSubmitWithMood,
      placeholder: _placeholder = undefined,
      error,
      disabled = false,
      autoFocus = false,
      // New prompt functionality props
      promptText,
      promptLoading,
      promptError,
      onRefreshPrompt,
      showPrompt = true,
      currentCount,
      goal,
    },
    ref
  ) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme, disabled), [theme, disabled]);
    const inputRef = useRef<TextInput>(null);
    const emojiButtonRef = useRef<View>(null);

    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [fallbackPromptIndex, setFallbackPromptIndex] = useState(0);
    const [selection, setSelection] = useState<{ start: number; end: number }>({
      start: 0,
      end: 0,
    });
    const [emojiOpen, setEmojiOpen] = useState(false);
    const emojiAnim = useRef(new Animated.Value(0)).current;
    const [recents, setRecents] = useState<string[]>([]);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
    const animations = useCoordinatedAnimations();

    // Subtle submit button feedback
    const buttonScale = useRef(new Animated.Value(1)).current;
    const shimmerOpacity = useRef(new Animated.Value(0.6)).current;
    const labelAnim = useRef(new Animated.Value(0)).current;
    const accentAnim = useRef(new Animated.Value(0)).current;
    const headerPulse = useRef(new Animated.Value(0)).current;
    const revisitMottoAnim = useRef(new Animated.Value(0)).current;
    const wasDisabledRef = useRef<boolean>(disabled ?? false);
    const submittedWhileDisabledRef = useRef<boolean>(false);

    // Fallback prompts for when varied prompts are disabled or unavailable
    const fallbackPrompts = t('gratitude.prompt.fallbackList', { returnObjects: true }) as string[];

    // **IMPERATIVE HANDLE**: Expose methods to parent components
    useImperativeHandle(ref, () => ({
      focus: () => {
        if (inputRef.current && !disabled) {
          inputRef.current.focus();
        }
      },
      blur: () => {
        if (inputRef.current) {
          inputRef.current.blur();
        }
      },
      clear: () => {
        setInputText('');
      },
    }));

    // No gradient animations; keep focus handling only
    useEffect(() => {}, [isFocused]);

    // Shimmer animation for prompt loading
    useEffect(() => {
      let shimmerLoop: Animated.CompositeAnimation | null = null;
      if (promptLoading) {
        shimmerLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(shimmerOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(shimmerOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
          ])
        );
        shimmerLoop.start();
      } else {
        shimmerOpacity.setValue(1);
      }
      return () => {
        shimmerLoop?.stop?.();
      };
    }, [promptLoading, shimmerOpacity]);

    // Floating label + accent bar animations
    useEffect(() => {
      const active = isFocused || inputText.trim().length > 0;
      Animated.timing(labelAnim, {
        toValue: active ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
      Animated.timing(accentAnim, {
        toValue: active ? 1 : 0.35,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }, [isFocused, inputText, labelAnim, accentAnim]);

    useEffect(() => {
      Animated.spring(headerPulse, {
        toValue: isFocused || inputText.trim().length > 0 ? 1 : 0,
        damping: 12,
        mass: 0.6,
        stiffness: 140,
        useNativeDriver: true,
      }).start();
    }, [headerPulse, isFocused, inputText]);

    useEffect(() => {
      if ((currentCount ?? 0) > 0) {
        Animated.timing(revisitMottoAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      } else {
        revisitMottoAnim.setValue(0);
      }
    }, [currentCount, revisitMottoAnim]);

    // **COORDINATED ENTRANCE**: Simple entrance animation
    useEffect(() => {
      animations.animateEntrance({ duration: 400 });
    }, [animations]);

    // Robust auto-focus without interference
    useEffect(() => {
      if (autoFocus && inputRef.current && !disabled) {
        const timer = setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 300); // Longer delay for stability
        return () => clearTimeout(timer);
      }
    }, [autoFocus, disabled]);

    // 🛡️ MEMORY LEAK FIX: Cleanup refs on unmount
    useEffect(() => {
      const input = inputRef.current;
      return () => {
        if (input) {
          // No explicit cleanup needed for the ref itself
        }
      };
    }, []);

    const handleSubmit = useCallback(() => {
      if (inputText.trim() && !disabled) {
        hapticFeedback.light();
        submittedWhileDisabledRef.current = true;
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

        // Keep focus for continuous input - with error handling
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    }, [inputText, disabled, onSubmit, selectedMood, onSubmitWithMood]);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
    }, []);

    const handleChangeText = useCallback((text: string) => {
      setInputText(text);
    }, []);

    const handleSelectionChange = useCallback(
      (e: { nativeEvent: { selection: { start: number; end: number } } }) => {
        setSelection(e.nativeEvent.selection);
      },
      []
    );

    const handlePromptRefresh = useCallback(() => {
      if (onRefreshPrompt) {
        onRefreshPrompt();
      }
      // Also cycle through fallback prompts for better UX
      setFallbackPromptIndex((prev) => (prev + 1) % fallbackPrompts.length);
    }, [onRefreshPrompt, fallbackPrompts.length]);

    // Log prompt errors subtly for diagnostics
    useEffect(() => {
      if (promptError) {
        logger.warn('Prompt error in GratitudeInputBar', {
          component: 'GratitudeInputBar',
          error: promptError,
        });
      }
    }, [promptError]);

    // Detect end of submitting state to play a subtle button success pulse
    useEffect(() => {
      if (wasDisabledRef.current && !disabled && submittedWhileDisabledRef.current) {
        Animated.sequence([
          Animated.timing(buttonScale, { toValue: 1.08, duration: 100, useNativeDriver: true }),
          Animated.timing(buttonScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start(() => {
          submittedWhileDisabledRef.current = false;
        });
      }
      wasDisabledRef.current = !!disabled;
    }, [disabled, buttonScale]);

    const isButtonEnabled = inputText.trim().length > 0 && !disabled;
    // Character counter visibility and threshold coloring
    const showCounter = inputText.length >= 350;
    const counterColor = useMemo(() => {
      if (inputText.length >= 490) {
        return theme.colors.error;
      }
      if (inputText.length >= 450) {
        return theme.colors.warning;
      }
      return theme.colors.onSurfaceVariant;
    }, [inputText.length, theme.colors.error, theme.colors.onSurfaceVariant, theme.colors.warning]);
    const showProgressInline = useMemo(
      () => typeof currentCount === 'number' && typeof goal === 'number',
      [currentCount, goal]
    );
    const progressCaption = useMemo(() => {
      if (typeof currentCount === 'number' && typeof goal === 'number') {
        return t('gratitude.input.progressToday', { current: currentCount, goal });
      }

      return t('gratitude.prompt.storyHint', 'Bugün bir minnet yazarak yeni bir tohum ek.');
    }, [currentCount, goal, t]);

    const moodQuickActionLabel = selectedMood
      ? t('gratitude.input.moodQuickActionSelected', 'Tap to change')
      : t('gratitude.input.moodQuickAction', 'Choose mood');
    const sendButtonLabel = t('gratitude.input.sendButton', 'Send gratitude');
    const sendIconColor = isButtonEnabled ? theme.colors.onPrimary : theme.colors.onSurfaceVariant;

    // Determine which prompt to display
    const displayPrompt = promptText || fallbackPrompts[fallbackPromptIndex];

    // Load emoji recents on mount
    useEffect(() => {
      let mounted = true;
      const loadRecents = async () => {
        const r = await moodStorageService.getRecents();
        if (mounted) {
          setRecents(r);
        }
      };
      loadRecents();
      return () => {
        mounted = false;
      };
    }, []);

    const openEmoji = useCallback(() => {
      setEmojiOpen(true);
      Animated.timing(emojiAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, [emojiAnim]);

    const closeEmoji = useCallback(() => {
      Animated.timing(emojiAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setEmojiOpen(false);
        }
      });
    }, [emojiAnim]);

    const toggleEmoji = useCallback(() => {
      hapticFeedback.light();
      if (emojiOpen) {
        closeEmoji();
      } else {
        openEmoji();
      }
    }, [emojiOpen, closeEmoji, openEmoji]);

    const insertEmoji = useCallback(
      async (emoji: string | null) => {
        hapticFeedback.light();
        setSelectedMood(emoji);
        if (emoji) {
          moodStorageService.addRecent(emoji as never).catch(() => {});
        }
        closeEmoji();
        // refocus input
        setTimeout(() => inputRef.current?.focus(), 0);
      },
      [closeEmoji]
    );

    return (
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerSurface}>
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  transform: [
                    {
                      scale: headerPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.08],
                      }),
                    },
                    {
                      rotate: headerPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '3deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Icon name="heart-plus" size={18} color={theme.colors.primary} />
            </Animated.View>
            <View style={styles.mottoColumn}>
              <Animated.Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.mottoText,
                  {
                    opacity: revisitMottoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0],
                    }),
                  },
                ]}
              >
                {t('gratitude.input.motto')}
              </Animated.Text>
              <Animated.Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.revisitMottoText,
                  {
                    opacity: revisitMottoAnim,
                  },
                ]}
              >
                {t('gratitude.input.revisitMotto', 'Minnetle yeşer 🌱')}
              </Animated.Text>
            </View>
            {showProgressInline && (
              <View style={styles.progressChip}>
                <Text style={styles.progressChipText}>
                  {currentCount}/{goal}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerMetaRow}>
            <Animated.Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.progressInlineText,
                {
                  opacity: accentAnim,
                },
              ]}
            >
              {progressCaption}
            </Animated.Text>
            {showCounter && (
              <Text style={[styles.characterCount, { color: counterColor }]}>
                {inputText.length}/500
              </Text>
            )}
          </View>
        </View>

        {/* Input Section */}
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          <Animated.Text
            pointerEvents="none"
            style={[
              styles.floatingLabel,
              {
                transform: [
                  {
                    translateY: labelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, -18],
                    }),
                  },
                  {
                    scale: labelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.9],
                    }),
                  },
                ],
                opacity: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
              },
            ]}
          >
            {t('gratitude.input.label')}
          </Animated.Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, isFocused ? styles.inputFocused : null]}
            value={inputText}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSelectionChange={handleSelectionChange}
            placeholder=""
            placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
            multiline={true}
            textAlignVertical="top"
            maxLength={500}
            editable={!disabled}
            scrollEnabled={false}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            blurOnSubmit={false}
            autoCorrect={true}
            autoCapitalize="sentences"
            keyboardType="default"
            selectionColor={theme.colors.primary}
            selection={selection}
            autoFocus={false} // We handle this manually
            // **ACCESSIBILITY IMPROVEMENTS**
            accessibilityLabel={t('gratitude.input.label')}
            accessibilityHint={t('gratitude.input.a11y.writeHint')}
          />
        </View>

        <View style={[styles.inputFooterRow, isFocused && styles.inputFooterRowFocused]}>
          <TouchableOpacity
            ref={emojiButtonRef}
            onPress={toggleEmoji}
            style={styles.emojiFooterButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={moodQuickActionLabel}
          >
            <View style={styles.footerEmojiInner}>
              <View style={styles.footerEmojiBubble}>
                {selectedMood ? (
                  <Text style={styles.footerEmojiBubbleText}>{selectedMood}</Text>
                ) : (
                  <Icon name="emoticon-happy-outline" size={22} color={theme.colors.primary} />
                )}
              </View>
              <Text style={styles.footerEmojiLabel}>{moodQuickActionLabel}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[
              styles.footerSendButton,
              isButtonEnabled ? styles.footerSendEnabled : styles.footerSendDisabled,
            ]}
            disabled={!isButtonEnabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              isButtonEnabled
                ? t('gratitude.input.a11y.sendEnabled')
                : t('gratitude.input.a11y.sendDisabled')
            }
            accessibilityHint={t('gratitude.input.a11y.writeHint')}
          >
            <Animated.View
              style={[styles.footerSendContentAnimated, { transform: [{ scale: buttonScale }] }]}
            >
              {disabled ? (
                <ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
              ) : (
                <View style={styles.footerSendInner}>
                  <Text
                    style={[
                      styles.footerSendText,
                      isButtonEnabled
                        ? styles.footerSendTextEnabled
                        : styles.footerSendTextDisabled,
                    ]}
                  >
                    {sendButtonLabel}
                  </Text>
                  <Icon
                    name={isButtonEnabled ? 'send' : 'send-outline'}
                    size={20}
                    color={sendIconColor}
                  />
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Emoji Picker Modal */}
        <Modal visible={emojiOpen} transparent animationType="none" onRequestClose={closeEmoji}>
          <View style={styles.emojiSheetContainer}>
            <TouchableOpacity style={styles.emojiBackdrop} onPress={closeEmoji} activeOpacity={1} />
            <Animated.View
              style={[
                styles.emojiSheet,
                {
                  transform: [
                    {
                      translateY: emojiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [220, 0],
                      }),
                    },
                  ],
                  opacity: emojiAnim,
                },
              ]}
            >
              <View style={styles.emojiSheetHandle} />
              <Text style={styles.emojiSheetTitle}>
                {t('gratitude.input.moods.title', 'Duygu Tohumları')}
              </Text>
              {recents.length > 0 && (
                <View style={styles.emojiSection}>
                  <Text style={styles.emojiSectionTitle}>
                    {t('gratitude.input.moods.recent', 'Son seçimlerin')}
                  </Text>
                  <View style={styles.emojiRow}>
                    {[...new Set(recents as string[])].slice(0, 8).map((emoji) => (
                      <TouchableOpacity
                        key={`recent-${emoji}`}
                        style={styles.emojiItem}
                        onPress={() => insertEmoji(emoji)}
                        activeOpacity={0.9}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <View style={styles.emojiSection}>
                <Text style={styles.emojiSectionTitle}>
                  {t('gratitude.input.moods.primary', 'Duygunu seç')}
                </Text>
                <View style={styles.emojiRow}>
                  {MOOD_EMOJIS.map((emoji) => (
                    <TouchableOpacity
                      key={`mood-${emoji}`}
                      style={styles.emojiItem}
                      onPress={() => insertEmoji(emoji)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.emojiClearButton}
                onPress={() => insertEmoji(null)}
                activeOpacity={0.85}
              >
                <Icon name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.emojiClearButtonText}>
                  {t('gratitude.input.moods.clear', 'Duyguyu kaldır')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Subtle Inspirational Prompt */}
        {!inputText && !isFocused && showPrompt && (
          <View style={styles.promptContainer}>
            <View style={styles.promptInner}>
              <View style={styles.promptBadge}>
                <Icon name="sprout" size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.promptCopy}>
                {promptLoading ? (
                  <View style={styles.promptLoadingContainer}>
                    <Animated.View style={[styles.shimmerLine, { opacity: shimmerOpacity }]} />
                    <Animated.View style={[styles.shimmerLineShort, { opacity: shimmerOpacity }]} />
                  </View>
                ) : (
                  <Text style={styles.promptText}>
                    {promptError ? '✨ ' : '💡 '}
                    {displayPrompt}
                  </Text>
                )}
                <Text style={promptError ? styles.promptHintError : styles.promptHint}>
                  {t(
                    promptError
                      ? 'gratitude.prompt.storyHintFallback'
                      : 'gratitude.prompt.storyHint',
                    promptError
                      ? 'İlhamı yeniledikçe yeni tohumlar keşfedeceksin.'
                      : 'Bugün minnetini paylaşarak yeni bir tohum ek.'
                  )}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handlePromptRefresh}
                style={styles.refreshButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('gratitude.prompt.refreshA11y')}
              >
                <Icon name="refresh" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={16} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </Animated.View>
    );
  }
);

GratitudeInputBar.displayName = 'GratitudeInputBar';

const createStyles = (theme: AppTheme, disabled: boolean = false) =>
  StyleSheet.create({
    container: {
      opacity: disabled ? 0.65 : 1,
      gap: theme.spacing.md,
    },
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    headerSurface: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '12',
    },
    mottoColumn: {
      flex: 1,
      position: 'relative',
      minHeight: 24,
      justifyContent: 'center',
      marginHorizontal: theme.spacing.sm,
    },
    headerMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
    },
    mottoText: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    revisitMottoText: {
      ...theme.typography.titleSmall,
      color: theme.colors.primary,
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      fontStyle: 'italic',
      fontWeight: '600',
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '12',
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressInlineText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
    },
    progressChip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '10',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '30',
      minWidth: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressChipText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    characterCount: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },

    inputContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '14',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    inputContainerFocused: {
      backgroundColor: theme.colors.primaryContainer + '08',
      borderColor: theme.colors.primary,
    },

    input: {
      flexGrow: 1,
      fontSize: 16,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.onSurface,
      minHeight: 88,
      maxHeight: 200,
      paddingHorizontal: 0,
      paddingVertical: 0,
      textAlignVertical: 'top',
      lineHeight: 24,
      fontWeight: '400',
    },
    inputFocused: {
      color: theme.colors.onSurface,
    },

    floatingLabel: {
      position: 'absolute',
      left: theme.spacing.md,
      top: theme.spacing.md,
      zIndex: 2,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 6,
      borderRadius: theme.borderRadius.sm,
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
    },

    inputFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    inputFooterRowFocused: {
      opacity: 0.95,
    },
    emojiFooterButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '12',
      backgroundColor: theme.colors.surface,
    },
    emojiFooterSelected: {
      fontSize: 24,
    },
    footerEmojiInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    footerEmojiBubble: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '18',
    },
    footerEmojiBubbleText: {
      fontSize: 20,
    },
    footerEmojiLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    footerSendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      minHeight: 44,
      minWidth: 140,
      borderRadius: theme.borderRadius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '15',
      backgroundColor: theme.colors.surface,
    },
    footerSendEnabled: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    footerSendDisabled: {
      opacity: 0.6,
      borderColor: theme.colors.outline + '15',
    },
    footerSendContentAnimated: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footerSendInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    footerSendText: {
      ...theme.typography.labelLarge,
      fontWeight: '600',
    },
    footerSendTextEnabled: {
      color: theme.colors.onPrimary,
    },
    footerSendTextDisabled: {
      color: theme.colors.onSurfaceVariant,
    },
    // Emoji button & picker styles
    emojiBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.scrim + '70',
    },
    emojiSheetContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
    },
    emojiSheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 12,
    },
    emojiSheetHandle: {
      width: 48,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.outline + '30',
      alignSelf: 'center',
      marginBottom: theme.spacing.md,
    },
    emojiSheetTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    emojiSection: {
      marginBottom: theme.spacing.lg,
    },
    emojiSectionTitle: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    emojiRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-start',
    },
    emojiItem: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      marginRight: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    emojiText: {
      fontSize: 20,
    },
    emojiSelected: {
      fontSize: 18,
    },
    emojiClearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
    },
    emojiClearButtonText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },

    promptContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    promptInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '12',
    },
    promptBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '10',
      justifyContent: 'center',
      alignItems: 'center',
    },
    promptCopy: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    promptLoadingContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    shimmerLine: {
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.outline + '20',
      marginBottom: theme.spacing.xs,
    },
    shimmerLineShort: {
      height: 10,
      width: '65%',
      borderRadius: 5,
      backgroundColor: theme.colors.outline + '18',
    },
    promptText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      marginBottom: theme.spacing.xs,
      fontWeight: '500',
      lineHeight: 22,
    },
    promptHint: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
    },
    promptHintError: {
      ...theme.typography.bodySmall,
      color: theme.colors.warning,
      fontStyle: 'italic',
    },
    refreshButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 32,
      minHeight: 32,
    },
    // Chips styles removed

    // **EDGE-TO-EDGE ERROR SECTION**: Full-width error display
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.errorContainer + '08',
    },
    errorText: {
      ...theme.typography.labelMedium,
      color: theme.colors.error,
      fontWeight: '500',
      flex: 1,
    },
  });

export default GratitudeInputBar;
