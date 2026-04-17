import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getCurrentLocale } from '@/utils/localeUtils';

interface PastEntriesHeaderProps {
  title: string;
  subtitle?: string;
  entryCount?: number;
}

const PastEntriesHeader: React.FC<PastEntriesHeaderProps> = ({ title, subtitle, entryCount }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  const getSubtitleText = () => {
    if (subtitle) {
      return subtitle;
    }
    if (entryCount !== undefined) {
      const lastUpdate = new Date().toLocaleDateString(getCurrentLocale(), {
        day: 'numeric',
        month: 'long',
      });
      return t('pastEntries.header.lastUpdate', { date: lastUpdate });
    }
    return undefined;
  };

  const getStatsData = () => {
    if (entryCount === undefined) {
      return null;
    }

    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const monthlyGoal = Math.floor(daysInMonth * 0.8);
    const monthlyProgress = Math.min((entryCount / monthlyGoal) * 100, 100);
    const isOnTrack = monthlyProgress >= (dayOfMonth / daysInMonth) * 100;
    const remaining = Math.max(monthlyGoal - entryCount, 0);

    return {
      total: entryCount,
      monthlyProgress: Math.round(monthlyProgress),
      isOnTrack,
      remaining,
    };
  };

  const stats = getStatsData();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.label}>{t('pastEntries.header.label', 'HISTORY')}</Text>
          <Text style={styles.title}>{title}</Text>
          {getSubtitleText() && <Text style={styles.subtitle}>{getSubtitleText()}</Text>}
        </View>
      </View>

      {/* Stats Row - Unified card style */}
      {/* Stats Row - Subtle tonal style */}
      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statsInner}>
            {/* Total */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statTitle}>{t('pastEntries.header.total')}</Text>
            </View>

            <View style={styles.verticalDivider} />

            {/* Monthly Progress */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.monthlyProgress}%</Text>
              <Text style={styles.statTitle}>{t('pastEntries.header.monthly')}</Text>
            </View>
          </View>

          <View style={styles.progressBarWrapper}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stats.monthlyProgress}%` }]} />
            </View>
          </View>
        </View>
      )}

      {/* Mascot perfectly resting on the card */}
      <View style={styles.mascotContainer}>
        <Image
          source={require('@/assets/assets/mascot2.png')}
          style={styles.mascotImage}
          contentFit="contain"
          transition={400}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xxxl,
    },
    header: {
      marginBottom: theme.spacing.lg,
    },
    headerContent: {
      paddingRight: 110,
    },
    mascotContainer: {
      position: 'absolute',
      right: -20,
      top: 40,
      width: 180,
      height: 180,
      zIndex: 10,
    },
    mascotImage: {
      width: '100%',
      height: '100%',
    },
    label: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 2,
      marginBottom: 8,
      textTransform: 'uppercase',
      opacity: 0.8,
    },
    title: {
      ...theme.typography.displaySmall,
      color: theme.colors.onBackground,
      fontFamily: 'Lora-Bold',
      fontSize: 34,
      lineHeight: 40,
      marginBottom: 6,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      opacity: 0.7,
    },
    statsCard: {
      backgroundColor: theme.colors.surface + '60',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    statsInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      marginBottom: theme.spacing.xs,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statTitle: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginTop: 0,
      fontSize: 8.5,
      opacity: 0.8,
    },
    statValue: {
      ...theme.typography.titleLarge,
      color: theme.colors.primary,
      fontFamily: 'Lora-Bold',
      fontSize: 18,
    },
    verticalDivider: {
      width: 1,
      height: 16,
      backgroundColor: theme.colors.outline + '10',
    },
    progressBarWrapper: {
      paddingHorizontal: theme.spacing.xs,
    },
    progressBar: {
      height: 3,
      backgroundColor: theme.colors.outline + '08',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
    },
  });

export default PastEntriesHeader;
