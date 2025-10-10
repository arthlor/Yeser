import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTranslation } from 'react-i18next';
import { createAdvancedMilestones } from '@/features/streak/components/AdvancedStreakMilestones';

interface StreakMiniCardProps {
  current: number;
  longest?: number | null;
  onPress?: () => void;
}

const StreakMiniCard: React.FC<StreakMiniCardProps> = React.memo(
  ({ current, longest, onPress }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { t } = useTranslation();

    const { nextTitle, daysToNext, progressPercent } = useMemo(() => {
      const milestones = createAdvancedMilestones(t);
      const next = milestones.find((m) => current < m.minDays) || null;
      const prev = [...milestones].reverse().find((m) => current >= m.minDays) || milestones[0];

      const nextTitleCalc = next
        ? next.title
        : t('streak.details.longestRecord', { defaultValue: 'Keep it up!' });
      const daysLeft = next ? Math.max(0, next.minDays - current) : 0;
      const denom = next ? Math.max(1, next.minDays - prev.minDays) : 1;
      const numer = next ? Math.max(0, current - prev.minDays) : 1;
      const percent = Math.min(100, Math.max(0, (numer / denom) * 100));

      return { nextTitle: nextTitleCalc, daysToNext: daysLeft, progressPercent: percent };
    }, [current, t]);

    return (
      <ThemedCard
        variant="elevated"
        density="compact"
        elevation="xs"
        onPress={onPress}
        touchableProps={{ activeOpacity: 0.85 }}
        style={styles.edgeCard}
      >
        <View style={styles.row}>
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              <Icon name="fire" size={16} color={theme.colors.secondary} />
            </View>
            <View>
              <Text style={styles.title}>
                {t('streak.details.stats.current', { defaultValue: 'Current Streak' })}
              </Text>
              <Text style={styles.miniSub} numberOfLines={1}>
                {daysToNext > 0
                  ? t('streak.details.nextTarget', { defaultValue: 'Next Target' }) +
                    `: ${nextTitle} (${daysToNext}` +
                    ` ${t('streak.details.daysLeft', { defaultValue: 'days left' })})`
                  : t('streak.motivation.momentum', { defaultValue: 'Momentum!' })}
              </Text>
            </View>
          </View>
          <View style={styles.right}>
            <Text style={styles.value}>{current}</Text>
            {typeof longest === 'number' && longest > 0 && (
              <Text style={styles.sub}>
                {t('streak.details.longestRecord', {
                  days: longest,
                  defaultValue: `Longest record: ${longest} days`,
                })}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.barContainer}>
          <View style={[styles.barFill, { width: `${progressPercent}%` }]} />
        </View>
      </ThemedCard>
    );
  }
);

StreakMiniCard.displayName = 'StreakMiniCard';

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 68,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.secondaryContainer,
    },
    title: { ...theme.typography.labelLarge, color: theme.colors.onSurface },
    right: { alignItems: 'flex-end' },
    value: { ...theme.typography.titleMedium, color: theme.colors.primary, fontWeight: '800' },
    sub: { ...theme.typography.labelSmall, color: theme.colors.onSurfaceVariant },
    miniSub: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      maxWidth: 200,
    },
    barContainer: {
      height: 4,
      backgroundColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      marginTop: theme.spacing.xs,
    },
    barFill: {
      height: '100%',
      backgroundColor: theme.colors.secondary,
      borderRadius: theme.borderRadius.full,
    },
    edgeCard: {
      borderRadius: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
      borderBottomColor: theme.colors.outline + '20',
    },
  });

export default StreakMiniCard;
