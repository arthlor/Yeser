import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { CustomMarkedDates, StatCardProps } from './types';
import { calculateCalendarStats } from './utils';
import { useStreakData } from '@/features/streak/hooks';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

interface CalendarStatsProps {
  markedDates: CustomMarkedDates;
  currentMonth: Date;
  isLoading?: boolean;
}

const StatItem: React.FC<StatCardProps & { showDivider?: boolean }> = ({
  icon,
  value,
  label,
  color,
  isLoading = false,
  showDivider = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <>
      <View style={styles.statItem}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          {isLoading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Icon name={icon} size={18} color={color} />
          )}
        </View>
        <Text style={styles.statValue}>{isLoading ? '—' : value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      {showDivider && <View style={styles.divider} />}
    </>
  );
};

const CalendarStats: React.FC<CalendarStatsProps> = ({
  markedDates,
  currentMonth,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const { data: streakData, isLoading: streakLoading } = useStreakData();
  const stats = calculateCalendarStats(markedDates, currentMonth);

  const currentStreak = streakData?.current_streak ?? 0;
  const isStreakDataLoading = isLoading || streakLoading;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <StatItem
          icon="calendar-check"
          value={stats.entryCount}
          label={t('shared.calendar.stats.daysLabel')}
          color={theme.colors.primary}
          isLoading={isLoading}
          showDivider
        />
        <StatItem
          icon="fire"
          value={currentStreak}
          label={t('shared.calendar.stats.streakLabel')}
          color={theme.colors.tertiary}
          isLoading={isStreakDataLoading}
          showDivider
        />
        <StatItem
          icon="trending-up"
          value={`%${Math.round(stats.completionRate)}`}
          label={t('shared.calendar.stats.rateLabel')}
          color={theme.colors.secondary}
          isLoading={isLoading}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      paddingVertical: theme.spacing.md,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    statLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
    },
    divider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.outline + '20',
    },
  });

export default CalendarStats;
