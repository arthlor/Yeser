import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { STATIC_DEFAULT_PROMPT } from '@/store/promptStore';
import { AppTheme } from '@/themes/types';

interface DailyEntryPromptProps {
  promptText: string | null;
  isLoading: boolean;
  error: string | null;
  isToday: boolean;
  useVariedPrompts: boolean;
  onRefreshPrompt?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

// Curated inspiration prompts
const INSPIRATION_PROMPTS = [
  'Bugün hangi küçük anlar seni gülümsetti?',
  'Şu anda hayatında olan hangi kişiler için minnettarsın?',
  'Hangi duyular bugün seni mutlu etti?',
  'Doğada gözlemlediğin güzel bir şey var mı?',
  'Kendinde takdir ettiğin bir özellik nedir?',
];

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

  // State for managing prompts
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [availablePrompts, setAvailablePrompts] = useState<string[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  // Initialize prompts
  useEffect(() => {
    if (isToday && useVariedPrompts && promptText) {
      setAvailablePrompts([promptText, ...INSPIRATION_PROMPTS.slice(0, 3)]);
    } else if (isToday) {
      setAvailablePrompts(INSPIRATION_PROMPTS);
    } else {
      setAvailablePrompts([STATIC_DEFAULT_PROMPT]);
    }
    setCurrentPromptIndex(0);
  }, [promptText, isToday, useVariedPrompts]);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNext = () => {
    if (availablePrompts.length <= 1) return;

    const newIndex = currentPromptIndex < availablePrompts.length - 1 ? currentPromptIndex + 1 : 0;
    setCurrentPromptIndex(newIndex);

    // Subtle animation for prompt change
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleRefresh = () => {
    if (onRefreshPrompt) {
      onRefreshPrompt();
    }
  };

  const currentPrompt = availablePrompts[currentPromptIndex] || STATIC_DEFAULT_PROMPT;
  const hasMultiplePrompts = availablePrompts.length > 1;

  if (isLoading) {
    return (
      <Animated.View style={[styles.container, styles.loadingContainer, { opacity: fadeAnim }]}>
        <View style={styles.loadingContent}>
          <Icon name="lightbulb-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.loadingText}>İlham getiriliyor...</Text>
        </View>
      </Animated.View>
    );
  }

  if (error) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>İlham yüklenemedi</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.promptCard}>
        {/* Header */}
        <View style={styles.promptHeader}>
          <View style={styles.headerLeft}>
            <Icon
              name="lightbulb"
              size={16}
              color={theme.colors.primary}
              style={styles.lightbulbIcon}
            />
            <Text style={styles.promptTitle}>İlham</Text>
          </View>

          {/* Actions */}
          <View style={styles.headerActions}>
            {hasMultiplePrompts && (
              <TouchableOpacity onPress={handleNext} style={styles.actionButton}>
                <Icon name="shuffle-variant" size={16} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}

            {isToday && useVariedPrompts && onRefreshPrompt && (
              <TouchableOpacity onPress={handleRefresh} style={styles.actionButton}>
                <Icon name="refresh" size={16} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Prompt text */}
        <TouchableOpacity
          onPress={hasMultiplePrompts ? handleNext : undefined}
          style={styles.promptTextContainer}
          activeOpacity={hasMultiplePrompts ? 0.7 : 1}
        >
          <Text style={styles.promptText}>{currentPrompt}</Text>
        </TouchableOpacity>

        {/* Indicator dots for multiple prompts */}
        {hasMultiplePrompts && (
          <View style={styles.dotsContainer}>
            {availablePrompts.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentPromptIndex && styles.activeDot]}
              />
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
    },
    promptCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      padding: theme.spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    promptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    lightbulbIcon: {
      marginRight: theme.spacing.xs,
    },
    promptTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.2,
    },
    headerActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    actionButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surfaceVariant + '60',
    },
    promptTextContainer: {
      paddingVertical: theme.spacing.xs,
    },
    promptText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.onSurface,
      lineHeight: 22,
      letterSpacing: 0.1,
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.outline,
      opacity: 0.4,
    },
    activeDot: {
      backgroundColor: theme.colors.primary,
      opacity: 1,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    loadingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
    },
    loadingText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
    },
    errorContent: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    errorText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.error,
      marginBottom: theme.spacing.sm,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.borderRadius.md,
    },
    retryText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onErrorContainer,
    },
  });

export default DailyEntryPrompt;
