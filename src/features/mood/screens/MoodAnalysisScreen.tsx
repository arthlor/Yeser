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
import { useTheme } from '@/providers/ThemeProvider';
import { useMoodAnalytics } from '../hooks';
import { useMoodInsights } from '../hooks/useMoodInsights';
import { AIUsageIndicator } from '@/shared/components/ui/AIUsageIndicator';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import { useSubscription } from '@/hooks/useSubscription';
import { analyticsService } from '@/services/analyticsService';
import type { AppStackParamList } from '@/types/navigation';
import type { MoodAnalyticsRange } from '@/types/moodAnalytics.types';
import { AppTheme } from '@/themes/types';

type MoodAnalysisNavigationProp = NativeStackNavigationProp<AppStackParamList, 'MoodAnalysis'>;

const DEFAULT_RANGE: MoodAnalyticsRange = '30d';
const RANGE_OPTIONS: MoodAnalyticsRange[] = ['7d', '15d', '30d'];

const MoodAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<MoodAnalysisNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [selectedRange, setSelectedRange] = useState<MoodAnalyticsRange>(DEFAULT_RANGE);
  const { data, error, isLoading, isRefetching, refetch } = useMoodAnalytics(selectedRange);

  const rangeOptions = useMemo(
    () =>
      RANGE_OPTIONS.map((value) => ({
        value,
        label: t(`mood.analysis.range.${value}`),
      })),
    [t]
  );
  useStreakData();
  const { isPro, checkGate } = useSubscription();

  // Fetch AI Insights
  const {
    data: aiInsights,
    isLoading: isAiLoading,
    refetch: generateInsights,
    isRefetching: isAiRefetching,
    error: aiError,
  } = useMoodInsights(selectedRange);

  const [analysisRequested, setAnalysisRequested] = useState(false);

  const handleGenerateInsights = async () => {
    setAnalysisRequested(true);
    await generateInsights();
  };

  const hasAnalytics = Boolean(data && data.overview.totalEntries > 0);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(() => {
    analyticsService.logEvent('mood_analysis_refetch');
    void refetch();
  }, [refetch]);

  const handleUnlockInsights = useCallback(() => {
    checkGate('mood_analytics_deep_dive');
  }, [checkGate]);

  if (!isPro) {
    return (
      <ScreenLayout
        edges={['top']}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        backgroundColor={theme.colors.background}
        density="comfortable"
      >
        <View style={styles.header}>
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

        <View style={styles.rangeSelector}>
          <SegmentedControl
            options={rangeOptions}
            selectedValue={selectedRange}
            onValueChange={setSelectedRange}
            disabled
          />
        </View>

        <ScreenSection
          spacing="large"
          title={t('subscription.paywall.context.insights.title', 'Unlock Premium Insights')}
          subtitle={t(
            'subscription.paywall.context.insights.subtitle',
            'Access in-depth analysis and trends over time.'
          )}
        >
          <ThemedCard style={styles.previewCard} variant="filled" density="comfortable">
            <View style={styles.previewHeaderRow}>
              <View style={styles.previewChip}>
                <Text style={styles.previewChipText}>
                  {t('subscription.paywall.upgradeToPro', 'Upgrade to Pro')}
                </Text>
              </View>
              <Text style={styles.previewTitle}>{t('mood.analysis.title')}</Text>
            </View>

            <View style={styles.previewStatsRow}>
              <View style={styles.previewStatBlock}>
                <View style={styles.previewStatBar} />
                <Text style={styles.previewStatLabel}>
                  {t('mood.analysis.overview.entries', 'Entries analyzed')}
                </Text>
              </View>
              <View style={styles.previewStatBlock}>
                <View style={styles.previewStatBar} />
                <Text style={styles.previewStatLabel}>
                  {t('mood.analysis.overview.balanceScore', 'Balance score')}
                </Text>
              </View>
            </View>

            <View style={styles.previewChart}>
              <View style={styles.previewChartBar} />
              <View style={[styles.previewChartBar, styles.previewChartBarMid]} />
              <View style={styles.previewChartBar} />
            </View>

            <View style={styles.previewOverlay}>
              <View style={styles.previewOverlayContent}>
                <View style={styles.previewLock}>
                  <Icon name="lock" size={20} color={theme.colors.onPrimary} />
                </View>
                <Text style={styles.previewOverlayTitle}>
                  {t('subscription.paywall.context.insights.title', 'Unlock Premium Insights')}
                </Text>
                <Text style={styles.previewOverlaySubtitle}>
                  {t(
                    'subscription.paywall.context.insights.subtitle',
                    'Access in-depth analysis and trends over time.'
                  )}
                </Text>
                <ThemedButton
                  title={t('subscription.paywall.upgradeToPro', 'Upgrade to Pro')}
                  onPress={handleUnlockInsights}
                  style={styles.previewCta}
                />
              </View>
            </View>
          </ThemedCard>
        </ScreenSection>
      </ScreenLayout>
    );
  }

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

  if (!data) {
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

      {/* AI Insights Section */}
      <ScreenSection
        spacing="large"
        title={t('mood.analysis.sections.narrative.title', 'AI Insights')}
        subtitle={
          analysisRequested && aiInsights?.remaining !== undefined
            ? t('mood.analysis.ai.remaining', { count: aiInsights.remaining })
            : t('mood.analysis.sections.narrative.subtitle', 'Understanding your well-being')
        }
      >
        {analysisRequested && (aiInsights || isAiLoading || isAiRefetching || aiError) ? (
          <NarrativeSection
            narrative={aiInsights?.narrative}
            insight={aiInsights?.highlighted_insight}
            isLoading={isAiLoading || isAiRefetching}
            styles={styles}
            t={t}
            theme={theme}
            error={aiError}
            remaining={aiInsights?.remaining}
            resetInSeconds={aiInsights?.resetInSeconds}
            aiError={aiInsights?.error}
          />
        ) : (
          <ThemedCard style={styles.aiBanner}>
            <View style={styles.aiBannerContent}>
              <View style={styles.aiBannerIconContainer}>
                <Icon name="robot-happy" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.aiBannerTextContainer}>
                <Text style={styles.aiBannerTitle}>
                  {t('mood.analysis.banner.title', 'Unlock AI Insights')}
                </Text>
                <Text style={styles.aiBannerSubtitle}>
                  {t(
                    'mood.analysis.banner.subtitle',
                    'Get personalized analysis of your mood patterns.'
                  )}
                </Text>
              </View>
            </View>
            <ThemedButton
              title={t('mood.analysis.banner.button', 'Analyze My Mood')}
              onPress={handleGenerateInsights}
              style={styles.bannerButton}
            />
          </ThemedCard>
        )}
      </ScreenSection>

      <View style={styles.footerSpacing}>
        <ThemedButton
          title={t('mood.analysis.actions.refresh')}
          iconLeft="refresh"
          variant="outline"
          size="compact"
          onPress={handleRefresh}
          isLoading={isRefetching}
        />
      </View>
    </ScreenLayout>
  );
};

