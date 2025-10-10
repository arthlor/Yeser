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
  Dimensions,
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
    const [emojiPosition, setEmojiPosition] = useState<{ top: number; left: number }>({
      top: 0,
      left: 0,
    });
    const [recents, setRecents] = useState<string[]>([]);
    const [selectedMood, setSelectedMood] = useState<string | null>(null);

    // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
    const animations = useCoordinatedAnimations();

    // Subtle submit button feedback
    const buttonScale = useRef(new Animated.Value(1)).current;
    const shimmerOpacity = useRef(new Animated.Value(0.6)).current;
    const labelAnim = useRef(new Animated.Value(0)).current;
    const accentAnim = useRef(new Animated.Value(0)).current;
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
      if (!emojiButtonRef.current) {
        setEmojiOpen(true);
        Animated.timing(emojiAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
        return;
      }
      emojiButtonRef.current?.measureInWindow((x, y, width, height) => {
        const menuWidth = 240;
        const windowWidth = Dimensions.get('window').width;
        const left = Math.min(Math.max(8, x + width - menuWidth), windowWidth - menuWidth - 8);
        const top = y + height + 8;
        setEmojiPosition({ top, left });
        setEmojiOpen(true);
        Animated.timing(emojiAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      });
    }, [emojiAnim]);

    const closeEmoji = useCallback(() => {
      Animated.timing(emojiAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
        setEmojiOpen(false);
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
      async (emoji: string) => {
        hapticFeedback.light();
        setSelectedMood(emoji);
        moodStorageService.addRecent(emoji as never).catch(() => {});
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
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Icon name="heart-plus" size={24} color={theme.colors.onPrimary} />
            </View>
            <Text style={styles.mottoText}>{t('gratitude.input.motto')}</Text>
          </View>
          <View style={styles.headerRight}>
            {typeof currentCount === 'number' && typeof goal === 'number' && (
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  {t('gratitude.input.progressToday', { current: currentCount, goal })}
                </Text>
              </View>
            )}
            {showCounter && (
              <View style={styles.characterCountContainer}>
                <Text style={[styles.characterCount, { color: counterColor }]}>
                  {inputText.length}/500
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Enhanced Input Section (no gradient) */}
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          {/* Left accent bar */}
          <Animated.View
            style={[
              styles.accentBar,
              {
                opacity: accentAnim,
              },
            ]}
            pointerEvents="none"
          />
          <View style={styles.inputWrapper}>
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
                        outputRange: [12, -12],
                      }),
                    },
                    {
                      scale: labelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.9],
                      }),
                    },
                  ],
                  opacity: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                },
              ]}
            >
              {t('gratitude.input.label', 'What are you grateful for?')}
            </Animated.Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
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
              accessibilityLabel={t('gratitude.input.label', 'What are you grateful for?')}
              accessibilityHint={t('gratitude.input.a11y.writeHint')}
            />
          </View>
          <TouchableOpacity
            ref={emojiButtonRef}
            onPress={toggleEmoji}
            style={[styles.emojiButton]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('gratitude.prompt.refreshA11y')}
          >
            {selectedMood ? (
              <Text style={styles.emojiSelected}>{selectedMood}</Text>
            ) : (
              <Icon name="emoticon-happy-outline" size={22} color={theme.colors.onSurfaceVariant} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.button, isButtonEnabled ? styles.buttonEnabled : styles.buttonDisabled]}
            disabled={!isButtonEnabled}
            activeOpacity={0.8}
            // **ACCESSIBILITY IMPROVEMENTS**
            accessibilityRole="button"
            accessibilityLabel={
              isButtonEnabled
                ? t('gratitude.input.a11y.sendEnabled')
                : t('gratitude.input.a11y.sendDisabled')
            }
            accessibilityHint={t('gratitude.input.a11y.writeHint')}
          >
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              {disabled ? (
                <ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
              ) : (
                <Icon
                  name={isButtonEnabled ? 'send' : 'send-outline'}
                  size={20}
                  color={isButtonEnabled ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
                />
              )}
            </Animated.View>
          </TouchableOpacity>
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
                  { scale: emojiAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
                  {
                    translateY: emojiAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.emojiRow}>
              {[...new Set([...(recents as string[]), ...MOOD_EMOJIS])].slice(0, 10).map((e) => (
                <TouchableOpacity
                  key={e}
                  style={styles.emojiItem}
                  onPress={() => insertEmoji(e)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Modal>

        {/* Subtle Inspirational Prompt */}
        {!inputText && !isFocused && showPrompt && (
          <View style={styles.promptContainer}>
            {promptLoading ? (
              <View style={styles.promptLoadingContainer}>
                <Animated.View style={[styles.shimmerLine, { opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.shimmerLineShort, { opacity: shimmerOpacity }]} />
              </View>
            ) : promptError ? (
              <View style={styles.promptErrorContainer}>
                <Text style={styles.promptText}>✨ {displayPrompt}</Text>
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
            ) : (
              <View style={styles.promptActiveContainer}>
                <Text style={styles.promptText}>💡 {displayPrompt}</Text>
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
            )}
            {/* Prompt suggestion chips removed as requested */}
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: theme.colors.primaryContainer + '08',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '12',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
    },
    mottoText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    iconContainer: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    titleContainer: {
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // Title removed for compactness
    characterCountContainer: {
      backgroundColor: theme.colors.primary + '12',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.primary + '25',
    },
    characterCount: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    progressPill: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 6,
      marginRight: theme.spacing.sm,
    },
    progressPillText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '700',
    },

    // **EDGE-TO-EDGE INPUT SECTION**: Full-width input with enhanced design
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
      minHeight: 100,
    },
    inputContainerFocused: {
      backgroundColor: theme.colors.primaryContainer + '10',
    },

    // **INPUT WRAPPER FOR GRADIENT BORDER**
    inputWrapper: {
      flex: 1,
      position: 'relative',
    },

    // **GRADIENT BORDER FOR INPUT**
    inputGradientBorderContainer: {
      position: 'absolute',
      top: -1,
      left: -1,
      right: -1,
      bottom: -1,
      borderRadius: theme.borderRadius.lg + 1,
      zIndex: 0,
    },
    inputGradientBorder: {
      flex: 1,
      borderRadius: theme.borderRadius.lg + 1,
    },

    input: {
      flex: 1,
      fontSize: 18,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.onSurface,
      minHeight: 60,
      maxHeight: 140,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderWidth: 2,
      borderColor: theme.colors.outline + '25',
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      textAlignVertical: 'top',
      lineHeight: 26,
      fontWeight: '400',
      zIndex: 1,
      position: 'relative',
      ...getPrimaryShadow.small(theme),
    },
    button: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.medium(theme),
    },
    buttonEnabled: {
      backgroundColor: theme.colors.primary,
    },
    buttonDisabled: {
      backgroundColor: theme.colors.surfaceVariant,
    },

    // Emoji button & picker styles
    emojiButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
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
    emojiSelected: {
      fontSize: 18,
    },

    // **EDGE-TO-EDGE PROMPT SECTION**: Full-width prompt with subtle design
    promptContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.primaryContainer + '08',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '15',
    },
    promptLoadingContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    promptLoadingText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      textAlign: 'center',
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
    promptErrorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
    },
    promptActiveContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.xs,
    },
    promptText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      flex: 1,
      marginRight: theme.spacing.sm,
      fontWeight: '400',
      lineHeight: 20,
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
