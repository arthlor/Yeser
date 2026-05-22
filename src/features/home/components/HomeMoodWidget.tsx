import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useGratitudeTotalCount } from '@/features/gratitude/hooks';
import { useLatestMoodInsight, useMoodInsights } from '@/features/mood/hooks';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import type { AppStackParamList } from '@/types/navigation';
import { logger } from '@/utils/debugConfig';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

interface HomeMoodWidgetProps {
  onWritePress?: () => void;
}

export const HomeMoodWidget: React.FC<HomeMoodWidgetProps> = React.memo(({ onWritePress }) => {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { isPro, checkGate } = useSubscription();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDark = theme.name === 'dark';
  const locale = i18n.language === 'tr' ? 'tr-TR' : i18n.language;

  const { data: totalEntriesCount, isLoading: isTotalCountLoading } = useGratitudeTotalCount();
  const totalEntries = totalEntriesCount ?? 0;

  const range = useMemo(() => {
    if (totalEntries >= 30) {
      return '30e';
    }
    if (totalEntries >= 15) {
      return '15e';
    }
    return '5e';
  }, [totalEntries]);

  const { snapshot, isLoading: isSnapshotLoading } = useLatestMoodInsight(range);
  const {
    isFetching: isAiFetching,
    refetch: triggerAnalysis,
    error: aiError,
  } = useMoodInsights(range);

  const isAnalyzing = isAiFetching;
  const [snapshotLoadFinished, setSnapshotLoadFinished] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const autoFetchStartedRef = useRef(false);
  const autoFetchFailedRef = useRef(false);
  const lastStateKeyRef = useRef('');

  useEffect(() => {
    if (!isSnapshotLoading) {
      setSnapshotLoadFinished(true);
    }
  }, [isSnapshotLoading]);

  const stateKey = `${range}-${totalEntries}-${snapshot?.generated_at ?? ''}`;
  if (lastStateKeyRef.current !== stateKey) {
    lastStateKeyRef.current = stateKey;
    autoFetchStartedRef.current = false;
    autoFetchFailedRef.current = false;
  }

  const hasNewEntries = useMemo(() => {
    if (!snapshot) {
      return false;
    }
    return totalEntries > (snapshot.entry_count_at_generation ?? 0);
  }, [snapshot, totalEntries]);

  useEffect(() => {
    if (!isPro) {
      return;
    }
    if (autoFetchStartedRef.current || autoFetchFailedRef.current) {
      return;
    }
    if (!snapshotLoadFinished || isSnapshotLoading || isAiFetching) {
      return;
    }
    if (totalEntries < 5) {
      return;
    }
    if (snapshot && !hasNewEntries) {
      return;
    }

    autoFetchStartedRef.current = true;
    triggerAnalysis().catch((err) => {
      logger.error('Failed to auto-trigger mood insights analysis', err);
      autoFetchFailedRef.current = true;
    });
  }, [
    hasNewEntries,
    isAiFetching,
    isPro,
    isSnapshotLoading,
    snapshot,
    snapshotLoadFinished,
    totalEntries,
    triggerAnalysis,
  ]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalyzingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setAnalyzingStep((current) => (current + 1) % 3);
    }, 2500);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const analyzingTexts = useMemo(
    () => [
      t('mood.analysis.status.reading', 'Reading gratitude entries...'),
      t('mood.analysis.status.patterns', 'Detecting emotional patterns...'),
      t('mood.analysis.status.generating', 'Generating deep insights...'),
    ],
    [t]
  );

  const handlePaywallPress = useCallback(() => {
    analyticsService.logEvent('home_mood_widget_paywall_tapped');
    checkGate('mood_analytics_home');
  }, [checkGate]);

  const handleWidgetPress = useCallback(() => {
    if (!isPro) {
      handlePaywallPress();
      return;
    }
    analyticsService.logEvent('home_mood_widget_tapped');
    navigation.navigate('MoodAnalysis', {
      initialRange: range,
      source: 'home_mood_widget',
    });
  }, [handlePaywallPress, isPro, navigation, range]);

  const handleWritePress = useCallback(() => {
    analyticsService.logEvent('home_mood_widget_write_tapped');
    if (onWritePress) {
      onWritePress();
      return;
    }
    navigation.navigate('MainAppTabs', { screen: 'DailyEntryTab' });
  }, [navigation, onWritePress]);

  const handleUpdateAnalysis = useCallback(async () => {
    try {
      analyticsService.logEvent('home_mood_widget_update_tapped', { range });
      autoFetchFailedRef.current = false;
      await triggerAnalysis();
    } catch (err) {
      logger.error(
        'Failed to trigger mood insights analysis update',
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }, [range, triggerAnalysis]);

  const handleInsightPress = useCallback(() => {
    if (isTotalCountLoading || (isSnapshotLoading && !snapshot) || isAnalyzing) {
      return;
    }
    if (aiError && !snapshot) {
      void handleUpdateAnalysis();
      return;
    }
    if (totalEntries < 5) {
      handleWritePress();
      return;
    }
    if (!snapshot) {
      void handleUpdateAnalysis();
      return;
    }
    handleWidgetPress();
  }, [
    aiError,
    handleUpdateAnalysis,
    handleWidgetPress,
    handleWritePress,
    isAnalyzing,
    isSnapshotLoading,
    isTotalCountLoading,
    snapshot,
    totalEntries,
  ]);

  const latestInsight = snapshot?.highlighted_insight;
  const normalizeCardCopy = useCallback(
    (copy?: string | null) => {
      if (!copy) {
        return copy;
      }
      if (!i18n.language.startsWith('tr')) {
        return copy;
      }

      return copy
        .replace(/\u015e\u00dcKRAN/g, 'MİNNET')
        .replace(/\u015e\u00fckran/g, 'Minnet')
        .replace(/\u015f\u00fckran/g, 'minnet');
    },
    [i18n.language]
  );
  const latestInsightTitle = normalizeCardCopy(latestInsight?.title);
  const latestInsightDescription = normalizeCardCopy(latestInsight?.description);
  const isInitialLoading = isTotalCountLoading || (isSnapshotLoading && !snapshot);
  const isSeedState = !isInitialLoading && totalEntries < 5;
  const isErrorState = Boolean(aiError && !snapshot);
  const isReadyState = !isInitialLoading && !snapshot && totalEntries >= 5 && !isErrorState;

  const heroTitle = isInitialLoading
    ? t('mood.analysis.status.analyzingTitle', 'Preparing your insight')
    : isErrorState
      ? t('mood.analysis.status.errorTitle', 'Insight paused')
      : isAnalyzing && !snapshot
        ? t('mood.analysis.status.analyzingTitle', 'Preparing your insight')
        : latestInsight
          ? (latestInsightTitle ??
            t('mood.analysis.home.latestTitle', 'What your gratitude is revealing'))
          : t('mood.analysis.home.seedTitle', 'Your first pattern is taking shape');

  const heroDescription = isInitialLoading
    ? t('mood.analysis.status.analyzingMessage')
    : isErrorState
      ? t('mood.analysis.status.errorMessage')
      : isAnalyzing && !snapshot
        ? analyzingTexts[analyzingStep]
        : latestInsight
          ? (latestInsightDescription ??
            t('mood.analysis.home.latestDescription', 'Your recent entries are showing a theme.'))
          : isReadyState
            ? t('mood.analysis.home.readyDescription')
            : t('mood.analysis.home.seedDescription');

  const insightTitle = isInitialLoading
    ? t('mood.analysis.status.analyzingTitle', 'Preparing your insight')
    : isErrorState
      ? t('common.retry', 'Retry')
      : isAnalyzing && !snapshot
        ? analyzingTexts[analyzingStep]
        : latestInsight
          ? t('mood.analysis.home.latestRowTitle', 'Open Analysis')
          : isReadyState
            ? t('mood.analysis.status.readyToRevealTitle', 'Ready to reveal')
            : t('mood.analysis.home.fallbackDescription');

  const insightDescription = latestInsight
    ? t('mood.analysis.home.latestRowDescription', 'Open to see the details.')
    : isReadyState
      ? t('mood.analysis.status.readyToRevealMessage')
      : isSeedState
        ? t('mood.analysis.narrative.empty')
        : t('mood.analysis.subtitle');

  const insightDisabled = isInitialLoading || isAnalyzing;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={isDark ? ['#1B2638', '#172235', '#202C40'] : ['#F8F4EC', '#F4F3EA', '#F6F1EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Icon name="leaf" size={17} color={theme.colors.primary} />
          <Text style={styles.badgeText}>
            {t('mood.analysis.label', 'INSIGHTS').toLocaleUpperCase(locale)}
          </Text>
        </View>

        {isAnalyzing || hasNewEntries ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.85}
            disabled={isAnalyzing}
            onPress={() => void handleUpdateAnalysis()}
            style={[styles.syncButton, isAnalyzing && styles.syncButtonBusy]}
          >
            <Icon
              name={isAnalyzing ? 'progress-clock' : 'sync'}
              size={14}
              color={theme.colors.primary}
            />
            <Text style={styles.syncText}>
              {isAnalyzing
                ? t('mood.analysis.status.updating', 'Updating...')
                : t('common.update', 'Update')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {heroTitle}
          </Text>
          <Text style={styles.heroDescription}>{heroDescription}</Text>
        </View>

        <View pointerEvents="none" style={styles.mascotFrame}>
          <Image
            source={require('@/assets/assets/mascot.png')}
            style={styles.mascotImage}
            contentFit="contain"
            transition={250}
          />
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ busy: insightDisabled, disabled: insightDisabled }}
        activeOpacity={0.9}
        disabled={insightDisabled}
        onPress={handleInsightPress}
        style={styles.insightRow}
      >
        <View style={styles.insightIconCircle}>
          <Icon name="leaf" size={22} color={theme.colors.onPrimary} />
        </View>
        <View style={styles.insightCopy}>
          <Text style={styles.insightTitle} numberOfLines={2}>
            {insightTitle}
          </Text>
          <Text style={styles.insightDescription} numberOfLines={1}>
            {insightDescription}
          </Text>
        </View>
        {insightDisabled ? (
          <Icon name="progress-clock" size={22} color={theme.colors.primary} />
        ) : (
          <Icon name="chevron-right" size={24} color={theme.colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
});

HomeMoodWidget.displayName = 'HomeMoodWidget';

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const isDark = theme.name === 'dark';
  const cardBorder = isDark ? 'rgba(148, 163, 184, 0.24)' : theme.colors.primary + '22';
  const badgeBackground = isDark ? 'rgba(45, 212, 191, 0.10)' : theme.colors.primary + '10';
  const badgeBorder = isDark ? 'rgba(45, 212, 191, 0.24)' : theme.colors.primary + '28';
  const controlBackground = isDark ? 'rgba(45, 212, 191, 0.09)' : theme.colors.primary + '0E';
  const controlBorder = isDark ? 'rgba(45, 212, 191, 0.20)' : theme.colors.primary + '20';
  const textPrimary = isDark ? '#F8FAFC' : theme.colors.onBackground;
  const textSecondary = isDark ? '#CBD5E1' : theme.colors.onSurfaceVariant;
  const insightBackground = isDark ? 'rgba(20, 83, 88, 0.16)' : theme.colors.primary + '0B';
  const insightBorder = isDark ? 'rgba(45, 212, 191, 0.18)' : theme.colors.primary + '22';
  const shadowOpacity = isDark ? 0.24 : 0.11;

  return StyleSheet.create({
    card: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 24,
      padding: 14,
      backgroundColor: theme.colors.surfaceBright ?? theme.colors.surface,
      borderWidth: 1,
      borderColor: cardBorder,
      shadowColor: theme.colors.scrim,
      shadowOpacity,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 7,
      gap: 12,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    badge: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 12,
      borderRadius: 15,
      backgroundColor: badgeBackground,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    badgeText: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      fontWeight: '900',
      fontSize: 13,
      letterSpacing: 1.7,
    },
    syncButton: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 17,
      backgroundColor: controlBackground,
      borderWidth: 1,
      borderColor: controlBorder,
    },
    syncButtonBusy: {
      opacity: 0.82,
    },
    syncText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '800',
    },
    heroRow: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroCopy: {
      flex: 1,
      gap: 6,
      paddingRight: 2,
    },
    heroTitle: {
      ...theme.typography.titleMedium,
      color: textPrimary,
      fontFamily: theme.typography.fontFamilySerifBold || 'Lora-Bold',
      fontWeight: '800',
      fontSize: 18,
      lineHeight: 23,
      letterSpacing: 0,
    },
    heroDescription: {
      ...theme.typography.bodySmall,
      color: textSecondary,
      fontSize: 13,
      lineHeight: 19,
      opacity: 0.9,
    },
    mascotFrame: {
      width: 72,
      height: 76,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    mascotImage: {
      width: 70,
      height: 70,
    },
    insightRow: {
      minHeight: 66,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 17,
      paddingVertical: 10,
      paddingHorizontal: 11,
      backgroundColor: insightBackground,
      borderWidth: 1,
      borderColor: insightBorder,
    },
    insightIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 3,
    },
    insightCopy: {
      flex: 1,
      gap: 4,
    },
    insightTitle: {
      ...theme.typography.titleMedium,
      color: textPrimary,
      fontWeight: '800',
      fontSize: 14,
      lineHeight: 19,
    },
    insightDescription: {
      ...theme.typography.bodySmall,
      color: textSecondary,
      fontSize: 12,
      lineHeight: 16,
      opacity: 0.86,
    },
  });
};
