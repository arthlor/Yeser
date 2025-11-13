import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { ScreenHeader, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ErrorState from '@/shared/components/ui/ErrorState';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { useMoodAnalytics } from '../hooks';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
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

const MoodAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<MoodAnalysisNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data, error, isLoading, isRefetching, refetch, totals } = useMoodAnalytics(DEFAULT_RANGE);
  const { data: streak, isLoading: streakLoading } = useStreakData();

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
    >
      <ScreenHeader
        title={t('mood.analysis.title')}
        subtitle={t('mood.analysis.subtitle')}
        showBackButton
        onBackPress={handleBackPress}
      />

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
  theme,
}) => {
  if (distribution.length === 0) {
    return <Text style={styles.emptyMessage}>{t('mood.analysis.distribution.empty')}</Text>;
  }

  return (
    <View style={styles.distributionContainer}>
      {distribution.map((item) => (
        <View key={item.mood} style={styles.distributionRow}>
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
                  backgroundColor: theme.colors.primary,
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
  }

  if (data.overview.totalEntries >= 7) {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.keepStreak'));
  } else {
    suggestionTexts.add(t('mood.analysis.narrative.suggestionTexts.writeMore'));
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
