import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedButton from '@/shared/components/ui/ThemedButton';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DailyEntryPromptProps {
  promptText: string;
  isLoading: boolean;
  error: string | null;
  isToday: boolean;
  useVariedPrompts: boolean;
  onRefreshPrompt?: () => void;
}

const DailyEntryPrompt: React.FC<DailyEntryPromptProps> = ({
  promptText,
  isLoading,
  error,
  isToday,
  useVariedPrompts,
  onRefreshPrompt,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Static fallback prompts for when varied prompts are disabled
  const fallbackPrompts = [
    'Bugün seni mutlu eden üç şey neydi?',
    'Hangi anlardan dolayı minnettar hissediyorsun?',
    'Bugün hayatında olan güzel şeyler neler?',
    'Seni gülümsetmiş olan anları düşün...',
    'Bugün hangi deneyimler için şükrediyorsun?',
  ];

  // Display current prompt or fallback
  const displayPrompt = promptText || fallbackPrompts[currentPromptIndex];

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleNextPrompt = useCallback(() => {
    if (promptText) {
      setCurrentPromptIndex((prevIndex) => (prevIndex + 1) % fallbackPrompts.length);
    }
  }, [promptText, fallbackPrompts.length]);

  // Auto-advance prompts periodically (only if varied prompts not enabled)
  useEffect(() => {
    if (!useVariedPrompts && isToday && !error) {
      const interval = setInterval(() => {
        handleNextPrompt();
      }, 30000); // Change prompt every 30 seconds

      return () => clearInterval(interval);
    }
  }, [useVariedPrompts, isToday, error, handleNextPrompt]);

  const handleNext = () => {
    handleNextPrompt();
  };

  const handleRefresh = () => {
    if (onRefreshPrompt) {
      onRefreshPrompt();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="lightbulb-on" size={20} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>İlham verici soru yükleniyor...</Text>
            </View>
          </View>
          <View style={styles.loadingContent}>
            <Text style={styles.loadingText}>Kişiselleştirilmiş içerik hazırlanıyor...</Text>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={styles.title}>Bağlantı sorunu</Text>
            </View>
          </View>
          <View style={styles.errorContent}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryText}>Tekrar dene</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="lightbulb-on" size={20} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>İlham verici soru</Text>
            </View>
            <View style={styles.headerRight}>
              {!useVariedPrompts && (
                <Text style={styles.promptCounter}>
                  {currentPromptIndex + 1}/{fallbackPrompts.length}
                </Text>
              )}
            </View>
          </View>

          {/* Prompt Content */}
          <View style={styles.promptContent}>
            <Text style={styles.promptText}>{displayPrompt}</Text>
          </View>

          {/* Navigation */}
          <View style={styles.navigationContainer}>
            <View style={styles.navigationButtons}>
              {!useVariedPrompts && (
                <View style={styles.buttonWrapper}>
                  <ThemedButton
                    title="Sonraki soru"
                    onPress={handleNext}
                    iconRight="chevron-right"
                    variant="ghost"
                    size="compact"
                  />
                </View>
              )}

              {useVariedPrompts && onRefreshPrompt && isToday && (
                <View style={styles.buttonWrapper}>
                  <ThemedButton
                    title="Yeni soru"
                    onPress={handleRefresh}
                    iconRight="refresh"
                    variant="ghost"
                    size="compact"
                  />
                </View>
              )}
            </View>

            {!useVariedPrompts && (
              <Text style={styles.swipeHint}>💡 Sorular otomatik olarak değişir</Text>
            )}
          </View>

          {/* Refresh hint for varied prompts */}
          {useVariedPrompts && onRefreshPrompt && (
            <View style={styles.refreshContainer}>
              <Text style={styles.swipeHint}>✨ Yeni kişiselleştirilmiş soru için yenile</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Edge-to-edge container following StatementCard pattern
    container: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '15',
      borderBottomColor: theme.colors.outline + '15',
      overflow: 'hidden',
      ...getPrimaryShadow.small(theme),
    },
    animatedContainer: {
      marginBottom: theme.spacing.lg,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    promptCounter: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    promptContent: {
      marginBottom: theme.spacing.lg,
    },
    promptText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.primary,
      lineHeight: 24,
      textAlign: 'center',
      fontStyle: 'italic',
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    navigationContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    navigationButtons: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      justifyContent: 'center',
    },
    buttonWrapper: {
      minWidth: 120,
      flexShrink: 0,
    },
    swipeHint: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.7,
    },
    refreshContainer: {
      alignItems: 'center',
    },
    title: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    loadingContent: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    loadingText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
    },
    errorContent: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    errorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    retryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.errorContainer,
    },
    retryText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onErrorContainer,
      fontWeight: '600',
    },
  });

export default DailyEntryPrompt;
