import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
        <Text style={styles.label}>{t('pastEntries.header.label', 'HISTORY')}</Text>
        <Text style={styles.title}>{title}</Text>
        {getSubtitleText() && <Text style={styles.subtitle}>{getSubtitleText()}</Text>}
      </View>

      {/* Stats Row - Unified card style */}
      {stats && (
        <View style={styles.statsCard}>
          {/* Total */}
          <View style={styles.statRow}>
            <View style={styles.statIconContainer}>
              <Icon name="notebook-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statTitle}>{t('pastEntries.header.total')}</Text>
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Monthly Progress */}
          <View style={styles.statRow}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: theme.colors.secondaryContainer },
              ]}
            >
              <Icon name="chart-line" size={18} color={theme.colors.secondary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statTitle}>{t('pastEntries.header.monthly')}</Text>
              <Text style={styles.statValue}>{stats.monthlyProgress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${stats.monthlyProgress}%` }]} />
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xl,
    },
    header: {
      marginBottom: theme.spacing.md,
    },
    label: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    title: {
      ...theme.typography.displaySmall,
      color: theme.colors.onBackground,
      fontWeight: '700',
      fontFamily: 'Lora-Bold',
      marginBottom: 4,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
    },
    statsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      overflow: 'hidden',
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    statIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statTextContainer: {
      flex: 1,
    },
    statTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    statValue: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    progressBarContainer: {
      width: 60,
    },
    progressBar: {
      height: 4,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginLeft: theme.spacing.md + 32 + theme.spacing.sm,
    },
  });

export default PastEntriesHeader;
