import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { TFunction } from 'i18next';

interface StatsRowProps {
  currentCount: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak?: number | null;
  onProgressPress?: () => void;
  onStreakPress?: () => void;
}

const MiniStatCard: React.FC<{
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  subtitle?: string;
  onPress?: () => void;
}> = React.memo(({ icon, iconColor, title, value, subtitle, onPress }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createMiniStyles(theme), [theme]);

  return (
    <ThemedCard
      variant="elevated"
      density="compact"
      elevation="xs"
      onPress={onPress}
      touchableProps={{ activeOpacity: 0.85 }}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
          <Icon name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <Text style={styles.value}>{value}</Text>
      </View>
    </ThemedCard>
  );
});

MiniStatCard.displayName = 'MiniStatCard';

const ProgressMiniCard: React.FC<{
  currentCount: number;
  dailyGoal: number;
  onPress?: () => void;
  t: TFunction;
}> = React.memo(({ currentCount, dailyGoal, onPress, t }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createMiniStyles(theme), [theme]);

  const progressLabel = `${currentCount}/${dailyGoal}`;
  const ratio = dailyGoal > 0 ? Math.min(1, Math.max(0, currentCount / dailyGoal)) : 0;

  return (
    <ThemedCard
      variant="elevated"
      density="compact"
      elevation="xs"
      onPress={onPress}
      touchableProps={{ activeOpacity: 0.85 }}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + '22' }]}>
          <Icon name="check-circle" size={16} color={theme.colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {t('home.stats.dailyProgress')}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
          </View>
        </View>
        <Text style={styles.value}>{progressLabel}</Text>
      </View>
    </ThemedCard>
  );
});

ProgressMiniCard.displayName = 'ProgressMiniCard';

const StatsRow: React.FC<StatsRowProps> = React.memo(
  ({
    currentCount,
    dailyGoal,
    currentStreak,
    longestStreak = null,
    onProgressPress,
    onStreakPress,
  }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createRowStyles(theme), [theme]);
    const { t } = useTranslation();

    return (
      <View style={styles.rowContainer}>
        <View style={styles.item}>
          <ProgressMiniCard
            t={t}
            currentCount={currentCount}
            dailyGoal={dailyGoal}
            onPress={onProgressPress}
          />
        </View>
        <View style={styles.item}>
          <MiniStatCard
            icon="fire"
            iconColor={theme.colors.secondary}
            title={t('home.stats.currentStreak')}
            value={`${currentStreak}`}
            subtitle={
              typeof longestStreak === 'number' && longestStreak > 0
                ? t('home.stats.longestStreak', { count: longestStreak })
                : undefined
            }
            onPress={onStreakPress}
          />
        </View>
      </View>
    );
  }
);

StatsRow.displayName = 'StatsRow';

export default StatsRow;

const createRowStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    rowContainer: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    item: {
      flex: 1,
    },
  });

const createMiniStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.borderRadius.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 60,
    },
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texts: {
      flex: 1,
      marginHorizontal: theme.spacing.xs,
    },
    title: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
    },
    subtitle: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
    },
    value: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
      marginLeft: theme.spacing.xs,
    },
    progressBar: {
      height: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.outline + '30',
      overflow: 'hidden',
      marginTop: 4,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
    },
  });
