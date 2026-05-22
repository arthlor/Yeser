import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

import { ScreenHeader, ScreenLayout, ScreenSection } from '@/shared/components/layout';
import ErrorState from '@/shared/components/ui/ErrorState';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import InsightTeaserCard from '../components/InsightTeaserCard';
import { useLatestMoodInsight, useMoodAnalytics } from '../hooks';
import { useMoodInsights } from '../hooks/useMoodInsights';
import { getInsightSnapshotAgeInDays } from '../utils/insightSnapshot';
import { AIUsageIndicator } from '@/shared/components/ui/AIUsageIndicator';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import { useSubscription } from '@/hooks/useSubscription';
import { analyticsService } from '@/services/analyticsService';
import type { AppStackParamList } from '@/types/navigation';
import type { MoodAnalyticsRange } from '@/types/moodAnalytics.types';
import { AppTheme } from '@/themes/types';

type MoodAnalysisNavigationProp = NativeStackNavigationProp<AppStackParamList, 'MoodAnalysis'>;
type MoodAnalysisRouteProp = RouteProp<AppStackParamList, 'MoodAnalysis'>;

const DEFAULT_RANGE: MoodAnalyticsRange = '30d';
const DAILY_LIMIT_ERROR = 'Daily limit reached';
const BOARD_PALETTE = {
  pinShadowCoral: '#FF8A64',
  pinShadowBlue: '#5B7FFF',
  pinShadowViolet: '#8A5BFF',
  pinShadowTeal: '#33D1C6',
  pinCoral: '#FF7A59',
  pinBlue: '#4C7DFF',
  pinViolet: '#8A5CFF',
  pinTeal: '#2ECFC2',
  paper: '#F8F7F3',
  paperBorder: 'rgba(255,255,255,0.4)',
  paperShadow: '#000000',
  pinBorder: 'rgba(255,255,255,0.36)',
  tonePeach: '#FFE9DE',
  tonePeachBorder: '#F9D2C0',
  toneBlue: '#E6EEFF',
  toneBlueBorder: '#CCD8FF',
  toneViolet: '#F0E5FF',
  toneVioletBorder: '#DFC7FF',
  toneMint: '#DDF7F1',
  toneMintBorder: '#BFE9E0',
  textStrong: '#171A22',
  textBody: '#3C4254',
  stepPeach: '#E16A41',
  stepBlue: '#4763D9',
  stepViolet: '#7A4AE3',
  stepMint: '#148B80',
} as const;

const isDailyLimitError = (value: unknown) => {
  const message = value instanceof Error ? value.message : String(value ?? '');
  return message.toLowerCase().includes(DAILY_LIMIT_ERROR.toLowerCase());
};

