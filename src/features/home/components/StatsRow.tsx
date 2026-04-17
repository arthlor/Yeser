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
      elevation="none"
      onPress={onPress}
      touchableProps={{ activeOpacity: 0.9 }}
      style={styles.card}
    >
      <View style={styles.contentWrap}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: iconColor + (theme.name === 'dark' ? '25' : '15') },
          ]}
        >
          <Icon name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.textStack}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title.replace('DAILY ', '').replace('DAILY', '')}
          </Text>
          <View style={styles.valueRow}>
            <Text style={styles.cardValue}>{value}</Text>
            {!!subtitle && (
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
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
      elevation="none"
      onPress={onPress}
      touchableProps={{ activeOpacity: 0.9 }}
      style={styles.card}
    >
      <View style={styles.contentWrap}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: theme.colors.primary + (theme.name === 'dark' ? '25' : '15') },
          ]}
        >
          <Icon name="check-circle" size={16} color={theme.colors.primary} />
        </View>
        <View style={styles.textStack}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {t('home.stats.dailyProgress').replace('DAILY ', '').replace('DAILY', '')}
          </Text>
          <View style={styles.valueRow}>
            <Text style={styles.cardValue}>{progressLabel}</Text>
            <View style={styles.progressInlineWrapper}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
              </View>
            </View>
          </View>
        </View>
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
      gap: theme.spacing.sm,
    },
    item: {
      flex: 1,
    },
  });

const createMiniStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline + '10',
      paddingVertical: 10,
      paddingHorizontal: 10,
      shadowColor: '#000',
      shadowOpacity: theme.name === 'dark' ? 0.25 : 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    contentWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconContainer: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textStack: {
      flex: 1,
      justifyContent: 'center',
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      marginTop: -2,
    },
    cardTitle: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      opacity: 0.5,
      marginBottom: 0,
    },
    cardSubtitle: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
      fontSize: 10,
    },
    cardValue: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    progressInlineWrapper: {
      flex: 1,
      height: 4,
      justifyContent: 'center',
      marginLeft: 4,
      maxWidth: 40,
    },
    progressBar: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outline + '10',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
  });
