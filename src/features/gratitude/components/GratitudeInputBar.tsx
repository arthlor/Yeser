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
import type { ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { logger } from '@/utils/logger';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
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
    const headerGradientColors = useMemo<[ColorValue, ColorValue]>(
      () => [theme.colors.primary + '26', theme.colors.primaryContainer + '08'],
      [theme.colors.primary, theme.colors.primaryContainer]
    );
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
    const dividerAnim = useRef(new Animated.Value(0)).current;
    const focusGlowAnim = useRef(new Animated.Value(0)).current;
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
      Animated.timing(focusGlowAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, [focusGlowAnim, isFocused]);

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

    useEffect(() => {
      const dividerLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(dividerAnim, {
            toValue: 1,
            duration: 3600,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(dividerAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      dividerLoop.start();

      return () => {
        dividerLoop.stop();
      };
    }, [dividerAnim]);

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
          <LinearGradient
            colors={headerGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTopRow}>
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
                <Icon name="heart-plus" size={22} color={theme.colors.onPrimary} />
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
            <View style={styles.headerBottomRow}>
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
                <View style={styles.characterCountContainer}>
                  <Text style={[styles.characterCount, { color: counterColor }]}>
                    {inputText.length}/500
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Enhanced Input Section (no gradient) */}
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          {/* Left accent bar */}
          <View style={styles.accentWrapper}>
            <Animated.View
              style={[
                styles.accentBar,
                {
                  opacity: accentAnim,
                },
              ]}
              pointerEvents="none"
            />
          </View>
          <View style={styles.inputWrapper}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.focusGlow,
                {
                  opacity: focusGlowAnim,
                },
              ]}
            />
            {/* Floating label */}
            <Animated.Text
              pointerEvents="none"
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: labelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [14, -22],
                      }),
                    },
                    {
                      scale: labelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.88],
                      }),
                    },
                  ],
                  opacity: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
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
              placeholder={''}
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
    // **EDGE-TO-EDGE CONTAINER**: Full-width design with striking visual hierarchy
    container: {
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '15',
      borderBottomColor: theme.colors.outline + '15',
      overflow: 'hidden',
      opacity: disabled ? 0.6 : 1,
      ...getPrimaryShadow.card(theme),
    },

    // **COMPACT HEADER**: Edge-to-edge header with compact layout
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    headerGradient: {
      borderRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '24',
      backgroundColor: theme.colors.primaryContainer + '10',
      gap: theme.spacing.md,
      ...getPrimaryShadow.small(theme),
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    mottoColumn: {
      flex: 1,
      position: 'relative',
      minHeight: 30,
      justifyContent: 'center',
    },
    headerBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    mottoText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
      letterSpacing: -0.3,
      fontFamily: theme.typography.fontFamilySerifBold ?? theme.typography.fontFamilyBold,
      fontSize: 13,
      lineHeight: 21,
    },
    revisitMottoText: {
      ...theme.typography.titleMedium,
      color: theme.colors.primary,
      position: 'absolute',
      left: 0,
      right: 0,
      fontStyle: 'italic',
      fontWeight: '600',
      letterSpacing: -0.2,
      fontFamily:
        theme.typography.fontFamilySerifMedium ??
        theme.typography.fontFamilySerif ??
        theme.typography.fontFamilyMedium,
      fontSize: 17,
      lineHeight: 21,
      top: 0,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    progressInlineText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    progressChip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '30',
      minWidth: 68,
      alignItems: 'center',
      justifyContent: 'center',
      ...getPrimaryShadow.small(theme),
    },
    progressChipText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    characterCountContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      ...getPrimaryShadow.small(theme),
    },
    characterCount: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      textAlign: 'right',
    },

    // **EDGE-TO-EDGE INPUT SECTION**: Full-width input with enhanced design
    inputContainer: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      ...getPrimaryShadow.medium(theme),
    },
    inputContainerFocused: {
      backgroundColor: theme.colors.primaryContainer + '12',
      borderColor: theme.colors.primary + '35',
    },

    inputWrapper: {
      position: 'relative',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
      ...getPrimaryShadow.medium(theme),
    },
    focusGlow: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary + '10',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 20,
      elevation: 5,
    },

    input: {
      flexGrow: 1,
      fontSize: 20,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.onSurface,
      minHeight: 112,
      maxHeight: 220,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderWidth: 2,
      borderColor: theme.colors.outline + '25',
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      textAlignVertical: 'top',
      lineHeight: 30,
      fontWeight: '400',
      zIndex: 1,
      position: 'relative',
    },
    inputFocused: {
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 4,
    },
    inputFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '15',
      gap: theme.spacing.md,
    },
    inputFooterRowFocused: {
      borderTopColor: theme.colors.primary + '30',
    },
    emojiFooterButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '30',
    },
    footerEmojiBubbleText: {
      fontSize: 22,
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
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      minHeight: 48,
      minWidth: 160,
      borderRadius: theme.borderRadius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
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
      fontWeight: '700',
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

    // **EDGE-TO-EDGE PROMPT SECTION**: Full-width prompt with subtle design
    promptContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '08',
    },
    promptInner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer + '10',
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
    },
    promptBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary + '12',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    promptCopy: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    promptLoadingContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    floatingLabel: {
      position: 'absolute',
      left: theme.spacing.lg,
      top: theme.spacing.md,
      zIndex: 2,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 6,
      borderRadius: theme.borderRadius.xs,
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
    },
    accentBar: {
      width: 3,
      alignSelf: 'stretch',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    accentWrapper: {
      width: 8,
      alignItems: 'center',
      justifyContent: 'center',
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
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 36,
      minHeight: 36,
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