const MoodAnalysisScreen: React.FC = () => {
  const navigation = useNavigation<MoodAnalysisNavigationProp>();
  const route = useRoute<MoodAnalysisRouteProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedRange, setSelectedRange] = useState<MoodAnalyticsRange>(
    route.params?.initialRange ?? DEFAULT_RANGE
  );
  const { data, error, isLoading, isRefetching, refetch } = useMoodAnalytics(selectedRange);

  const rangeOptions = useMemo(() => {
    const isEntryBased = selectedRange.endsWith('e');
    const optionsList: MoodAnalyticsRange[] = isEntryBased
      ? ['5e', '15e', '30e']
      : ['15d', '30d', '90d'];
    return optionsList.map((value) => ({
      value,
      label: t(`mood.analysis.range.${value}`),
    }));
  }, [selectedRange, t]);
  useStreakData();
  const { isPro, checkGate } = useSubscription();
  const { snapshot: latestInsightSnapshot, hasEnoughData: hasEnoughInsightData } =
    useLatestMoodInsight(selectedRange);

  // Fetch AI Insights
  const {
    data: aiInsights,
    isLoading: isAiLoading,
    refetch: generateInsights,
    isRefetching: isAiRefetching,
    error: aiError,
  } = useMoodInsights(selectedRange);

  const [analysisRequested, setAnalysisRequested] = useState(false);
  const [headerHeight, setHeaderHeight] = useState<number>(120);
  const autoGenerateKeyRef = useRef<string | null>(null);

  const hasAnalytics = Boolean(data && data.overview.totalEntries > 0);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    analyticsService.logEvent('insight_refresh_requested', {
      source: 'insight_detail_refresh_button',
      range: selectedRange,
    });
    setAnalysisRequested(true);
    await generateInsights();
  }, [generateInsights, selectedRange]);

  const handleGenerateInsights = useCallback(async () => {
    analyticsService.logEvent('insight_reveal_requested', {
      source: route.params?.source ?? 'insights_screen',
      range: selectedRange,
      isPro,
    });

    if (!isPro) {
      checkGate('mood_analytics_deep_dive');
      return;
    }

    setAnalysisRequested(true);
    await generateInsights();
  }, [checkGate, generateInsights, isPro, route.params?.source, selectedRange]);

  const handleUnlockInsights = useCallback(() => {
    checkGate('mood_analytics_deep_dive');
  }, [checkGate]);

  useEffect(() => {
    analyticsService.logEvent('insight_deep_dive_opened', {
      source: route.params?.source ?? 'direct',
      range: route.params?.initialRange ?? DEFAULT_RANGE,
      isPro,
    });

    if (!isPro) {
      analyticsService.logEvent('insight_paywall_viewed', {
        source: route.params?.source ?? 'direct',
      });
    }
  }, [isPro, route.params?.initialRange, route.params?.source]);

  useEffect(() => {
    setAnalysisRequested(false);
  }, [selectedRange]);

  useEffect(() => {
    if (route.params?.initialRange) {
      setSelectedRange(route.params.initialRange);
    }
  }, [route.params?.initialRange]);

  useEffect(() => {
    if (!route.params?.autoGenerate || !hasEnoughInsightData) {
      return;
    }

    const key = `${selectedRange}:${route.params.source ?? 'auto'}`;
    if (autoGenerateKeyRef.current === key) {
      return;
    }

    autoGenerateKeyRef.current = key;
    void handleGenerateInsights();
  }, [
    handleGenerateInsights,
    hasEnoughInsightData,
    route.params?.autoGenerate,
    route.params?.source,
    selectedRange,
  ]);

  const visibleInsight =
    latestInsightSnapshot?.highlighted_insight ?? aiInsights?.highlighted_insight;
  const visibleNarrative = latestInsightSnapshot?.narrative ?? aiInsights?.narrative ?? null;
  const visibleRemaining = aiInsights?.remaining;
  const visibleResetInSeconds = aiInsights?.resetInSeconds;
  const visibleLimitError = aiInsights?.error;
  const isDailyLimitState =
    isDailyLimitError(visibleLimitError) || isDailyLimitError(aiError) || visibleRemaining === 0;
  const latestInsightMeta = useMemo(() => {
    const generatedAt = latestInsightSnapshot?.generated_at ?? aiInsights?.generated_at;

    if (!generatedAt) {
      return null;
    }

    const ageInDays = getInsightSnapshotAgeInDays(generatedAt);
    if (ageInDays <= 0) {
      return t('mood.analysis.home.updatedToday');
    }

    return t('mood.analysis.home.updatedDaysAgo', { count: ageInDays });
  }, [aiInsights?.generated_at, latestInsightSnapshot?.generated_at, t]);
  const isAiBusy = isAiLoading || isAiRefetching;
  const analysisStatus = useMemo(() => {
    if (isAiBusy) {
      return {
        tone: 'loading' as const,
        icon: 'progress-clock',
        title: t('mood.analysis.status.analyzingTitle', 'Preparing your insight'),
        message: t(
          'mood.analysis.status.analyzingMessage',
          'This can take a moment while we read the pattern across your gratitude entries.'
        ),
      };
    }

    if (isDailyLimitState) {
      return {
        tone: 'idle' as const,
        icon: 'clock-outline',
        title: t('mood.analysis.status.limitTitle', 'Daily insight limit reached'),
        message: t(
          'mood.analysis.status.limitMessage',
          "You have used today's AI insight refreshes. Your latest saved insight is still available."
        ),
      };
    }

    if (aiError || visibleLimitError) {
      return {
        tone: 'error' as const,
        icon: 'alert-circle-outline',
        title: t('mood.analysis.status.unavailableTitle', 'Insight could not be updated'),
        message: t(
          'mood.analysis.status.unavailableMessage',
          'We could not refresh the analysis right now. Try again in a moment.'
        ),
      };
    }

    if (visibleInsight || visibleNarrative || latestInsightSnapshot) {
      return {
        tone: 'ready' as const,
        icon: 'star-four-points',
        title: t('mood.analysis.status.readyTitle', 'Insight ready'),
        message: latestInsightMeta ?? t('mood.analysis.snapshot.stored'),
      };
    }

    if (hasEnoughInsightData) {
      return {
        tone: 'idle' as const,
        icon: 'lightbulb-on-outline',
        title: t('mood.analysis.status.readyToRevealTitle', 'Ready to reveal'),
        message: t(
          'mood.analysis.status.readyToRevealMessage',
          'Tap reveal and stay here while the analysis runs.'
        ),
      };
    }

    return {
      tone: 'idle' as const,
      icon: 'seed-outline',
      title: t('mood.analysis.status.seedTitle', 'Keep writing'),
      message: t(
        'mood.analysis.status.seedMessage',
        'A few more gratitude moments will make this insight more meaningful.'
      ),
    };
  }, [
    aiError,
    hasEnoughInsightData,
    isDailyLimitState,
    isAiBusy,
    latestInsightMeta,
    latestInsightSnapshot,
    t,
    visibleInsight,
    visibleLimitError,
    visibleNarrative,
  ]);
  const spotlightStatement = useMemo(() => {
    const statement = data?.highlightedStatements?.[0]?.statement;
    return typeof statement === 'string' ? statement.trim() : null;
  }, [data?.highlightedStatements]);
  const quoteCandidates = useMemo(() => {
    if (!data?.highlightedStatements?.length) {
      return [];
    }

    return data.highlightedStatements
      .map((item) => item.statement?.trim())
      .filter((statement): statement is string => Boolean(statement));
  }, [data?.highlightedStatements]);
  const randomQuote = useMemo(() => {
    if (!quoteCandidates.length) {
      return spotlightStatement;
    }

    const randomIndex = Math.floor(Math.random() * quoteCandidates.length);
    return quoteCandidates[randomIndex] ?? spotlightStatement;
  }, [quoteCandidates, spotlightStatement]);
  const insightContext = useMemo(
    () =>
      data
        ? {
            totalEntries: data.overview.totalEntries,
            analyzedStatements: data.overview.analyzedStatements,
            dominantMood: data.overview.dominantMood,
            balanceLabel: data.overview.balanceScore.label,
            range: selectedRange,
          }
        : null,
    [data, selectedRange]
  );

  const handleRangeChange = useCallback(
    (value: MoodAnalyticsRange) => {
      if (value === selectedRange) {
        return;
      }

      startTransition(() => {
        setSelectedRange(value);
      });
    },
    [selectedRange]
  );

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

          <View style={styles.mascotContainer}>
            <Image
              source={require('@/assets/assets/mascot2.png')}
              style={styles.mascotImage}
              contentFit="contain"
              transition={400}
            />
          </View>

          <Text style={styles.headerTitle}>{t('mood.analysis.title')}</Text>
        </View>

        <RangeSelectorChips
          options={rangeOptions}
          selectedValue={selectedRange}
          onValueChange={handleRangeChange}
          disabled
          styles={styles}
          theme={theme}
        />

        <InsightStatusStrip status={analysisStatus} styles={styles} theme={theme} />

        <ScreenSection spacing="large">
          {visibleInsight || analysisRequested || isAiBusy || aiError || visibleLimitError ? (
            <NarrativeSection
              narrative={visibleNarrative}
              insight={visibleInsight}
              isLoading={isAiBusy}
              styles={styles}
              t={t}
              theme={theme}
              error={aiError}
              remaining={visibleRemaining}
              resetInSeconds={visibleResetInSeconds}
              aiError={visibleLimitError}
              meta={latestInsightMeta}
              quote={randomQuote}
              context={insightContext}
              locked
              onUnlock={handleUnlockInsights}
            />
          ) : hasEnoughInsightData ? (
            <InsightTeaserCard
              title={t('mood.analysis.home.latestTitle')}
              description={t('mood.analysis.home.readyDescription')}
              promise={t('mood.analysis.promise')}
              ctaLabel={t('mood.analysis.home.cta.reveal')}
              onPress={() => void handleGenerateInsights()}
              emoji="✨"
              isLoading={isAiBusy}
              lockedLabel={t('mood.analysis.home.previewBadge')}
              variant="reference"
            />
          ) : (
            <InsightTeaserCard
              title={t('mood.analysis.home.seedTitle')}
              description={t('mood.analysis.home.seedDescription')}
              promise={t('mood.analysis.promise')}
              ctaLabel={t('mood.analysis.home.cta.seed')}
              onPress={() =>
                navigation.navigate('MainAppTabs', {
                  screen: 'DailyEntryTab',
                })
              }
              emoji="🌱"
              variant="reference"
            />
          )}
        </ScreenSection>

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
      {/* Mascot Overlay - positioned absolutely above everything; position uses measured header height */}
      <View style={[styles.mascotContainer, { top: Math.max(-20, headerHeight - 85) }]}>
        <Image
          source={require('@/assets/assets/mascot2.png')}
          style={styles.mascotImage}
          contentFit="contain"
          transition={400}
        />
      </View>

      <View style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
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

        <Text style={styles.headerTitle}>{t('mood.analysis.title')}</Text>
      </View>

      {/* Date Range Selector */}
      <RangeSelectorChips
        options={rangeOptions}
        selectedValue={selectedRange}
        onValueChange={handleRangeChange}
        disabled={isLoading || isRefetching}
        styles={styles}
        theme={theme}
      />

      <InsightStatusStrip status={analysisStatus} styles={styles} theme={theme} />

      {/* AI Insights Section */}
      <View style={styles.boardSection}>
        {visibleInsight ||
        visibleNarrative ||
        analysisRequested ||
        isAiBusy ||
        aiError ||
        visibleLimitError ? (
          <NarrativeSection
            narrative={visibleNarrative}
            insight={visibleInsight}
            isLoading={isAiBusy}
            styles={styles}
            t={t}
            theme={theme}
            error={aiError}
            remaining={visibleRemaining}
            resetInSeconds={visibleResetInSeconds}
            aiError={visibleLimitError}
            meta={latestInsightMeta}
            quote={randomQuote}
            context={insightContext}
          />
        ) : hasEnoughInsightData ? (
          <InsightTeaserCard
            title={t('mood.analysis.home.latestTitle')}
            description={t('mood.analysis.home.readyDescription')}
            promise={t('mood.analysis.promise')}
            ctaLabel={t('mood.analysis.banner.button', 'Reveal insight')}
            onPress={() => void handleGenerateInsights()}
            emoji="✨"
            isLoading={isAiBusy}
            variant="reference"
          />
        ) : (
          <InsightTeaserCard
            title={t('mood.analysis.home.seedTitle')}
            description={t('mood.analysis.home.seedDescription')}
            promise={t('mood.analysis.promise')}
            ctaLabel={t('mood.analysis.home.cta.seed')}
            onPress={() =>
              navigation.navigate('MainAppTabs', {
                screen: 'DailyEntryTab',
              })
            }
            emoji="🌱"
            variant="reference"
          />
        )}

        {(visibleInsight || visibleNarrative || latestInsightSnapshot) && hasEnoughInsightData ? (
          <View style={styles.narrativeActionRow}>
            <Text style={styles.snapshotMeta}>
              {latestInsightMeta ?? t('mood.analysis.snapshot.stored')}
            </Text>
            <ThemedButton
              title={
                isAiBusy
                  ? t('mood.analysis.status.updating', 'Updating...')
                  : t('mood.analysis.banner.button')
              }
              onPress={() => void handleGenerateInsights()}
              variant="outline"
              size="compact"
              disabled={isAiBusy}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.footerSpacing}>
        <ThemedButton
          title={
            isRefetching || isAiBusy
              ? t('mood.analysis.status.updating', 'Updating...')
              : t('mood.analysis.actions.refresh')
          }
          iconLeft="refresh"
          variant="outline"
          size="compact"
          onPress={handleRefresh}
          disabled={isRefetching || isAiBusy}
        />
      </View>
    </ScreenLayout>
  );
};

