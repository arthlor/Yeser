import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { logger } from '@/utils/debugConfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
}

const GratitudeInputBar: React.FC<GratitudeInputBarProps> = ({
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
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, disabled);
  const inputRef = useRef<TextInput>(null);

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [fallbackPromptIndex, setFallbackPromptIndex] = useState(0);

  // Animation values for enhanced interactivity
  const gradientAnim = useRef(new Animated.Value(0)).current;

  // Fallback prompts for when varied prompts are disabled or unavailable
  const fallbackPrompts = [
    'Bugün hangi güzel anlar için şükrediyorsun?',
    'Hayatındaki hangi kişiler seni mutlu ediyor?',
    'Bugün seni gülümsetmiş olan şeyler neler?',
    'Hangi deneyimler için minnettar hissediyorsun?',
    'Bugün yaşadığın pozitif anları düşün...',
  ];

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

  // Removed pulse animation for cleaner UX

  // Gradient animation for focus state
  useEffect(() => {
    Animated.timing(gradientAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isFocused, gradientAnim]);

  const handleSubmit = () => {
    logger.debug('GratitudeInputBar: Submit button pressed', { text: inputText.trim() });
    if (inputText.trim() && !disabled) {
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

  const isButtonEnabled = inputText.trim().length > 0 && !disabled;

  // Determine which prompt to display
  const displayPrompt = promptText || fallbackPrompts[fallbackPromptIndex];

  return (
    <View style={styles.container}>
      {/* Striking Header Section with Gradient Background */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="heart-plus" size={24} color={theme.colors.onPrimary} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Minnet Ekle</Text>
            <Text style={styles.headerSubtitle}>Bugün minnettarlık hissettiğin anları paylaş</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.characterCountContainer}>
            <Text style={styles.characterCount}>{inputText.length}/500</Text>
          </View>
        </View>
      </View>

      {/* Enhanced Input Section with Gradient Border */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: gradientAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [theme.colors.outline + '40', theme.colors.primary + '80'],
            }),
            backgroundColor: gradientAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [
                theme.colors.surfaceVariant + '30',
                theme.colors.primaryContainer + '20',
              ],
            }),
          },
        ]}
      >
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
        />

        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.button, isButtonEnabled ? styles.buttonEnabled : styles.buttonDisabled]}
          disabled={!isButtonEnabled}
          activeOpacity={0.8}
        >
          <Icon
            name={isButtonEnabled ? 'send' : 'send-outline'}
            size={20}
            color={isButtonEnabled ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>
      </Animated.View>

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
              >
                <Icon name="refresh" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={16} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme, disabled: boolean = false) =>
  StyleSheet.create({
    // Enhanced edge-to-edge container with striking design
    container: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderTopColor: theme.colors.primary + '20',
      borderBottomColor: theme.colors.primary + '20',
      overflow: 'hidden',
      opacity: disabled ? 0.6 : 1,
      ...getPrimaryShadow.card(theme),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      backgroundColor: `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.primaryContainer}25)`,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      flex: 1,
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
    titleContainer: {
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      fontWeight: '700',
      marginBottom: 2,
    },
    headerSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '400',
      opacity: 0.8,
    },
    characterCountContainer: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    characterCount: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
      minHeight: 100,
      borderWidth: 2,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
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
      borderColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      textAlignVertical: 'top',
      lineHeight: 26,
      fontWeight: '400',
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
    // Subtle prompt styles
    promptContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primaryContainer + '15',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
    },
    promptLoadingContainer: {
      alignItems: 'center',
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
    },
    promptActiveContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    promptText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      flex: 1,
      marginRight: theme.spacing.sm,
      fontWeight: '400',
      lineHeight: 18,
    },
    refreshButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    errorText: {
      ...theme.typography.labelMedium,
      color: theme.colors.error,
      fontWeight: '500',
      flex: 1,
    },
  });

export default GratitudeInputBar;
