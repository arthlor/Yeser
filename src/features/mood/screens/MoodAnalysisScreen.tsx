import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { ScreenHeader, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ErrorState from '@/shared/components/ui/ErrorState';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import SegmentedControl from '@/shared/components/ui/SegmentedControl';
import DonutChart from '@/shared/components/ui/DonutChart';
import { useTheme } from '@/providers/ThemeProvider';
import { useMoodAnalytics } from '../hooks';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import { useSubscription } from '@/hooks/useSubscription';
import { analyticsService } from '@/services/analyticsService';
import type { AppStackParamList } from '@/types/navigation';
import type { MoodAnalyticsRange, MoodAnalyticsResponse } from '@/types/moodAnalytics.types';
import type { MoodEmoji } from '@/types/mood.types';
import { MOOD_EMOJIS } from '@/types/mood.types';
import type { Streak } from '@/schemas/streakSchema';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';

type MoodAnalysisNavigationProp = NativeStackNavigationProp<AppStackParamList, 'MoodAnalysis'>;

interface MoodDistributionItem {
  mood: MoodEmoji;
  count: number;
  percentage: number;
}

const DEFAULT_RANGE: MoodAnalyticsRange = '90d';
const RANGE_OPTIONS: MoodAnalyticsRange[] = ['7d', '30d', '90d', '365d'];

// Chart color palette for mood distribution
const CHART_COLORS = [
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#a855f7', // Purple
  '#eab308', // Yellow
];

const MoodAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<MoodAnalysisNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedRange, setSelectedRange] = useState<MoodAnalyticsRange>(DEFAULT_RANGE);
  const { data, error, isLoading, isRefetching, refetch, totals } = useMoodAnalytics(selectedRange);

  const rangeOptions = useMemo(
    () =>
      RANGE_OPTIONS.map((value) => ({
        value,
        label: t(`mood.analysis.range.${value}`),
      })),
    [t]
  );
  const { data: streak, isLoading: streakLoading } = useStreakData();
  useSubscription(); // Used elsewhere, but canUseInsights not needed here

  const hasAnalytics = Boolean(data && data.overview.totalEntries > 0);
  const narrativeHeadings = useMemo(() => getNarrativeHeadings(t), [t]);
  const narrative = useMemo(() => (data ? buildNarrativeCopy({ data, t }) : null), [data, t]);

  const distribution = useMemo<MoodDistributionItem[]>(() => {
    if (!data) {
      return [];
    }
    return [...data.moodCounts].sort((a, b) => b.percentage - a.percentage);
  }, [data]);

  const dominantMoodLabel = useMemo(() => {
    if (!data?.overview.dominantMood) {
      return t('mood.analysis.overview.noDominantMood');
    }
    return t(`mood.analysis.moods.${data.overview.dominantMood}`, {
      defaultValue: data.overview.dominantMood,
    });
  }, [data?.overview.dominantMood, t]);

  const balanceLabel = useMemo(() => {
    if (!data) {
      return '';
    }
    return t(`mood.analysis.balance.${data.overview.balanceScore.label}`);
  }, [data, t]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    analyticsService.logEvent('mood_analysis_refetch');
    void refetch();
  }, [refetch]);

  if (isLoading && !data) {
    return (
      <ScreenLayout edges={['top']} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={t('mood.analysis.title')}
          subtitle={t('mood.analysis.subtitle')}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View style={styles.stateWrapper}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            accessibilityLabel={t('mood.analysis.loading')}
          />
        </View>
      </ScreenLayout>
    );
  }

  if (error && !data) {
    return (
      <ScreenLayout edges={['top']} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={t('mood.analysis.title')}
          subtitle={t('mood.analysis.subtitle')}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View style={styles.stateWrapper}>
          <ErrorState error={error} onRetry={() => void refetch()} compact />
        </View>
      </ScreenLayout>
    );
  }

  if (!hasAnalytics) {
    return (
      <ScreenLayout edges={['top']} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={t('mood.analysis.title')}
          subtitle={t('mood.analysis.subtitle')}
          showBackButton
          onBackPress={handleBackPress}
        />
        <View style={styles.emptyWrapper}>
          <ThemedCard variant="outlined" density="comfortable" elevation="card">
            <Text style={styles.emptyTitle}>{t('mood.analysis.empty.title')}</Text>
            <Text style={styles.emptyMessage}>{t('mood.analysis.empty.message')}</Text>
            <ThemedButton
              title={t('mood.analysis.empty.cta')}
              iconLeft="pencil"
              variant="primary"
              onPress={() =>
                navigation.navigate('MainAppTabs', {
                  screen: 'DailyEntryTab',
                })
              }
              style={styles.emptyButton}
            />
          </ThemedCard>
        </View>
      </ScreenLayout>
    );
  }

  if (!data || !narrative) {
    return null;
  }

  return (
    <ScreenLayout
      edges={['top']}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
      backgroundColor={theme.colors.background}
      density="comfortable"
    >
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <Text style={styles.headerLabel}>{t('mood.analysis.label', 'INSIGHTS')}</Text>
        <Text style={styles.headerTitle}>{t('mood.analysis.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('mood.analysis.subtitle')}</Text>
      </View>

      {/* Date Range Selector */}
      <View style={styles.rangeSelector}>
        <SegmentedControl
          options={rangeOptions}
          selectedValue={selectedRange}
          onValueChange={setSelectedRange}
          disabled={isLoading || isRefetching}
        />
      </View>

      <ScreenSection spacing="large" variant="minimal">
        <OverviewSection
          data={data}
          totals={totals}
          dominantMoodLabel={dominantMoodLabel}
          balanceLabel={balanceLabel}
          t={t}
          styles={styles}
        />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.sections.streak.title')}
        subtitle={t('mood.analysis.sections.streak.subtitle')}
      >
        <StreakSection
          streak={streak ?? null}
          isLoading={streakLoading}
          t={t}
          styles={styles}
          theme={theme}
        />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.moodStreak.title')}
        subtitle={t('mood.analysis.moodStreak.subtitle')}
      >
        <MoodStreakSection data={data} t={t} styles={styles} theme={theme} />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.comparison.title')}
        subtitle={t('mood.analysis.comparison.subtitle')}
      >
        <ComparisonSection data={data} t={t} styles={styles} theme={theme} />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.sections.distribution.title')}
        subtitle={t('mood.analysis.sections.distribution.subtitle')}
      >
        <DistributionSection distribution={distribution} styles={styles} t={t} theme={theme} />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.sections.trend.title')}
        subtitle={t('mood.analysis.sections.trend.subtitle')}
      >
        <TrendSection data={data} styles={styles} t={t} />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.correlation.title')}
        subtitle={t('mood.analysis.correlation.subtitle')}
      >
        <CorrelationSection data={data} t={t} styles={styles} theme={theme} />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.sections.highlighted.title')}
        subtitle={t('mood.analysis.sections.highlighted.subtitle')}
      >
        <HighlightsSection data={data} styles={styles} t={t} />
      </ScreenSection>

      <ScreenSection
        spacing="large"
        title={t('mood.analysis.sections.narrative.title')}
        subtitle={t('mood.analysis.sections.narrative.subtitle')}
      >
        <NarrativeSection narrative={narrative} headings={narrativeHeadings} styles={styles} />
      </ScreenSection>

      <View style={styles.footerSpacing}>
        <ThemedButton
          title={t('mood.analysis.actions.refresh')}
          iconLeft="refresh"
          variant="outline"
          onPress={handleRefresh}
          isLoading={isRefetching}
        />
      </View>
    </ScreenLayout>
  );
};

interface OverviewSectionProps {
  data: MoodAnalyticsResponse;
  totals: { statementsPerEntry: number } | null;
  dominantMoodLabel: string;
  balanceLabel: string;
  t: TFunction<'translation'>;
  styles: ReturnType<typeof createStyles>;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({
  data,
  totals,
  dominantMoodLabel,
  balanceLabel,
  t,
  styles,
}) => {
  return (
    <ThemedCard variant="elevated" density="comfortable" elevation="card">
      <View style={styles.overviewRow}>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>{t('mood.analysis.overview.entries')}</Text>
          <Text style={styles.overviewValue}>{data.overview.totalEntries}</Text>
        </View>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>{t('mood.analysis.overview.statements')}</Text>
          <Text style={styles.overviewValue}>{data.overview.analyzedStatements}</Text>
        </View>
      </View>
      <View style={styles.overviewRow}>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>{t('mood.analysis.overview.dominantMood')}</Text>
          <Text style={styles.overviewHighlight}>{dominantMoodLabel}</Text>
        </View>
        <View style={styles.overviewItem}>
          <Text style={styles.overviewLabel}>{t('mood.analysis.overview.balanceScore')}</Text>
          <Text style={styles.overviewHighlight}>
            {`${data.overview.balanceScore.value.toFixed(0)} · ${balanceLabel}`}
          </Text>
        </View>
      </View>
      <View style={styles.overviewFooter}>
        {totals ? (
          <Text style={styles.overviewFooterText}>
            {t('mood.analysis.overview.statementsPerEntry', {
              value: totals.statementsPerEntry,
            })}
          </Text>
        ) : null}
        <Text style={styles.overviewTimestamp}>
          {t('mood.analysis.overview.generatedAt', { date: formatDate(data.generatedAt, t) })}
        </Text>
      </View>
    </ThemedCard>
  );
};

interface StreakSectionProps {
  streak: Streak | null;
  isLoading: boolean;
  t: TFunction<'translation'>;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}

const StreakSection: React.FC<StreakSectionProps> = ({ streak, isLoading, t, styles, theme }) => {
  if (isLoading && !streak) {
    return (
      <ThemedCard variant="outlined" elevation="card" density="comfortable">
        <View style={styles.inlineLoader}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            accessibilityLabel={t('mood.analysis.streak.loading')}
          />
        </View>
      </ThemedCard>
    );
  }

  return (
    <ThemedCard variant="outlined" elevation="card" density="comfortable">
      {streak ? (
        <View style={styles.streakRow}>
          <View style={styles.streakMetric}>
            <Text style={styles.streakLabel}>{t('mood.analysis.streak.current')}</Text>
            <Text style={styles.streakValue}>{streak.current_streak}</Text>
          </View>
          <View style={styles.streakMetric}>
            <Text style={styles.streakLabel}>{t('mood.analysis.streak.longest')}</Text>
            <Text style={styles.streakValue}>{streak.longest_streak}</Text>
          </View>
          <View style={styles.streakMetric}>
            <Text style={styles.streakLabel}>{t('mood.analysis.streak.lastEntry')}</Text>
            <Text style={styles.streakValueSmall}>
              {streak.last_entry_date
                ? formatDate(streak.last_entry_date, t)
                : t('mood.analysis.streak.noLastEntry')}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.streakEmpty}>{t('mood.analysis.streak.empty')}</Text>
      )}

      <View style={[styles.streakHint, getPrimaryShadow.small(theme)]}>
        <Text style={styles.streakHintText}>{t('mood.analysis.streak.hint')}</Text>
      </View>
    </ThemedCard>
  );
};

// Helper to compute mood-specific streaks from trend data
interface MoodStreakData {
  mood: MoodEmoji;
  longestStreak: number;
  currentStreak: number;
}

const computeMoodStreaks = (trend: MoodAnalyticsResponse['trend']): MoodStreakData[] => {
  // Sort trend by date ascending for streak calculation
  const sortedTrend = [...trend].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const moodStreaks: Record<MoodEmoji, { longest: number; current: number }> = {} as Record<
    MoodEmoji,
    { longest: number; current: number }
  >;

  // Initialize all moods
  MOOD_EMOJIS.forEach((mood) => {
    moodStreaks[mood] = { longest: 0, current: 0 };
  });

  // Calculate streaks
  let lastMood: MoodEmoji | null = null;
  let currentRun = 0;

  for (const point of sortedTrend) {
    if (!point.dominantMood) {
      // Break all streaks
      if (lastMood && currentRun > 0) {
        moodStreaks[lastMood].longest = Math.max(moodStreaks[lastMood].longest, currentRun);
        moodStreaks[lastMood].current = 0;
      }
      lastMood = null;
      currentRun = 0;
      continue;
    }

    if (point.dominantMood === lastMood) {
      currentRun++;
    } else {
      // End previous streak
      if (lastMood && currentRun > 0) {
        moodStreaks[lastMood].longest = Math.max(moodStreaks[lastMood].longest, currentRun);
        moodStreaks[lastMood].current = 0;
      }
      // Start new streak
      lastMood = point.dominantMood;
      currentRun = 1;
    }
  }

  // Finalize last mood (this is the "current" streak for the most recent mood)
  if (lastMood && currentRun > 0) {
    moodStreaks[lastMood].longest = Math.max(moodStreaks[lastMood].longest, currentRun);
    moodStreaks[lastMood].current = currentRun;
  }

  // Convert to array and filter out moods with no streaks
  return MOOD_EMOJIS.filter((mood) => moodStreaks[mood].longest > 0)
    .map((mood) => ({
      mood,
      longestStreak: moodStreaks[mood].longest,
      currentStreak: moodStreaks[mood].current,
    }))
    .sort((a, b) => b.longestStreak - a.longestStreak);
};

interface MoodStreakSectionProps {
  data: MoodAnalyticsResponse;
  t: TFunction<'translation'>;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}

const MoodStreakSection: React.FC<MoodStreakSectionProps> = ({ data, t, styles, theme }) => {
  const moodStreaks = useMemo(() => computeMoodStreaks(data.trend), [data.trend]);

  if (moodStreaks.length === 0) {
    return <Text style={styles.emptyMessage}>{t('mood.analysis.moodStreak.empty')}</Text>;
  }

  return (
    <View style={styles.moodStreakContainer}>
      {moodStreaks.slice(0, 5).map((item) => (
        <View key={item.mood} style={styles.moodStreakRow}>
          <Text style={styles.moodStreakEmoji}>{item.mood}</Text>
          <View style={styles.moodStreakInfo}>
            <Text style={styles.moodStreakLabel}>
              {t(`mood.analysis.moods.${item.mood}`, { defaultValue: item.mood })}
            </Text>
            <Text style={styles.moodStreakValue}>
              {t('mood.analysis.moodStreak.currentStreak', { count: item.longestStreak })}
            </Text>
          </View>
          {item.currentStreak > 0 && (
            <View
              style={[styles.moodStreakBadge, { backgroundColor: theme.colors.primary + '20' }]}
            >
              <Text style={[styles.moodStreakBadgeText, { color: theme.colors.primary }]}>
                🔥 {item.currentStreak}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

// Helper to compute period-over-period comparison from trend data
interface ComparisonData {
  currentBalance: number;
  previousBalance: number;
  change: number;
  trend: 'improved' | 'declined' | 'stable';
}

const computePeriodComparison = (
  trend: MoodAnalyticsResponse['trend'],
  _moodCounts: MoodAnalyticsResponse['moodCounts']
): ComparisonData | null => {
  if (trend.length < 4) {
    return null; // Need at least 4 days for meaningful comparison
  }

  // Split trend into two halves (current vs previous period)
  const midpoint = Math.floor(trend.length / 2);
  const sortedTrend = [...trend].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const previousHalf = sortedTrend.slice(0, midpoint);
  const currentHalf = sortedTrend.slice(midpoint);

  // Calculate balance for each half (variance in mood counts = less balanced)
  const calculateBalance = (periodTrend: MoodAnalyticsResponse['trend']): number => {
    const moodTotals: Record<string, number> = {};
    let total = 0;

    periodTrend.forEach((point) => {
      Object.entries(point.moodCounts).forEach(([mood, count]) => {
        moodTotals[mood] = (moodTotals[mood] || 0) + count;
        total += count;
      });
    });

    if (total === 0) {
      return 50;
    } // Neutral

    const values = Object.values(moodTotals);
    const maxRatio = Math.max(...values) / total;
    // Higher score = more balanced (lower dominant ratio)
    return Math.round(100 - maxRatio * 100);
  };

  const previousBalance = calculateBalance(previousHalf);
  const currentBalance = calculateBalance(currentHalf);
  const change = currentBalance - previousBalance;

  let trendLabel: 'improved' | 'declined' | 'stable';
  if (change >= 5) {
    trendLabel = 'improved';
  } else if (change <= -5) {
    trendLabel = 'declined';
  } else {
    trendLabel = 'stable';
  }

  return {
    currentBalance,
    previousBalance,
    change,
    trend: trendLabel,
  };
};

interface ComparisonSectionProps {
  data: MoodAnalyticsResponse;
  t: TFunction<'translation'>;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}

const ComparisonSection: React.FC<ComparisonSectionProps> = ({ data, t, styles, theme }) => {
  const comparison = useMemo(
    () => computePeriodComparison(data.trend, data.moodCounts),
    [data.trend, data.moodCounts]
  );

  if (!comparison) {
    return <Text style={styles.emptyMessage}>{t('mood.analysis.comparison.noData')}</Text>;
  }

  const getTrendColor = () => {
    switch (comparison.trend) {
      case 'improved':
        return theme.colors.success || '#22c55e';
      case 'declined':
        return theme.colors.error || '#ef4444';
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getTrendIcon = () => {
    switch (comparison.trend) {
      case 'improved':
        return '↑';
      case 'declined':
        return '↓';
      default:
        return '→';
    }
  };

  return (
    <ThemedCard variant="outlined" density="comfortable" elevation="card">
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonLabel}>{t('mood.analysis.comparison.previousPeriod')}</Text>
          <Text style={styles.comparisonValue}>{comparison.previousBalance}%</Text>
        </View>
        <View style={styles.comparisonArrow}>
          <Text style={[styles.comparisonArrowIcon, { color: getTrendColor() }]}>
            {getTrendIcon()}
          </Text>
          <Text style={[styles.comparisonChange, { color: getTrendColor() }]}>
            {Math.abs(comparison.change)}%
          </Text>
        </View>
        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonLabel}>{t('mood.analysis.comparison.currentPeriod')}</Text>
          <Text style={styles.comparisonValue}>{comparison.currentBalance}%</Text>
        </View>
      </View>
      <Text style={[styles.comparisonStatus, { color: getTrendColor() }]}>
        {comparison.trend === 'stable'
          ? t('mood.analysis.comparison.stable')
          : t(`mood.analysis.comparison.${comparison.trend}`, {
              value: Math.abs(comparison.change),
            })}
      </Text>
    </ThemedCard>
  );
};

// Day names for correlation insights
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to compute correlation insights
interface Insight {
  key: string;
  params?: Record<string, string | number>;
  emoji: string;
}

const computeInsights = (
  trend: MoodAnalyticsResponse['trend'],
  moodCounts: MoodAnalyticsResponse['moodCounts'],
  t: TFunction<'translation'>
): Insight[] => {
  const insights: Insight[] = [];

  if (trend.length < 3) {
    return insights;
  }

  // Analyze by day of week
  const dayStats: Record<number, { count: number; moods: Record<string, number> }> = {};
  for (let i = 0; i < 7; i++) {
    dayStats[i] = { count: 0, moods: {} };
  }

  trend.forEach((point) => {
    const dayOfWeek = new Date(point.date).getDay();
    dayStats[dayOfWeek].count++;
    if (point.dominantMood) {
      dayStats[dayOfWeek].moods[point.dominantMood] =
        (dayStats[dayOfWeek].moods[point.dominantMood] || 0) + 1;
    }
  });

  // Find best day
  let bestDay = 0;
  let bestDayMood: string | null = null;
  let maxCount = 0;

  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.count > maxCount) {
      maxCount = stats.count;
      bestDay = parseInt(day, 10);
      const topMood = Object.entries(stats.moods).sort((a, b) => b[1] - a[1])[0];
      bestDayMood = topMood ? topMood[0] : null;
    }
  });

  if (maxCount >= 2 && bestDayMood) {
    const dayName = t(`common.days.${DAY_NAMES[bestDay].toLowerCase()}`, {
      defaultValue: DAY_NAMES[bestDay],
    });
    const moodLabel = t(`mood.analysis.moods.${bestDayMood}`, { defaultValue: bestDayMood });
    insights.push({
      key: 'bestDay',
      params: { day: dayName, mood: moodLabel },
      emoji: '📅',
    });
  }

  // Check weekend vs weekday patterns
  const weekendCount = dayStats[0].count + dayStats[6].count;
  const weekdayCount =
    dayStats[1].count +
    dayStats[2].count +
    dayStats[3].count +
    dayStats[4].count +
    dayStats[5].count;

  if (weekendCount > weekdayCount * 0.5 && weekendCount >= 3) {
    insights.push({ key: 'weekendBoost', emoji: '🌴' });
  } else if (weekdayCount >= 5) {
    insights.push({ key: 'weekdayStrong', emoji: '💼' });
  }

  // Check mood variety
  const uniqueMoods = moodCounts.filter((m) => m.count > 0).length;
  if (uniqueMoods >= 4) {
    insights.push({
      key: 'varietyHigh',
      params: { count: uniqueMoods },
      emoji: '🌈',
    });
  }

  // Check for consistent dominant mood
  const dominantMood = moodCounts[0];
  const totalMoods = moodCounts.reduce((sum, m) => sum + m.count, 0);
  if (dominantMood && totalMoods > 0 && dominantMood.count / totalMoods >= 0.5) {
    const moodLabel = t(`mood.analysis.moods.${dominantMood.mood}`, {
      defaultValue: dominantMood.mood,
    });
    insights.push({
      key: 'consistentMood',
      params: { mood: moodLabel },
      emoji: dominantMood.mood,
    });
  }

  return insights.slice(0, 4); // Max 4 insights
};

interface CorrelationSectionProps {
  data: MoodAnalyticsResponse;
  t: TFunction<'translation'>;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}

const CorrelationSection: React.FC<CorrelationSectionProps> = ({
  data,
  t,
  styles,
  theme: _theme,
}) => {
  const insights = useMemo(
    () => computeInsights(data.trend, data.moodCounts, t),
    [data.trend, data.moodCounts, t]
  );

  if (insights.length === 0) {
    return <Text style={styles.emptyMessage}>{t('mood.analysis.correlation.empty')}</Text>;
  }

  return (
    <View style={styles.insightsContainer}>
      {insights.map((insight, index) => (
        <View key={`${insight.key}-${index}`} style={styles.insightCard}>
          <Text style={styles.insightEmoji}>{insight.emoji}</Text>
          <Text style={styles.insightText}>
            {t(`mood.analysis.correlation.${insight.key}`, insight.params || {})}
          </Text>
        </View>
      ))}
    </View>
  );
};

interface DistributionSectionProps {
  distribution: MoodDistributionItem[];
  styles: ReturnType<typeof createStyles>;
  t: TFunction<'translation'>;
  theme: AppTheme;
}

const DistributionSection: React.FC<DistributionSectionProps> = ({
  distribution,
  styles,
  t,
  theme: _theme,
}) => {
  if (distribution.length === 0) {
    return <Text style={styles.emptyMessage}>{t('mood.analysis.distribution.empty')}</Text>;
  }

  // Prepare chart data with colors
  const chartData = distribution.map((item, index) => ({
    value: item.count,
    label: t(`mood.analysis.moods.${item.mood}`, { defaultValue: item.mood }),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const totalMoods = distribution.reduce((sum, item) => sum + item.count, 0);

  return (
    <View style={styles.distributionContainer}>
      {/* Donut Chart */}
      <View style={styles.chartContainer}>
        <DonutChart
          data={chartData}
          size={140}
          strokeWidth={20}
          centerValue={totalMoods.toString()}
          centerLabel={t('mood.analysis.overview.statements')}
        />
      </View>

      {/* Legend with bars */}
      {distribution.map((item, index) => (
        <View key={item.mood} style={styles.distributionRow}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] },
            ]}
          />
          <View style={styles.distributionLabelContainer}>
            <Text style={styles.distributionMood}>
              {t(`mood.analysis.moods.${item.mood}`, { defaultValue: item.mood })}
            </Text>
            <Text style={styles.distributionCount}>{item.count}</Text>
          </View>
          <View style={styles.distributionBar}>
            <View
              style={[
                styles.distributionFill,
                {
                  width: `${Math.max(item.percentage, 4)}%`,
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                },
              ]}
            />
          </View>
          <Text style={styles.distributionPercentage}>{`${item.percentage.toFixed(0)}%`}</Text>
        </View>
      ))}
    </View>
  );
};

interface TrendSectionProps {
  data: MoodAnalyticsResponse;
  styles: ReturnType<typeof createStyles>;
  t: TFunction<'translation'>;
}

const TrendSection: React.FC<TrendSectionProps> = ({ data, styles, t }) => {
  if (!data.trend.length) {
    return <Text style={styles.emptyMessage}>{t('mood.analysis.trend.empty')}</Text>;
  }

  return (
    <View style={styles.trendContainer}>
      {data.trend.slice(0, 6).map((point) => (
        <ThemedCard key={point.date} variant="default" density="compact">
          <View style={styles.trendRow}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendDate}>{formatDate(point.date, t)}</Text>
              <Text style={styles.trendDominant}>
                {point.dominantMood
                  ? t(`mood.analysis.moods.${point.dominantMood}`, {
                      defaultValue: point.dominantMood,
                    })
                  : t('mood.analysis.trend.mixed')}
              </Text>
            </View>
            <Text style={styles.trendEntryCount}>
              {t('mood.analysis.trend.entries', { count: point.entryCount })}
            </Text>
            <View style={styles.trendMoodList}>
              {MOOD_EMOJIS.map((mood) => (
                <View key={mood} style={styles.trendMoodItem}>
                  <Text style={styles.trendMoodEmoji}>{mood}</Text>
                  <Text style={styles.trendMoodValue}>{point.moodCounts[mood] ?? 0}</Text>
                </View>
              ))}
            </View>
          </View>
        </ThemedCard>
      ))}
    </View>
  );
};

interface HighlightsSectionProps {
  data: MoodAnalyticsResponse;
  styles: ReturnType<typeof createStyles>;
  t: TFunction<'translation'>;
}

const HighlightsSection: React.FC<HighlightsSectionProps> = ({ data, styles, t }) => {
  if (!data.highlightedStatements.length) {
    return <Text style={styles.emptyMessage}>{t('mood.analysis.highlighted.empty')}</Text>;
  }

  return (
    <View style={styles.highlightContainer}>
      {data.highlightedStatements.slice(0, 6).map((item, index) => (
        <ThemedCard key={`${item.entryDate}-${index}`} variant="interactive" density="standard">
          <Text style={styles.highlightMood}>{item.mood}</Text>
          <Text style={styles.highlightStatement}>{item.statement}</Text>
          <Text style={styles.highlightMeta}>
            {t('mood.analysis.highlighted.meta', {
              date: formatDate(item.entryDate, t),
            })}
          </Text>
        </ThemedCard>
      ))}
    </View>
  );
};

interface NarrativeCopy {
  logical: string;
  emotional: string;
  suggestions: string[];
}

interface NarrativeSectionProps {
  narrative: NarrativeCopy;
  headings: NarrativeHeadings;
  styles: ReturnType<typeof createStyles>;
}

const NarrativeSection: React.FC<NarrativeSectionProps> = ({ narrative, headings, styles }) => {
  return (
    <ThemedCard variant="filled" density="comfortable" elevation="floating">
      <Text style={styles.narrativeHeading}>{headings.logical}</Text>
      <Text style={styles.narrativeBody}>{narrative.logical}</Text>

      <Text style={[styles.narrativeHeading, styles.narrativeSpacing]}>{headings.emotional}</Text>
      <Text style={styles.narrativeBody}>{narrative.emotional}</Text>

      {narrative.suggestions.length > 0 ? (
        <>
          <Text style={[styles.narrativeHeading, styles.narrativeSpacing]}>
            {headings.suggestions}
          </Text>
          <View style={styles.suggestionList}>
            {narrative.suggestions.map((suggestion, index) => (
              <View key={`${suggestion}-${index}`} style={styles.suggestionItem}>
                <View style={styles.suggestionBullet} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ThemedCard>
  );
};

interface NarrativeHeadings {
  logical: string;
  emotional: string;
  suggestions: string;
}

const getNarrativeHeadings = (t: TFunction<'translation'>): NarrativeHeadings => ({
  logical: t('mood.analysis.narrative.logical'),
  emotional: t('mood.analysis.narrative.emotional'),
  suggestions: t('mood.analysis.narrative.suggestions'),
});

const buildNarrativeCopy = ({
  data,
  t,
}: {
  data: MoodAnalyticsResponse;
  t: TFunction<'translation'>;
}): NarrativeCopy => {
  const totalMoods = data.moodCounts.reduce((sum, item) => sum + item.count, 0);
  const dominantMood = data.overview.dominantMood;
  const dominantCount = dominantMood
    ? (data.moodCounts.find((item) => item.mood === dominantMood)?.count ?? 0)
    : (data.moodCounts[0]?.count ?? 0);
  const dominantRatio = totalMoods > 0 ? dominantCount / totalMoods : 0;

  let logicalKey: 'empty' | 'imbalanced' | 'balanced' | 'neutral';
  if (totalMoods === 0) {
    logicalKey = 'empty';
  } else if (dominantRatio >= 0.65) {
    logicalKey = 'imbalanced';
  } else if (dominantRatio <= 0.4) {
    logicalKey = 'balanced';
  } else {
    logicalKey = 'neutral';
  }

  const emotional = dominantMood
    ? t('mood.analysis.narrative.emotionalStates.dominant', {
        mood: t(`mood.analysis.moods.${dominantMood}`, { defaultValue: dominantMood }),
      })
    : t('mood.analysis.narrative.emotionalStates.none');

  const suggestionTexts = new Set<string>();

  if (totalMoods === 0) {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.addMoods'));
  }

  if (dominantRatio >= 0.65) {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.balance'));
    // Add explore suggestion with the dominant mood
    if (dominantMood) {
      suggestionTexts.add(
        t('mood.analysis.narrative.suggestionTexts.explore', {
          mood: t(`mood.analysis.moods.${dominantMood}`, { defaultValue: dominantMood }),
        })
      );
    }
  } else if (dominantRatio <= 0.4 && totalMoods > 0) {
    // Balanced mood - celebrate!
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.variety'));
  }

  if (data.overview.totalEntries >= 7) {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.keepStreak'));
  } else {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.writeMore'));
  }

  // Add milestone celebration for high entry counts
  if (data.overview.totalEntries >= 30) {
    suggestionTexts.add(
      t('mood.analysis.narrative.suggestionTexts.milestone', {
        count: data.overview.totalEntries,
      })
    );
  } else if (data.overview.totalEntries >= 10) {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.celebrate'));
  }

  // Add reflection prompt for neutral state
  if (logicalKey === 'neutral' && totalMoods >= 5) {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.reflect'));
  }

  return {
    logical: t(`mood.analysis.narrative.logicalStates.${logicalKey}`),
    emotional,
    suggestions: Array.from(suggestionTexts),
  };
};

const formatDate = (input: string | Date, t: TFunction<'translation'>): string => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return t('mood.analysis.date.unknown');
  }
  return date.toLocaleDateString();
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: theme.spacing.section,
    },
    stateWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.page,
      paddingTop: theme.spacing.section,
    },
    emptyWrapper: {
      flex: 1,
      justifyContent: 'center',
      padding: theme.spacing.page,
    },
    emptyTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    emptyMessage: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    emptyButton: {
      marginTop: theme.spacing.md,
    },
    overviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    header: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      alignItems: 'flex-start',
    },
    backButton: {
      marginBottom: theme.spacing.sm,
      marginLeft: -theme.spacing.sm, // Align icon with text
    },
    headerLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    headerTitle: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      marginBottom: 4,
      fontWeight: '700',
      fontFamily: 'Lora-Bold',
    },
    headerSubtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 24,
    },
    rangeSelector: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    overviewItem: {
      flex: 1,
    },
    overviewLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
    },
    overviewValue: {
      ...theme.typography.displaySmall,
      color: theme.colors.onSurface,
    },
    overviewHighlight: {
      ...theme.typography.headlineSmall,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    overviewFooter: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '30',
      paddingTop: theme.spacing.md,
    },
    overviewFooterText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.xs,
    },
    overviewTimestamp: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    inlineLoader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
    },
    streakRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    streakMetric: {
      flex: 1,
    },
    streakLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
    },
    streakValue: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    streakValueSmall: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
    },
    streakEmpty: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    streakHint: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
    },
    streakHintText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurface,
    },
    moodStreakContainer: {
      gap: theme.spacing.sm,
    },
    moodStreakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    moodStreakEmoji: {
      fontSize: 28,
    },
    moodStreakInfo: {
      flex: 1,
    },
    moodStreakLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    moodStreakValue: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    moodStreakBadge: {
      borderRadius: theme.borderRadius.full || 999,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    moodStreakBadgeText: {
      ...theme.typography.labelSmall,
      fontWeight: '600',
    },
    comparisonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    comparisonColumn: {
      flex: 1,
      alignItems: 'center',
    },
    comparisonLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
    },
    comparisonValue: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    comparisonArrow: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    comparisonArrowIcon: {
      fontSize: 24,
      fontWeight: '700',
    },
    comparisonChange: {
      ...theme.typography.labelSmall,
      fontWeight: '600',
    },
    comparisonStatus: {
      ...theme.typography.bodyMedium,
      textAlign: 'center',
      fontWeight: '500',
    },
    chartContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: theme.spacing.sm,
    },
    insightsContainer: {
      gap: theme.spacing.sm,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    insightEmoji: {
      fontSize: 24,
    },
    insightText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 1,
    },
    distributionContainer: {
      gap: theme.spacing.md,
    },
    distributionRow: {
      gap: theme.spacing.sm,
    },
    distributionLabelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    distributionMood: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    distributionCount: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
    },
    distributionBar: {
      height: 12,
      borderRadius: theme.borderRadius.full || 999,
      backgroundColor: theme.colors.surfaceVariant,
      overflow: 'hidden',
    },
    distributionFill: {
      height: '100%',
      borderRadius: theme.borderRadius.full || 999,
    },
    distributionPercentage: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'right',
    },
    trendContainer: {
      gap: theme.spacing.md,
    },
    trendRow: {
      gap: theme.spacing.sm,
    },
    trendHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    trendDate: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
    },
    trendDominant: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
    },
    trendEntryCount: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    trendMoodList: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    trendMoodItem: {
      alignItems: 'center',
      flex: 1,
    },
    trendMoodEmoji: {
      fontSize: 20,
      marginBottom: theme.spacing.xs,
    },
    trendMoodValue: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurface,
    },
    highlightContainer: {
      gap: theme.spacing.md,
    },
    highlightMood: {
      fontSize: 24,
      marginBottom: theme.spacing.sm,
    },
    highlightStatement: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
    },
    highlightMeta: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    narrativeHeading: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    narrativeBody: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.xs,
    },
    narrativeSpacing: {
      marginTop: theme.spacing.lg,
    },
    suggestionList: {
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    suggestionItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    suggestionBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
    },
    suggestionText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 1,
    },
    footerSpacing: {
      paddingHorizontal: theme.spacing.page,
      paddingVertical: theme.spacing.lg,
    },
  });

export default React.memo(MoodAnalysisScreen);
