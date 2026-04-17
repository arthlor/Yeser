import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { OnboardingMascot } from '@/features/onboarding/components/OnboardingMascot';
import { Feather } from '@expo/vector-icons';

import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import OnboardingNavHeader from '@/features/onboarding/components/OnboardingNavHeader';
import { OnboardingButton } from '@/features/onboarding/components/OnboardingButton';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { analyticsService } from '@/services/analyticsService';
import { useTranslation } from 'react-i18next';
import { reviewService } from '@/services/reviewService';
import { getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';

interface CompletionStepProps {
  onComplete: () => void | Promise<void>;
  onBack: () => void;
  isCompleting?: boolean;
  userSummary: {
    username: string;
    dailyGoal: number;
    selectedTheme: string;
    featuresEnabled: string[];
  };
}

/**
 * **SIMPLIFIED COMPLETION STEP**: Minimal, elegant completion experience
 *
 * **ANIMATION SIMPLIFICATION COMPLETED**:
 * - Reduced from 8+ animation instances to 1 (87.5% reduction)
 * - Eliminated complex celebration sequences (fadeAnim, slideAnim, scaleAnim, celebrationAnim, sparkleRotation)
 * - Replaced with subtle 500ms entrance fade following roadmap philosophy
 * - Removed continuous sparkle rotation and complex interpolations
 * - Static celebration icons instead of animated sparkles for cleaner, minimal experience
 */
export const CompletionStep: React.FC<CompletionStepProps> = ({
  onComplete,
  onBack,
  isCompleting = false,
  userSummary,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isStartingJourney, setIsStartingJourney] = useState(false);

  // **SIMPLIFIED ANIMATION SYSTEM**: Single coordinated instance (8+ → 1, 87.5% reduction)
  const animations = useCoordinatedAnimations();

  useEffect(() => {
    // **MINIMAL ENTRANCE**: Simple 500ms fade-in, barely noticeable
    animations.animateEntrance({ duration: 500 });

    // Analytics tracking
    analyticsService.logScreenView('onboarding_completion_step');

    // Track completion
    analyticsService.logEvent('onboarding_completed', {
      username_length: userSummary.username.length,
      daily_goal: userSummary.dailyGoal,
      selected_theme: userSummary.selectedTheme,
      features_count: userSummary.featuresEnabled.length,
    });

    // Prompt native rating modal automatically with a slight delay
    const ratingTimer = setTimeout(() => {
      void reviewService.requestReview();
    }, 600);

    return () => clearTimeout(ratingTimer);
  }, [
    animations,
    userSummary.username,
    userSummary.dailyGoal,
    userSummary.selectedTheme,
    userSummary.featuresEnabled,
  ]);

  const handleStartJourney = useCallback(async () => {
    if (isStartingJourney || isCompleting) {
      return;
    }

    setIsStartingJourney(true);

    try {
      await Promise.resolve(onComplete());
      analyticsService.logEvent('onboarding_journey_started');
    } finally {
      setIsStartingJourney(false);
    }
  }, [isCompleting, isStartingJourney, onComplete]);

  const getGoalText = () => {
    if (userSummary.dailyGoal === 0) {
      return t('onboarding.completion.goalCustom');
    }
    return t('onboarding.completion.goalText', { count: userSummary.dailyGoal });
  };

  const getThemeText = () => {
    const themeMap = {
      light: t('onboarding.completion.themeMap.light'),
      dark: t('onboarding.completion.themeMap.dark'),
      auto: t('onboarding.completion.themeMap.auto'),
    };
    return (
      themeMap[userSummary.selectedTheme as keyof typeof themeMap] || userSummary.selectedTheme
    );
  };

  const styles = createStyles(theme);

  return (
    <OnboardingLayout edgeToEdge={true} ambient="celebrate">
      <View style={styles.navWrapper}>
        <OnboardingNavHeader
          onBack={() => {
            hapticFeedback.light();
            onBack();
          }}
        />
      </View>

      {/* **UNIFIED ENTRANCE**: Single animation for all content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        <OnboardingMascot source={require('@/assets/assets/mascot.png')} delay={200} />

        <View style={styles.celebrationContainer}>
          <View style={styles.celebrationPill}>
            <Feather name="check-circle" size={12} color={theme.colors.success} />
            <Text style={styles.celebrationPillText}>{t('onboarding.completion.pill')}</Text>
          </View>
          <Text style={styles.congratsTitle}>
            {t('onboarding.completion.congratsTitle', { username: userSummary.username })}
          </Text>
          <Text style={styles.congratsSubtitle}>{t('onboarding.completion.congratsSubtitle')}</Text>
        </View>

        {/* **SIMPLIFIED SUMMARY**: No complex slide animations */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('onboarding.completion.summaryTitle')}</Text>

          <View style={styles.summaryItems}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconWrapper}>
                <Feather name="user" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.summaryText}>{userSummary.username}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconWrapper}>
                <Feather name="target" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.summaryText}>{getGoalText()}</Text>
            </View>

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconWrapper}>
                <Feather name="layers" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.summaryText}>{getThemeText()}</Text>
            </View>

            {userSummary.featuresEnabled.length > 0 && (
              <View style={styles.summaryItem}>
                <View style={styles.summaryIconWrapper}>
                  <Feather name="star" size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.summaryText}>
                  {userSummary.featuresEnabled.join(', ')}{' '}
                  {t('onboarding.completion.featuresActiveSuffix')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* **SIMPLIFIED ENCOURAGEMENT**: Static content, no complex animations */}
        <View style={styles.encouragementContainer}>
          <View style={styles.encouragementContent}>
            <Text style={styles.encouragementTitle}>
              {t('onboarding.completion.encouragementTitle')}
            </Text>
            <Text style={styles.encouragementText}>
              {t('onboarding.completion.encouragementText')}
            </Text>
          </View>
        </View>

        {/* **STANDARDIZED BUTTON**: Using OnboardingButton for consistency */}
        <Animated.View
          style={useMemo(
            () => ({ transform: animations.pressTransform }),
            [animations.pressTransform]
          )}
        >
          <OnboardingButton
            onPress={handleStartJourney}
            title={t('onboarding.completion.startJourney')}
            disabled={isStartingJourney || isCompleting}
            loading={isStartingJourney || isCompleting}
            accessibilityLabel={t('onboarding.completion.startJourneyA11y')}
          />
        </Animated.View>

        {/* **MINIMAL FOOTER**: Simple text, no complex animations */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>{t('onboarding.completion.footer')}</Text>
        </View>
      </Animated.View>
    </OnboardingLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    navWrapper: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.page,
      paddingTop: 0,
      paddingBottom: theme.spacing.xxxl,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    celebrationContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    celebrationPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.success + '18',
      marginBottom: theme.spacing.sm,
    },
    celebrationPillText: {
      ...theme.typography.labelSmall,
      fontSize: 11,
      color: theme.colors.success,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    congratsTitle: {
      ...theme.typography.headlineMedium,
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    congratsSubtitle: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: theme.spacing.sm,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // 🌟 Beautiful primary shadow for summary card (no react-native-paper conflicts)
      ...getPrimaryShadow.card(theme),
    },
    summaryTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      fontWeight: '600',
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    summaryItems: {
      gap: theme.spacing.md,
    },
    summaryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.xs,
    },
    summaryIconWrapper: {
      width: theme.spacing.xl,
      height: theme.spacing.xl,
      borderRadius: theme.spacing.md,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onBackground,
      flex: 1,
    },
    encouragementContainer: {
      marginBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.md,
    },
    encouragementContent: {
      alignItems: 'center',
    },
    encouragementTitle: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
      marginBottom: theme.spacing.sm,
    },
    encouragementText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
      lineHeight: 24,
    },
    staticCelebrationIcons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    celebrationIcon: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onBackground,
    },
    startButton: {
      width: '100%',
      borderRadius: theme.borderRadius.md,
      // 🌟 Beautiful primary shadow for start button
      ...getPrimaryShadow.floating(theme),
    },
    startButtonContent: {
      paddingVertical: theme.spacing.sm,
    },
    startButtonText: {
      ...theme.typography.bodyMedium,
    },
    footerContainer: {
      padding: theme.spacing.md,
    },
    footerText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });

export default CompletionStep;