interface RangeSelectorChipsProps {
  options: Array<{ value: MoodAnalyticsRange; label: string }>;
  selectedValue: MoodAnalyticsRange;
  onValueChange: (value: MoodAnalyticsRange) => void;
  disabled?: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}

type InsightStatus = {
  tone: 'loading' | 'ready' | 'error' | 'idle';
  icon: string;
  title: string;
  message: string;
};

const InsightStatusStrip: React.FC<{
  status: InsightStatus;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}> = ({ status, styles, theme }) => {
  const color =
    status.tone === 'error'
      ? theme.colors.error
      : status.tone === 'ready'
        ? theme.colors.success
        : theme.colors.primary;

  return (
    <View style={styles.statusStrip}>
      <View style={[styles.statusIconWrap, { backgroundColor: color + '14' }]}>
        <Icon name={status.icon} size={18} color={color} />
      </View>
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>{status.title}</Text>
        <Text style={styles.statusMessage}>{status.message}</Text>
      </View>
    </View>
  );
};

const RangeSelectorChips: React.FC<RangeSelectorChipsProps> = ({
  options,
  selectedValue,
  onValueChange,
  disabled = false,
  styles,
  theme,
}) => {
  return (
    <View style={styles.rangeSelector}>
      <View style={styles.rangeRail}>
        {options.map((option) => {
          const isActive = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive, disabled }}
              disabled={disabled}
              onPress={() => onValueChange(option.value)}
              style={styles.rangePressable}
            >
              {isActive ? (
                <LinearGradient
                  colors={[theme.colors.primary + '24', theme.colors.primary + '10']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.rangePillActive}
                >
                  <Text style={styles.rangeLabelActive}>{option.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.rangePill}>
                  <Text style={styles.rangeLabel}>{option.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

interface NarrativeSectionProps {
  narrative?: {
    logical: string;
    emotional: string;
    suggestions: string[];
  } | null;
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
  meta?: string | null;
  quote?: string | null;
  context?: {
    totalEntries: number;
    analyzedStatements: number;
    dominantMood: string | null;
    balanceLabel: 'imbalanced' | 'neutral' | 'balanced';
    range: MoodAnalyticsRange;
  } | null;
  locked?: boolean;
  onUnlock?: () => void;
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
  meta,
  quote,
  context,
  locked = false,
  onUnlock,
}) => {
  if (isLoading) {
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <View style={styles.inlineLoader}>
          <View style={styles.inlineLoaderIcon}>
            <Icon name="progress-clock" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.loadingText}>
            {t('mood.analysis.narrative.loading', 'Analyzing your gratitude patterns...')}
          </Text>
        </View>
      </ThemedCard>
    );
  }

  const reachedDailyLimit =
    isDailyLimitError(aiError) || isDailyLimitError(error) || remaining === 0;

  // Handle specific AI limit reached error (200 OK with error field)
  if (reachedDailyLimit) {
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <View style={styles.limitReachedContainer}>
          <Icon name="clock-outline" size={32} color={theme.colors.primary} />
          <Text style={[styles.emptyTitle, styles.noMargin]}>
            {t('mood.analysis.status.limitTitle', 'Daily insight limit reached')}
          </Text>
          <Text style={styles.emptyMessage}>
            {t(
              'mood.analysis.status.limitMessage',
              "You have used today's AI insight refreshes. Your latest saved insight is still available."
            )}
          </Text>
          <AIUsageIndicator remaining={0} resetInSeconds={resetInSeconds} showAlways />
        </View>
      </ThemedCard>
    );
  }

  // Handle generic API error (4xx/5xx)
  if (error || aiError) {
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <Text style={[styles.emptyMessage, { color: theme.colors.error }]}>
          {t('mood.analysis.errors.revealFailed')}
        </Text>
      </ThemedCard>
    );
  }

  if (!narrative && !insight) {
    // Fallback if AI returns nothing
    return (
      <ThemedCard variant="filled" density="comfortable" elevation="floating">
        <Text style={styles.emptyMessage}>
          {t('mood.analysis.narrative.empty', 'Unlock insights by adding more entries.')}
        </Text>
      </ThemedCard>
    );
  }

  const steps = buildJourneySteps({ insight, narrative, quote, meta, context, t });

  return (
    <View style={styles.narrativeContainer}>
      <View style={styles.boardCanvas}>
        <View pointerEvents="none" style={styles.boardLines}>
          {Array.from({ length: Math.max(12, steps.length * 3) }).map((_, index) => (
            <View key={`line-${index}`} style={styles.boardLine} />
          ))}
        </View>

        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <InsightJourneyCard step={step} styles={styles} />
            {index < steps.length - 1 ? (
              <JourneyConnector
                direction={step.align === 'left' ? 'leftToRight' : 'rightToLeft'}
                styles={styles}
                theme={theme}
              />
            ) : null}
          </React.Fragment>
        ))}
      </View>

      {locked ? (
        <View style={styles.lockedBoardCard}>
          <View style={[styles.lockedPin, styles.pinTeal]} />
          <View style={styles.lockedBoardPaper}>
            <View style={[styles.lockedBoardInner, styles.lockedTone]}>
              <Text style={styles.lockedBoardIndex}>
                {String(steps.length + 1).padStart(2, '0')}
              </Text>
              <Text style={styles.lockedBoardTitle}>{t('mood.analysis.locked.title')}</Text>
              <Text style={styles.lockedBoardBody}>{t('mood.analysis.locked.subtitle')}</Text>
              {onUnlock ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  onPress={onUnlock}
                  style={styles.lockedBoardCta}
                >
                  <Text style={styles.lockedBoardCtaLabel}>
                    {t('subscription.paywall.upgradeToPro', 'Upgrade to Pro')}
                  </Text>
                  <Icon name="arrow-right" size={18} color={theme.colors.onPrimary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

type InsightJourneyStep = {
  id: string;
  index: string;
  title: string;
  body: string;
  align: 'left' | 'right';
  tone: 'peach' | 'blue' | 'violet' | 'mint';
  pin: 'coral' | 'blue' | 'violet' | 'teal';
  size: 'normal' | 'wide';
  showTitle: boolean;
  variant?: 'default' | 'reference';
  accentEmoji?: string | null;
};

type InsightJourneyCardProps = {
  step: InsightJourneyStep;
  styles: ReturnType<typeof createStyles>;
};

const InsightJourneyCard: React.FC<InsightJourneyCardProps> = ({ step, styles }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isWide = step.size === 'wide';
  const isReference = step.variant === 'reference';
  const collapsedLineCount = isWide ? 8 : 6;
  const [expanded, setExpanded] = useState(false);
  const canExpand = shouldEnableReadMore(step.body, isWide, collapsedLineCount);
  const rotation = isReference
    ? step.align === 'left'
      ? '-1deg'
      : '1deg'
    : isWide
      ? step.align === 'left'
        ? '-1deg'
        : '1deg'
      : step.align === 'left'
        ? '-4deg'
        : '4deg';
  const toneStyle = getToneStyle(step.tone, styles);
  const stepColorStyle = getStepColorStyle(step.tone, styles);
  const pinStyle = getPinStyle(step.pin, styles);
  const pinShadowStyle = getPinShadowStyle(step.pin, styles);
  const fadeColor = getToneFadeColor(step.tone);
  const readMoreColor = getToneReadMoreColor(step.tone);

  if (isReference) {
    return (
      <View
        style={[
          styles.referenceCardWrap,
          step.align === 'left' ? styles.journeyCardLeft : styles.journeyCardRight,
          { transform: [{ rotate: rotation }] },
        ]}
      >
        <View style={styles.referenceGlow} />

        <View style={styles.referenceCardShell}>
          <LinearGradient
            colors={[theme.colors.surface + 'F7', theme.colors.background + 'FB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.referenceHeadRow}>
            <View style={styles.referenceTag}>
              <Icon name="bookmark-outline" size={13} color={theme.colors.primary} />
              <Text style={styles.referenceTagText}>
                {t('mood.analysis.board.referenceTag', 'REFERENCE')}
              </Text>
            </View>
            <Text style={styles.referenceStepIndex}>{step.index}</Text>
          </View>

          {step.showTitle ? <Text style={styles.referenceTitle}>{step.title}</Text> : null}

          <View style={styles.referenceBodyWrap}>
            <Text
              numberOfLines={expanded ? undefined : collapsedLineCount}
              style={styles.referenceBody}
            >
              {step.body}
            </Text>
            {canExpand && !expanded ? (
              <LinearGradient
                pointerEvents="none"
                colors={[
                  theme.colors.surface + '00',
                  theme.colors.surface + 'C8',
                  theme.colors.surface + 'F4',
                ]}
                style={styles.referenceBodyFade}
              />
            ) : null}
          </View>

          {canExpand ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={() => setExpanded((current) => !current)}
              style={styles.referenceReadMoreButton}
            >
              <Icon
                name={expanded ? 'unfold-less-vertical' : 'unfold-more-vertical'}
                size={15}
                color={theme.colors.primary}
              />
              <Text style={styles.referenceReadMoreLabel}>
                {expanded
                  ? t('mood.analysis.board.readLess', 'Daha az göster')
                  : t('mood.analysis.board.readMore', 'Devamını gör')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.journeyCardWrap,
        isWide ? styles.journeyCardWide : null,
        step.align === 'left' ? styles.journeyCardLeft : styles.journeyCardRight,
        { transform: [{ rotate: rotation }] },
      ]}
    >
      <View style={[styles.pinShadow, pinShadowStyle]} />
      <View style={[styles.journeyPin, pinStyle]} />

      <View style={styles.journeyPaper}>
        <View style={[styles.journeyInner, toneStyle, isWide ? styles.journeyInnerWide : null]}>
          <View style={styles.journeyCardHeader}>
            <Text style={[styles.journeyStepIndex, stepColorStyle]}>{step.index}</Text>
            {step.accentEmoji ? (
              <Text style={styles.journeyAccentEmoji}>{step.accentEmoji}</Text>
            ) : null}
          </View>
          {step.showTitle ? <Text style={styles.journeyStepTitle}>{step.title}</Text> : null}
          <View style={styles.journeyBodyWrap}>
            <Text
              numberOfLines={expanded ? undefined : collapsedLineCount}
              style={styles.journeyStepBody}
            >
              {step.body}
            </Text>
            {canExpand && !expanded ? (
              <LinearGradient
                pointerEvents="none"
                colors={[`${fadeColor}00`, `${fadeColor}DA`, fadeColor]}
                style={styles.journeyBodyFade}
              />
            ) : null}
          </View>
          {canExpand ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.85}
              onPress={() => setExpanded((current) => !current)}
              style={[
                styles.readMoreButton,
                {
                  borderColor: `${readMoreColor}5C`,
                  backgroundColor: `${readMoreColor}14`,
                },
              ]}
            >
              <View
                style={[
                  styles.readMoreBadge,
                  {
                    backgroundColor: `${readMoreColor}24`,
                  },
                ]}
              >
                <Icon
                  name={expanded ? 'text-box-minus-outline' : 'text-box-plus-outline'}
                  size={14}
                  color={readMoreColor}
                />
              </View>
              <Text style={[styles.readMoreLabel, { color: readMoreColor }]}>
                {expanded
                  ? t('mood.analysis.board.readLess', 'Daha az göster')
                  : t('mood.analysis.board.readMore', 'Devamını gör')}
              </Text>
              <Icon
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={readMoreColor}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

type JourneyConnectorProps = {
  direction: 'leftToRight' | 'rightToLeft';
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
};

const JourneyConnector: React.FC<JourneyConnectorProps> = ({ direction, styles, theme }) => {
  const d =
    direction === 'leftToRight'
      ? 'M 28 14 C 96 14, 188 92, 260 92'
      : 'M 260 14 C 190 14, 98 92, 28 92';

  return (
    <View pointerEvents="none" style={styles.connectorWrap}>
      <Svg width="100%" height="100%" viewBox="0 0 288 106">
        <Path
          d={d}
          fill="none"
          stroke={theme.colors.primary + '50'}
          strokeDasharray="7 8"
          strokeLinecap="round"
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
};

function buildJourneySteps({
  insight,
  narrative,
  quote,
  meta,
  context,
  t,
}: {
  insight?: {
    title: string;
    description: string;
    emoji: string;
  } | null;
  narrative?: {
    logical: string;
    emotional: string;
    suggestions: string[];
  } | null;
  quote?: string | null;
  meta?: string | null;
  context?: {
    totalEntries: number;
    analyzedStatements: number;
    dominantMood: string | null;
    balanceLabel: 'imbalanced' | 'neutral' | 'balanced';
    range: MoodAnalyticsRange;
  } | null;
  t: TFunction<'translation'>;
}): InsightJourneyStep[] {
  const dominantMoodLabel = context?.dominantMood
    ? t(`mood.analysis.moods.${context.dominantMood}`)
    : t('mood.analysis.overview.noDominantMood');
  const balanceLabel = context ? t(`mood.analysis.balance.${context.balanceLabel}`) : null;
  const widerPictureBody = context
    ? `${
        context.range.endsWith('e')
          ? t('mood.analysis.overview.entriesExplanationEntries', {
              count: context.totalEntries,
              defaultValue: `This overview reflects the emotional patterns emerging across your last ${context.totalEntries} entries.`,
            })
          : t('mood.analysis.overview.entriesExplanation', {
              count: context.totalEntries,
              days: parseInt(context.range, 10),
            })
      } ${t('mood.analysis.board.contextBody', {
        statements: context.analyzedStatements,
        dominantMood: dominantMoodLabel,
        balance: balanceLabel ?? '',
      })}`
    : (meta ?? t('mood.analysis.promise'));
  const suggestionItems = narrative?.suggestions?.length
    ? normalizeSuggestionItems(narrative.suggestions)
    : [t('mood.analysis.narrative.empty')];
  const quoteBody = quote ? `"${quote}"` : (meta ?? t('mood.analysis.snapshot.stored'));

  const seeds: Array<{
    id: string;
    title: string;
    body: string;
    showTitleOnFirstSegment?: boolean;
    accentEmoji?: string | null;
    tone?: InsightJourneyStep['tone'];
    pin?: InsightJourneyStep['pin'];
    variant?: InsightJourneyStep['variant'];
  }> = [
    {
      id: 'insight',
      title: insight?.title ?? t('mood.analysis.sections.narrative.title'),
      body: insight?.description ?? meta ?? t('mood.analysis.promise'),
      accentEmoji: insight?.emoji ?? null,
      tone: 'peach',
      pin: 'coral',
    },
    {
      id: 'context',
      title: t('mood.analysis.board.widerPictureTitle', 'The wider picture'),
      body: widerPictureBody,
      tone: 'blue',
      pin: 'blue',
    },
    {
      id: 'logical',
      title: t('mood.analysis.narrative.logical'),
      body: narrative?.logical ?? t('mood.analysis.narrative.empty'),
      tone: 'violet',
      pin: 'violet',
    },
    {
      id: 'emotional',
      title: t('mood.analysis.narrative.emotional'),
      body: narrative?.emotional ?? t('mood.analysis.narrative.empty'),
      tone: 'mint',
      pin: 'coral',
    },
    {
      id: 'suggestion-anchor',
      title: t('mood.analysis.narrative.suggestions'),
      body: '',
      showTitleOnFirstSegment: false,
    },
    {
      id: 'quote',
      title: t('mood.analysis.board.quoteTitle', 'One of your gratitudes said...'),
      body: quoteBody,
      tone: 'blue',
      pin: 'blue',
      variant: 'reference',
    },
  ];

  const suggestionSeeds = suggestionItems.map((suggestion, index) => ({
    id: `suggestion-${index + 1}`,
    title: t('mood.analysis.narrative.suggestions'),
    body: `${index + 1}. ${suggestion}`,
    showTitleOnFirstSegment: index === 0,
    accentEmoji: null,
    tone: 'peach' as const,
    pin: 'violet' as const,
    variant: 'default' as const,
  }));

  const mergedSeeds = [...seeds.slice(0, 4), ...suggestionSeeds, ...seeds.slice(5)].filter(
    (seed) => seed.body.trim().length > 0
  );

  const toneCycle: InsightJourneyStep['tone'][] = ['peach', 'blue', 'violet', 'mint'];
  const pinCycle: InsightJourneyStep['pin'][] = ['coral', 'blue', 'violet', 'teal'];

  const expanded = mergedSeeds.flatMap((seed) => {
    const segments = splitTextForCards(seed.body, { targetChars: 260, maxChars: 340 });
    return segments.map((segment, segmentIndex) => ({
      id: `${seed.id}-${segmentIndex}`,
      title: seed.title,
      body: segment,
      accentEmoji: segmentIndex === 0 ? seed.accentEmoji : null,
      showTitle: segmentIndex === 0 && (seed.showTitleOnFirstSegment ?? true),
      tone: seed.tone,
      pin: seed.pin,
      variant: seed.variant,
    }));
  });

  return expanded.map((step, index) => ({
    id: step.id,
    index: String(index + 1).padStart(2, '0'),
    title: step.title,
    body: step.body,
    accentEmoji: step.accentEmoji,
    showTitle: step.showTitle,
    align: index % 2 === 0 ? 'left' : 'right',
    tone: step.tone ?? toneCycle[index % toneCycle.length],
    pin: step.pin ?? pinCycle[index % pinCycle.length],
    size: step.body.length > 220 ? 'wide' : 'normal',
    variant: step.variant ?? 'default',
  }));
}

function splitTextForCards(
  value: string,
  options?: {
    targetChars?: number;
    maxChars?: number;
  }
) {
  const targetChars = options?.targetChars ?? 240;
  const maxChars = options?.maxChars ?? 320;
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return [];
  }

  const sentenceMatches = normalized.match(/[^.!?]+[.!?]*/g);
  const sentences = (sentenceMatches ?? [normalized])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const segments: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (!current) {
      if (sentence.length <= maxChars) {
        current = sentence;
        continue;
      }

      const chunks = splitLongSentence(sentence, maxChars);
      segments.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1] ?? '';
      continue;
    }

    const candidate = `${current} ${sentence}`.trim();
    if (candidate.length <= targetChars) {
      current = candidate;
      continue;
    }

    segments.push(current);

    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }

    const chunks = splitLongSentence(sentence, maxChars);
    segments.push(...chunks.slice(0, -1));
    current = chunks[chunks.length - 1] ?? '';
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function splitLongSentence(sentence: string, maxChars: number) {
  const words = sentence.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      chunks.push(...splitVeryLongWord(word, maxChars));
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }
    current = word;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitVeryLongWord(word: string, maxChars: number) {
  const parts: string[] = [];
  let cursor = 0;

  while (cursor < word.length) {
    parts.push(word.slice(cursor, cursor + maxChars));
    cursor += maxChars;
  }

  return parts;
}

function normalizeSuggestionItems(rawSuggestions: string[]) {
  const items = rawSuggestions
    .flatMap((suggestion) => splitSuggestionBlob(suggestion))
    .map((item) => stripLeadingNumbering(item))
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (!items.length) {
    return [];
  }

  return items;
}

function splitSuggestionBlob(value: string) {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  // If AI returns all suggestions in one string (e.g., "1. ... 2. ... 3. ..."), split it deterministically.
  const withDelimiters = normalized
    .replace(/\n+/g, '|')
    .replace(/[•]\s*/g, '|')
    .replace(/\s+(?=\d+[.)]\s)/g, '|');

  const chunks = withDelimiters
    .split('|')
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return chunks.length ? chunks : [normalized];
}

function stripLeadingNumbering(value: string) {
  return value.replace(/^\s*\d+[.)]\s*/, '').replace(/^\s*[-–]\s*/, '');
}

function shouldEnableReadMore(text: string, isWide: boolean, collapsedLineCount: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return false;
  }

  const charsPerLine = isWide ? 48 : 38;
  const estimatedLines = Math.ceil(normalized.length / charsPerLine);

  // Keep deterministic fallback thresholds so the button appears even if runtime text measurement is unreliable.
  const hardThreshold = isWide ? 220 : 160;
  return normalized.length >= hardThreshold || estimatedLines > collapsedLineCount;
}

function getToneStyle(tone: InsightJourneyStep['tone'], styles: ReturnType<typeof createStyles>) {
  switch (tone) {
    case 'peach':
      return styles.tonePeach;
    case 'blue':
      return styles.toneBlue;
    case 'violet':
      return styles.toneViolet;
    case 'mint':
      return styles.toneMint;
  }
}

function getStepColorStyle(
  tone: InsightJourneyStep['tone'],
  styles: ReturnType<typeof createStyles>
) {
  switch (tone) {
    case 'peach':
      return styles.stepPeach;
    case 'blue':
      return styles.stepBlue;
    case 'violet':
      return styles.stepViolet;
    case 'mint':
      return styles.stepMint;
  }
}

function getPinStyle(pin: InsightJourneyStep['pin'], styles: ReturnType<typeof createStyles>) {
  switch (pin) {
    case 'coral':
      return styles.pinCoral;
    case 'blue':
      return styles.pinBlue;
    case 'violet':
      return styles.pinViolet;
    case 'teal':
      return styles.pinTeal;
  }
}

function getPinShadowStyle(
  pin: InsightJourneyStep['pin'],
  styles: ReturnType<typeof createStyles>
) {
  switch (pin) {
    case 'coral':
      return styles.pinShadowCoral;
    case 'blue':
      return styles.pinShadowBlue;
    case 'violet':
      return styles.pinShadowViolet;
    case 'teal':
      return styles.pinShadowTeal;
  }
}

function getToneFadeColor(tone: InsightJourneyStep['tone']) {
  switch (tone) {
    case 'peach':
      return BOARD_PALETTE.tonePeach;
    case 'blue':
      return BOARD_PALETTE.toneBlue;
    case 'violet':
      return BOARD_PALETTE.toneViolet;
    case 'mint':
      return BOARD_PALETTE.toneMint;
  }
}

function getToneReadMoreColor(tone: InsightJourneyStep['tone']) {
  switch (tone) {
    case 'peach':
      return BOARD_PALETTE.stepPeach;
    case 'blue':
      return BOARD_PALETTE.stepBlue;
    case 'violet':
      return BOARD_PALETTE.stepViolet;
    case 'mint':
      return BOARD_PALETTE.stepMint;
  }
}

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
      paddingTop: 2,
      alignItems: 'center',
    },
    backButton: {
      marginBottom: theme.spacing.sm,
      alignSelf: 'flex-start',
      marginLeft: -theme.spacing.xs,
    },
    headerTitle: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      fontWeight: '700',
      fontFamily: 'Lora-Bold',
      textAlign: 'center',
      paddingHorizontal: 60,
    },
    rangeSelector: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
      marginTop: theme.spacing.md,
    },
    rangeRail: {
      flexDirection: 'row',
      gap: 2,
      padding: 2,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant + '60',
      borderWidth: 1,
      borderColor: theme.colors.outline + '0D',
    },
    rangePressable: {
      flex: 1,
    },
    rangePill: {
      minHeight: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    rangePillActive: {
      minHeight: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.primary + '14',
      borderWidth: 1.2,
      borderColor: theme.colors.primary + '40',
    },
    rangeLabel: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      opacity: 0.7,
    },
    rangeLabelActive: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      fontWeight: '800',
    },
    statusStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: theme.spacing.page,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      gap: theme.spacing.sm,
    },
    statusIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusCopy: {
      flex: 1,
      gap: 2,
    },
    statusTitle: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
      fontWeight: '800',
    },
    statusMessage: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
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
    inlineLoaderIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary + '14',
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
      gap: theme.spacing.lg,
    },
    narrativeActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    snapshotMeta: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    boardSection: {
      paddingHorizontal: theme.spacing.page,
      gap: theme.spacing.md,
    },
    boardCanvas: {
      position: 'relative',
      overflow: 'visible',
      borderRadius: theme.borderRadius.xxl,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.background + '00',
      borderWidth: 0,
    },
    boardLines: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'space-evenly',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
    },
    boardLine: {
      height: 1,
      backgroundColor: theme.colors.onSurface + '08',
    },
    journeyCardWrap: {
      width: '86%',
      position: 'relative',
      marginHorizontal: theme.spacing.xs,
    },
    journeyCardWide: {
      width: '94%',
    },
    journeyCardLeft: {
      alignSelf: 'flex-start',
    },
    journeyCardRight: {
      alignSelf: 'flex-end',
    },
    referenceCardWrap: {
      width: '94%',
      position: 'relative',
      marginHorizontal: theme.spacing.xs,
    },
    referenceGlow: {
      position: 'absolute',
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderRadius: 30,
      backgroundColor: theme.colors.primary + '12',
      opacity: 0.65,
    },
    referenceCardShell: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 26,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + '24',
      backgroundColor: theme.colors.surface + 'F4',
      shadowColor: theme.colors.background,
      shadowOpacity: 0.26,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    referenceHeadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    referenceTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.full || 999,
      backgroundColor: theme.colors.primary + '14',
      borderWidth: 1,
      borderColor: theme.colors.primary + '2D',
    },
    referenceTagText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      letterSpacing: 0.7,
    },
    referenceStepIndex: {
      ...theme.typography.titleSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    referenceTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onBackground,
      fontFamily: theme.typography.fontFamilySerifMedium || 'Lora-Medium',
      lineHeight: 31,
      marginBottom: theme.spacing.sm,
    },
    referenceBodyWrap: {
      position: 'relative',
    },
    referenceBody: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      lineHeight: 25,
      opacity: 0.92,
    },
    referenceBodyFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 44,
    },
    referenceReadMoreButton: {
      marginTop: theme.spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.borderRadius.full || 999,
      borderWidth: 1,
      borderColor: theme.colors.primary + '34',
      backgroundColor: theme.colors.primary + '14',
    },
    referenceReadMoreLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    pinShadow: {
      position: 'absolute',
      top: 2,
      left: '50%',
      width: 28,
      height: 28,
      borderRadius: 14,
      marginLeft: -14,
      opacity: 0.32,
      zIndex: 3,
    },
    pinShadowCoral: {
      backgroundColor: BOARD_PALETTE.pinShadowCoral,
    },
    pinShadowBlue: {
      backgroundColor: BOARD_PALETTE.pinShadowBlue,
    },
    pinShadowViolet: {
      backgroundColor: BOARD_PALETTE.pinShadowViolet,
    },
    pinShadowTeal: {
      backgroundColor: BOARD_PALETTE.pinShadowTeal,
    },
    journeyPin: {
      position: 'absolute',
      top: -2,
      left: '50%',
      width: 24,
      height: 24,
      borderRadius: 12,
      marginLeft: -12,
      borderWidth: 2,
      borderColor: BOARD_PALETTE.pinBorder,
      zIndex: 4,
      shadowColor: BOARD_PALETTE.paperShadow,
      shadowOpacity: 0.16,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    pinCoral: {
      backgroundColor: BOARD_PALETTE.pinCoral,
    },
    pinBlue: {
      backgroundColor: BOARD_PALETTE.pinBlue,
    },
    pinViolet: {
      backgroundColor: BOARD_PALETTE.pinViolet,
    },
    pinTeal: {
      backgroundColor: BOARD_PALETTE.pinTeal,
    },
    journeyPaper: {
      borderRadius: 30,
      padding: 14,
      backgroundColor: BOARD_PALETTE.paper,
      borderWidth: 1,
      borderColor: BOARD_PALETTE.paperBorder,
      shadowColor: BOARD_PALETTE.paperShadow,
      shadowOpacity: 0.18,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 12,
    },
    journeyInner: {
      borderRadius: 24,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      minHeight: 168,
      borderWidth: 1,
    },
    journeyInnerWide: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
      minHeight: 206,
    },
    tonePeach: {
      backgroundColor: BOARD_PALETTE.tonePeach,
      borderColor: BOARD_PALETTE.tonePeachBorder,
    },
    toneBlue: {
      backgroundColor: BOARD_PALETTE.toneBlue,
      borderColor: BOARD_PALETTE.toneBlueBorder,
    },
    toneViolet: {
      backgroundColor: BOARD_PALETTE.toneViolet,
      borderColor: BOARD_PALETTE.toneVioletBorder,
    },
    toneMint: {
      backgroundColor: BOARD_PALETTE.toneMint,
      borderColor: BOARD_PALETTE.toneMintBorder,
    },
    journeyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.sm,
      minHeight: 34,
    },
    journeyStepIndex: {
      fontSize: 36,
      lineHeight: 40,
      fontFamily: theme.typography.fontFamilySerifMedium || 'Lora-Medium',
      fontWeight: '600',
      letterSpacing: 0.3,
      minWidth: 52,
      textAlign: 'left',
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    stepPeach: {
      color: BOARD_PALETTE.stepPeach,
    },
    stepBlue: {
      color: BOARD_PALETTE.stepBlue,
    },
    stepViolet: {
      color: BOARD_PALETTE.stepViolet,
    },
    stepMint: {
      color: BOARD_PALETTE.stepMint,
    },
    journeyAccentEmoji: {
      fontSize: 18,
      marginTop: 2,
    },
    journeyStepTitle: {
      fontSize: 21,
      lineHeight: 27,
      fontWeight: '800',
      color: BOARD_PALETTE.textStrong,
      letterSpacing: -0.4,
      marginBottom: theme.spacing.sm,
    },
    journeyStepBody: {
      ...theme.typography.bodyMedium,
      color: BOARD_PALETTE.textBody,
      lineHeight: 24,
      fontWeight: '500',
    },
    journeyBodyWrap: {
      position: 'relative',
    },
    journeyBodyFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 44,
    },
    readMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      shadowColor: theme.colors.onBackground,
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    readMoreBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readMoreLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    connectorWrap: {
      height: 94,
      marginVertical: -8,
      justifyContent: 'center',
    },
    lockedBoardCard: {
      alignSelf: 'flex-end',
      width: '86%',
      position: 'relative',
      transform: [{ rotate: '4deg' }],
      marginTop: theme.spacing.sm,
    },
    lockedPin: {
      position: 'absolute',
      top: -2,
      left: '50%',
      width: 24,
      height: 24,
      borderRadius: 12,
      marginLeft: -12,
      borderWidth: 2,
      borderColor: BOARD_PALETTE.pinBorder,
      zIndex: 3,
    },
    lockedBoardPaper: {
      borderRadius: 30,
      padding: 14,
      backgroundColor: BOARD_PALETTE.paper,
      borderWidth: 1,
      borderColor: BOARD_PALETTE.paperBorder,
      shadowColor: BOARD_PALETTE.paperShadow,
      shadowOpacity: 0.18,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 12,
    },
    lockedBoardInner: {
      borderRadius: 24,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      borderWidth: 1,
      gap: theme.spacing.sm,
    },
    lockedTone: {
      backgroundColor: BOARD_PALETTE.toneMint,
      borderColor: BOARD_PALETTE.toneMintBorder,
    },
    lockedBoardIndex: {
      fontSize: 36,
      lineHeight: 40,
      fontFamily: theme.typography.fontFamilySerifMedium || 'Lora-Medium',
      fontWeight: '600',
      color: BOARD_PALETTE.stepMint,
      minWidth: 52,
      textAlign: 'left',
      includeFontPadding: false,
      fontVariant: ['tabular-nums'],
    },
    lockedBoardTitle: {
      fontSize: 22,
      lineHeight: 27,
      fontWeight: '800',
      color: BOARD_PALETTE.textStrong,
      letterSpacing: -0.3,
    },
    lockedBoardBody: {
      ...theme.typography.bodyMedium,
      color: BOARD_PALETTE.textBody,
      lineHeight: 26,
      fontWeight: '500',
    },
    lockedBoardCta: {
      minHeight: 46,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    lockedBoardCtaLabel: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimary,
      fontWeight: '800',
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
    mascotContainer: {
      position: 'absolute',
      right: -20,
      top: -15,
      width: 110,
      height: 110,
      zIndex: 10,
      opacity: 0.95,
      pointerEvents: 'none',
    },
    mascotImage: {
      width: '100%',
      height: '100%',
    },
    featuredInsightCard: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.primary + '16',
    },
    featuredGlow: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: theme.colors.primary + '16',
    },
    featuredGlowTop: {
      width: 220,
      height: 220,
      top: -130,
      right: -40,
    },
    featuredGlowBottom: {
      width: 180,
      height: 180,
      bottom: -95,
      left: -25,
      backgroundColor: theme.colors.accent + '10',
    },
    featuredInsightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    featuredEmojiFrame: {
      width: 78,
      height: 78,
      borderRadius: 39,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
    },
    featuredEmojiGradient: {
      width: '100%',
      height: '100%',
      borderRadius: 39,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featuredInsightEmoji: {
      fontSize: 34,
    },
    featuredInsightCopy: {
      flex: 1,
    },
    featuredEyebrow: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 1.1,
      marginBottom: 6,
    },
    featuredInsightTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
      lineHeight: 42,
    },
    featuredInsightDescription: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 32,
      marginTop: theme.spacing.lg,
    },
    featuredMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '18',
    },
    featuredMetaText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    readingCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline + '16',
    },
    readingSection: {
      gap: theme.spacing.sm,
    },
    readingHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    readingMarker: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    readingMarkerSoft: {
      backgroundColor: theme.colors.accent,
    },
    readingLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    readingBody: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 30,
    },
    readingDivider: {
      height: 1,
      backgroundColor: theme.colors.outline + '18',
      marginVertical: theme.spacing.lg,
    },
    suggestionCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.primary + '12',
    },
    suggestionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    suggestionHeading: {
      ...theme.typography.titleMedium,
      color: theme.colors.onBackground,
      fontFamily: theme.typography.fontFamilySerifMedium || 'Lora-Medium',
    },
    suggestionHeadingLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outline + '24',
    },
    suggestionPillList: {
      gap: theme.spacing.sm,
    },
    suggestionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.primary + '0E',
      borderWidth: 1,
      borderColor: theme.colors.primary + '16',
    },
    suggestionIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    suggestionPillText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 1,
      lineHeight: 24,
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
