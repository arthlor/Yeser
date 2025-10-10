import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useTranslation } from 'react-i18next';

interface InspirationCardProps {
  currentCount: number;
  dailyGoal: number;
}

// 🎯 More focused, gratitude-centric tips
const GRATITUDE_TIPS = [
  'tips.gratitude.detail',
  'tips.gratitude.challenge',
  'tips.gratitude.simpleThings',
  'tips.gratitude.people',
  'tips.gratitude.selfCompassion',
  'tips.gratitude.nature',
  'tips.gratitude.body',
  'tips.gratitude.pastPresent',
];

const InspirationCard: React.FC<InspirationCardProps> = React.memo(
  ({ currentCount, dailyGoal }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);
    const { t } = useTranslation();

    // Select content based on user's daily progress
    const cardContent = useMemo(() => {
      if (currentCount === 0) {
        return {
          icon: 'play-circle-outline' as const,
          iconColor: theme.colors.primary,
          title: t('home.inspiration.progress.start.title'),
          message: t('home.inspiration.progress.start.message'),
        };
      }
      if (currentCount >= dailyGoal) {
        return {
          icon: 'trophy-outline' as const,
          iconColor: theme.colors.secondary,
          title: t('home.inspiration.progress.complete.title'),
          message: t('home.inspiration.progress.complete.message'),
        };
      }
      // When in progress, show a random gratitude tip
      const randomTipKey = GRATITUDE_TIPS[Math.floor(Math.random() * GRATITUDE_TIPS.length)];
      return {
        icon: 'bulb-outline' as const,
        iconColor: theme.colors.tertiary,
        title: t('tips.gratitude.title'),
        message: t(randomTipKey),
      };
    }, [currentCount, dailyGoal, t, theme.colors]);

    return (
      <View style={styles.container}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: cardContent.iconColor + '20' }]}>
            <Ionicons name={cardContent.icon} size={22} color={cardContent.iconColor} />
          </View>
          <Text style={styles.cardTitle}>{cardContent.title}</Text>
        </View>
        <Text style={styles.cardMessage}>"{cardContent.message}"</Text>
      </View>
    );
  }
);

InspirationCard.displayName = 'InspirationCard';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      marginBottom: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    cardTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      flex: 1, // Allow title to wrap
    },
    cardMessage: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      lineHeight: 20,
    },
  });

export default InspirationCard;
