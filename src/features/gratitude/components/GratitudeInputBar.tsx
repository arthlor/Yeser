import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { logger } from '@/utils/debugConfig';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { hapticFeedback } from '@/utils/hapticFeedback';

interface GratitudeInputBarProps {
  onSubmit: (text: string) => void;
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
      placeholder = 'Bugün neye minnettarsın?',
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
    const styles = useMemo(() => createStyles(theme, disabled), [theme, disabled]);
    const inputRef = useRef<TextInput>(null);

    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [fallbackPromptIndex, setFallbackPromptIndex] = useState(0);

    // **COORDINATED ANIMATION SYSTEM**: Use coordinated animations for consistency
    const animations = useCoordinatedAnimations();

    // **PERFORMANCE FIX**: Simple gradient border animation using native driver
    const gradientOpacity = useRef(new Animated.Value(0.8)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const wasDisabledRef = useRef<boolean>(disabled ?? false);
    const submittedWhileDisabledRef = useRef<boolean>(false);

    // Fallback prompts for when varied prompts are disabled or unavailable
    const fallbackPrompts = [
      'Bugün hangi güzel anlar için minnettarsın?',
      'Hayatındaki hangi kişiler seni mutlu ediyor?',
      'Bugün seni gülümsetmiş olan şeyler neler?',
      'Hangi deneyimler için minnettar hissediyorsun?',
      'Bugün yaşadığın pozitif anları düşün...',
    ];

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

    // Gradient border animation only while focused
    useEffect(() => {
      let opacityAnimation: Animated.CompositeAnimation | null = null;
      if (isFocused) {
        opacityAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(gradientOpacity, {
              toValue: 1,
              duration: 1400,
              useNativeDriver: true,
            }),
            Animated.timing(gradientOpacity, {
              toValue: 0.7,
              duration: 1400,
              useNativeDriver: true,
            }),
          ])
        );
        opacityAnimation.start();
      } else {
        gradientOpacity.setValue(0.8);
      }
      return () => {
        if (opacityAnimation) {
          opacityAnimation.stop();
        }
      };
    }, [gradientOpacity, isFocused]);

    // **COORDINATED ENTRANCE**: Simple entrance animation
    useEffect(() => {
      animations.animateEntrance({ duration: 400 });
    }, [animations]);

    // Robust auto-focus without interference
    useEffect(() => {
      if (autoFocus && inputRef.current && !disabled) {
        const timer = setTimeout(() => {
          if (inputRef.current) {
            logger.debug('GratitudeInputBar: Attempting auto-focus...');
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

    const handleSubmit = () => {
      logger.debug('GratitudeInputBar: Submit button pressed', { text: inputText.trim() });
      if (inputText.trim() && !disabled) {
        hapticFeedback.light();
        submittedWhileDisabledRef.current = true;
        onSubmit(inputText.trim());
        setInputText('');

        // Keep focus for continuous input - with error handling
        setTimeout(() => {
          if (inputRef.current) {
            logger.debug('GratitudeInputBar: Re-focusing after submit');
            inputRef.current.focus();
          }
        }, 100);
      }
    };

    const handleFocus = () => {
      logger.debug('GratitudeInputBar: Input focused');
      setIsFocused(true);
    };

    const handleBlur = () => {
      logger.debug('GratitudeInputBar: Input blurred');
      setIsFocused(false);
    };

    const handleChangeText = (text: string) => {
      logger.debug('GratitudeInputBar: Text changed', { text });
      setInputText(text);
    };

    const handlePromptRefresh = () => {
      if (onRefreshPrompt) {
        onRefreshPrompt();
      }
      // Also cycle through fallback prompts for better UX
      setFallbackPromptIndex((prev) => (prev + 1) % fallbackPrompts.length);
    };

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
            <Text style={styles.mottoText}>Minnetle yeşer</Text>
          </View>
          <View style={styles.headerRight}>
            {typeof currentCount === 'number' && typeof goal === 'number' && (
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  {currentCount}/{goal} bugün
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

        {/* Enhanced Input Section with Animated Gradient Border */}
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          {/* **PERFORMANCE IMPROVED GRADIENT BORDER** */}
          <View style={styles.inputWrapper}>
            <Animated.View
              style={[
                styles.inputGradientBorderContainer,
                {
                  opacity: gradientOpacity,
                },
              ]}
            >
              <LinearGradient
                colors={[
                  theme.colors.primary,
                  theme.colors.secondary || theme.colors.primaryContainer,
                  theme.colors.tertiary || theme.colors.primary,
                  theme.colors.primary,
                ]}
                style={styles.inputGradientBorder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>

            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
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
              autoFocus={false} // We handle this manually
              // **ACCESSIBILITY IMPROVEMENTS**
              accessibilityLabel={placeholder}
              accessibilityHint="Minnettarlık ifadenizi yazın ve gönder tuşuna basın"
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.button, isButtonEnabled ? styles.buttonEnabled : styles.buttonDisabled]}
            disabled={!isButtonEnabled}
            activeOpacity={0.8}
            // **ACCESSIBILITY IMPROVEMENTS**
            accessibilityRole="button"
            accessibilityLabel={isButtonEnabled ? 'Minnet ifadesini gönder' : 'Gönderme devre dışı'}
            accessibilityHint="Yazdığınız minnettarlık ifadesini kaydetmek için dokunun"
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

        {/* Subtle Inspirational Prompt */}
        {!inputText && !isFocused && showPrompt && (
          <View style={styles.promptContainer}>
            {promptLoading ? (
              <View style={styles.promptLoadingContainer}>
                <Text style={styles.promptLoadingText}>💭 İlham verici soru yükleniyor...</Text>
              </View>
            ) : promptError ? (
              <View style={styles.promptErrorContainer}>
                <Text style={styles.promptText}>✨ {displayPrompt}</Text>
                <TouchableOpacity
                  onPress={handlePromptRefresh}
                  style={styles.refreshButton}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Yeni soru yükle"
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
                  accessibilityLabel="Yeni soru yükle"
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