interface NarrativeSectionProps {
  narrative?: {
    logical: string;
    emotional: string;
    suggestions: string[];
  };
  insight?: {
    title: string;
    description: string;
    emoji: string;
  } | null;
  isLoading: boolean;
  styles: ReturnType<typeof createStyles>;
  t: TFunction<'translation'>;
  theme: AppTheme;
  error?: Error | null;
  remaining?: number;
  resetInSeconds?: number;
  aiError?: string;
}

const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  narrative,
  insight,
  isLoading,
  styles,
  t,
  theme,
  error,
  remaining,
  resetInSeconds,
  aiError,
}) => {
  if (isLoading) {
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <View style={styles.inlineLoader}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {t('mood.analysis.narrative.loading', 'Analyzing your gratitude patterns...')}
          </Text>
        </View>
      </ThemedCard>
    );
  }

  // Handle generic API error (4xx/5xx)
  if (error) {
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <Text style={[styles.emptyMessage, { color: theme.colors.error }]}>
          {error.message || t('common.error')}
        </Text>
      </ThemedCard>
    );
  }

  // Handle specific AI limit reached error (200 OK with error field)
  if (aiError === 'Daily limit reached' || remaining === 0) {
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <View style={styles.limitReachedContainer}>
          <Icon name="clock-outline" size={32} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, styles.noMargin]}>
            {t('ai.usage.limit_reached', 'Daily AI Limit Reached')}
          </Text>
          <Text style={styles.emptyMessage}>
            {t('ai.usage.limit_desc', 'You have used all your AI interactions for today.')}
          </Text>
          <AIUsageIndicator remaining={0} resetInSeconds={resetInSeconds} showAlways />
        </View>
      </ThemedCard>
    );
  }

  if (!narrative) {
    // Fallback if AI returns nothing
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <Text style={styles.emptyMessage}>
          {t('mood.analysis.narrative.empty', 'Unlock insights by adding more entries.')}
        </Text>
      </ThemedCard>
    );
  }

  return (
    <View style={styles.narrativeContainer}>
      {/* Highlighted Insight Card */}
      {insight && (
        <ThemedCard
          variant="interactive"
          density="comfortable"
          style={{
            backgroundColor: theme.colors.primary + '10',
            borderColor: theme.colors.primary + '30',
          }}
        >
          <View style={styles.insightHeader}>
            <Text style={styles.insightEmoji}>{insight.emoji}</Text>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDesc}>{insight.description}</Text>
            </View>
          </View>
        </ThemedCard>
      )}

      {/* Main Narrative */}
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <Text style={styles.narrativeHeading}>{t('mood.analysis.narrative.logical')}</Text>
        <Text style={styles.narrativeBody}>{narrative.logical}</Text>

        <Text style={[styles.narrativeHeading, styles.narrativeSpacing]}>
          {t('mood.analysis.narrative.emotional')}
        </Text>
        <Text style={styles.narrativeBody}>{narrative.emotional}</Text>

        {narrative.suggestions.length > 0 ? (
          <>
            <Text style={[styles.narrativeHeading, styles.narrativeSpacing]}>
              {t('mood.analysis.narrative.suggestions')}
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
    </View>
  );
};

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
    previewCard: {
      position: 'relative',
      overflow: 'hidden',
    },
    previewHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.md,
    },
    previewChip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full || 999,
      backgroundColor: theme.colors.primary + '20',
    },
    previewChipText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    previewTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    previewStatsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    previewStatBlock: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    previewStatBar: {
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.colors.outline + '40',
    },
    previewStatLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    previewChart: {
      marginTop: theme.spacing.md,
      height: 120,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    previewChartBar: {
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.outline + '50',
    },
    previewChartBarMid: {
      width: '70%',
      backgroundColor: theme.colors.outline + '70',
    },
    previewOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.surface + 'E6',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    previewOverlayContent: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    previewLock: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    previewOverlayTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    previewOverlaySubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    previewCta: {
      marginTop: theme.spacing.xs,
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
      marginBottom: theme.spacing.xs,
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
    overviewExplanation: {
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
      opacity: 0.8,
    },
    limitReachedContainer: {
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    noMargin: {
      marginBottom: 0,
    },
    narrativeContainer: {
      gap: theme.spacing.md,
    },
    bannerButton: {
      marginTop: theme.spacing.md,
    },
    footerSpacing: {
      paddingHorizontal: theme.spacing.page,
      paddingVertical: theme.spacing.lg,
    },
    loadingText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.sm,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    insightTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    insightDesc: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
    },
    insightContent: {
      flex: 1,
    },
    aiBanner: {
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.primary + '20',
      borderWidth: 1,
    },
    aiBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    aiBannerIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiBannerTextContainer: {
      flex: 1,
    },
    aiBannerTitle: {
      ...theme.typography.titleMedium,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: 4,
    },
    aiBannerSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
    },
  });
}

export default React.memo(MoodAnalysisScreen);
