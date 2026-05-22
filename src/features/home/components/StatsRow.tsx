import React, { useMemo } from 'react';
import { type DimensionValue, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';

interface StatsRowProps {
  currentCount: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak?: number | null;
  onProgressPress?: () => void;
  onStreakPress?: () => void;
}

const ProgressCard: React.FC<{
  currentCount: number;
  dailyGoal: number;
  onPress?: () => void;
}> = React.memo(({ currentCount, dailyGoal, onPress }) => {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createCardStyles(theme), [theme]);

  const ratio = dailyGoal > 0 ? Math.min(1, Math.max(0, currentCount / dailyGoal)) : 0;
  const progressWidth = `${Math.round(ratio * 100)}%` as DimensionValue;
  const completedText = t('home.stats.completed', 'completed');
  const label = t('home.stats.dailyProgress', 'DAILY PROGRESS').toLocaleUpperCase(
    i18n.language === 'tr' ? 'tr-TR' : i18n.language
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label} ${currentCount}/${dailyGoal} ${completedText}`}
      activeOpacity={0.9}
      disabled={!onPress}
      onPress={onPress}
      style={styles.card}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.bigValue}>
          {currentCount}/{dailyGoal}
        </Text>
        <Text style={styles.completedText}>{completedText}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
    </TouchableOpacity>
  );
});
ProgressCard.displayName = 'ProgressCard';

const StreakCard: React.FC<{
  currentStreak: number;
  longestStreak?: number | null;
  onPress?: () => void;
}> = React.memo(({ currentStreak, longestStreak, onPress }) => {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useMemo(() => createCardStyles(theme), [theme]);
  const label = t('home.stats.currentStreak', 'CURRENT STREAK').toLocaleUpperCase(
    i18n.language === 'tr' ? 'tr-TR' : i18n.language
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${label} ${currentStreak}`}
      activeOpacity={0.9}
      disabled={!onPress}
      onPress={onPress}
      style={styles.card}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.streakValueRow}>
        <View style={styles.fireContainer}>
          <Icon name="fire" size={17} color={theme.colors.secondary} />
        </View>
        <Text style={styles.bigValue}>{currentStreak}</Text>
      </View>
      {typeof longestStreak === 'number' && longestStreak > 0 ? (
        <Text style={styles.longestText}>
          {t('home.stats.longestStreak', { count: longestStreak })}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});
StreakCard.displayName = 'StreakCard';

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

    return (
      <View style={styles.rowContainer}>
        <View style={styles.progressItem}>
          <ProgressCard
            currentCount={currentCount}
            dailyGoal={dailyGoal}
            onPress={onProgressPress}
          />
        </View>
        <View style={styles.streakItem}>
          <StreakCard
            currentStreak={currentStreak}
            longestStreak={longestStreak}
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
      height: 78,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.xs,
    },
    progressItem: {
      flex: 1.1,
    },
    streakItem: {
      flex: 0.9,
    },
  });

const createCardStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      height: '100%',
      borderRadius: 14,
      backgroundColor: theme.name === 'dark' ? theme.colors.surface : theme.colors.surface + 'F2',
      borderWidth: 1,
      borderColor: theme.colors.outline + (theme.name === 'dark' ? '22' : '14'),
      paddingVertical: 8,
      paddingHorizontal: 10,
      shadowColor: theme.colors.scrim,
      shadowOpacity: theme.name === 'dark' ? 0.16 : 0.04,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    label: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 1.2,
      opacity: 0.7,
      marginBottom: 2,
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
      marginBottom: 5,
    },
    bigValue: {
      fontSize: 19,
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
      color: theme.colors.onSurface,
      fontWeight: '800',
      letterSpacing: 0,
      lineHeight: 23,
    },
    completedText: {
      ...theme.typography.bodySmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 10,
    },
    progressTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.outline + (theme.name === 'dark' ? '24' : '12'),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 3,
    },
    streakValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 1,
    },
    fireContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.secondary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    longestText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.74,
      fontSize: 10,
      marginTop: 0,
    },
  });
