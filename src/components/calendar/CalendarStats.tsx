import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { CustomMarkedDates, StatCardProps } from './types';
import { calculateCalendarStats } from './utils';
import { useStreakData } from '@/features/streak/hooks';
import { useTheme } from '../../providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';

interface CalendarStatsProps {
  markedDates: CustomMarkedDates;
  currentMonth: Date;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color, isLoading = false }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surfaceVariant + '20' }]}>
      <View style={[styles.statContent, { gap: theme.spacing.xs }]}>
        {isLoading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Icon name={icon} size={20} color={color} />
        )}
        <Text
          style={[
            styles.statValue,
            theme.typography.titleMedium,
            { color: theme.colors.onSurface },
          ]}
        >
          {isLoading ? '—' : value}
        </Text>
        <Text
          style={[
            styles.statLabel,
            theme.typography.bodySmall,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
};

const CalendarStats: React.FC<CalendarStatsProps> = ({
  markedDates,
  currentMonth,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const { data: streakData, isLoading: streakLoading } = useStreakData();
  const stats = calculateCalendarStats(markedDates, currentMonth);

  // Use real streak data instead of local calculation
  const currentStreak = streakData?.current_streak ?? 0;
  const isStreakDataLoading = isLoading || streakLoading;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline + '10',
          borderBottomColor: theme.colors.outline + '10',
          ...getPrimaryShadow.card(theme),
        },
      ]}
    >
      <View
        style={[
          styles.statsGrid,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
            gap: theme.spacing.sm,
          },
        ]}
      >
        <StatCard
          icon="calendar-check"
          value={stats.entryCount}
          label="Gün"
          color={theme.colors.primary}
          isLoading={isLoading}
        />
        <StatCard
          icon="fire"
          value={currentStreak}
          label="Seri"
          color={theme.colors.tertiary}
          isLoading={isStreakDataLoading}
        />
        <StatCard
          icon="trending-up"
          value={`%${Math.round(stats.completionRate)}`}
          label="Oran"
          color={theme.colors.secondary}
          isLoading={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Edge-to-Edge Stats Container
  container: {
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Individual stat items without shadows - use background variation
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default CalendarStats;
