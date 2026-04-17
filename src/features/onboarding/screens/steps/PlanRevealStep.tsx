import React, { useCallback, useEffect, useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import { OnboardingButton } from '@/features/onboarding/components/OnboardingButton';
import OnboardingNavHeader from '@/features/onboarding/components/OnboardingNavHeader';
import { OnboardingMascot } from '@/features/onboarding/components/OnboardingMascot';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import { analyticsService } from '@/services/analyticsService';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';

interface PlanRevealStepProps {
  onNext: () => void;
  onBack: () => void;
  username: string;
  dailyGoal: number;
}

/**
 * Pre-paywall "personalized plan" step.
 *
 * The goal is to convert more users: we reference their name, reflect the
 * goal they just picked back at them, show social proof, and clearly state
 * what Premium unlocks before the RevenueCat paywall appears. The CTA is
 * the single commitment action that flows into the paywall screen.
 */
export const PlanRevealStep: React.FC<PlanRevealStepProps> = ({
  onNext,
  onBack,
  username,
  dailyGoal,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  const animations = useCoordinatedAnimations();

  useEffect(() => {
    animations.animateEntrance({ duration: 450 });
    analyticsService.logScreenView('onboarding_plan_reveal_step');
    analyticsService.logEvent('onboarding_plan_reveal_viewed', {
      username_length: username.length,
      daily_goal: dailyGoal,
    });
  }, [animations, username, dailyGoal]);

  const goalLabel = useMemo(() => {
    if (!dailyGoal || dailyGoal <= 0) {
      return t('onboarding.planReveal.goalCustom');
    }
    return t('onboarding.planReveal.goalText', { count: dailyGoal });
  }, [dailyGoal, t]);

  const premiumPerks = useMemo(
    () => [
      {
        icon: 'sunrise' as const,
        title: t('onboarding.planReveal.perks.prompts.title'),
        desc: t('onboarding.planReveal.perks.prompts.desc'),
      },
      {
        icon: 'bar-chart-2' as const,
        title: t('onboarding.planReveal.perks.insights.title'),
        desc: t('onboarding.planReveal.perks.insights.desc'),
      },
      {
        icon: 'image' as const,
        title: t('onboarding.planReveal.perks.memories.title'),
        desc: t('onboarding.planReveal.perks.memories.desc'),
      },
      {
        icon: 'heart' as const,
        title: t('onboarding.planReveal.perks.support.title'),
        desc: t('onboarding.planReveal.perks.support.desc'),
      },
    ],
    [t]
  );

  const handleContinue = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_plan_reveal_continued');
    onNext();
  }, [onNext]);

  return (
    <OnboardingLayout edgeToEdge={true} ambient="sunrise">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        <View style={styles.navWrapper}>
          <OnboardingNavHeader
            onBack={() => {
              hapticFeedback.light();
              onBack();
            }}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <OnboardingMascot source={require('@/assets/assets/mascot.png')} delay={150} />

          <View style={styles.kickerWrap}>
            <Text style={styles.kicker}>{t('onboarding.planReveal.kicker')}</Text>
          </View>

          <Text style={styles.title}>{t('onboarding.planReveal.title', { name: username })}</Text>
          <Text style={styles.subtitle}>{t('onboarding.planReveal.subtitle')}</Text>

          {/* Personalized plan snapshot */}
          <View style={styles.planCard}>
            <Text style={styles.planCardLabel}>{t('onboarding.planReveal.planLabel')}</Text>
            <View style={styles.planRow}>
              <View style={styles.planIcon}>
                <Feather name="target" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.planText}>{goalLabel}</Text>
            </View>
            <View style={styles.planRow}>
              <View style={styles.planIcon}>
                <Feather name="bell" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.planText}>{t('onboarding.planReveal.planReminder')}</Text>
            </View>
            <View style={styles.planRow}>
              <View style={styles.planIcon}>
                <Feather name="calendar" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.planText}>{t('onboarding.planReveal.planHorizon')}</Text>
            </View>
          </View>

          {/* Social proof card */}
          <View style={styles.socialProofCard}>
            <View style={styles.starsRow}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Feather key={i} name="star" size={14} color={theme.colors.secondary} />
              ))}
              <Text style={styles.ratingText}>{t('onboarding.planReveal.ratingText')}</Text>
            </View>
            <Text style={styles.testimonialQuote}>
              “{t('onboarding.planReveal.testimonial.quote')}”
            </Text>
            <Text style={styles.testimonialAuthor}>
              — {t('onboarding.planReveal.testimonial.author')}
            </Text>
          </View>

          {/* Premium perks */}
          <View style={styles.perksHeaderRow}>
            <View style={styles.premiumBadge}>
              <Feather name="star" size={10} color={theme.colors.onPrimary} />
              <Text style={styles.premiumBadgeText}>{t('onboarding.planReveal.premiumBadge')}</Text>
            </View>
            <Text style={styles.perksHeader}>{t('onboarding.planReveal.perksTitle')}</Text>
          </View>

          <View style={styles.perksGrid}>
            {premiumPerks.map((perk) => (
              <View key={perk.title} style={styles.perkCard}>
                <View style={styles.perkIconWrap}>
                  <Feather name={perk.icon} size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkDesc}>{perk.desc}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.trialLine}>{t('onboarding.planReveal.trialLine')}</Text>
        </ScrollView>

        <View style={styles.ctaWrap}>
          <OnboardingButton
            onPress={handleContinue}
            title={t('onboarding.planReveal.cta')}
            accessibilityLabel={t('onboarding.planReveal.ctaA11y')}
          />
          <Text style={styles.ctaFootnote}>{t('onboarding.planReveal.ctaFootnote')}</Text>
        </View>
      </Animated.View>
    </OnboardingLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    navWrapper: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      alignItems: 'stretch',
    },
    kickerWrap: {
      alignItems: 'center',
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    kicker: {
      ...theme.typography.labelSmall,
      fontSize: 11,
      color: theme.colors.secondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    title: {
      ...theme.typography.headlineMedium,
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    planCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.primary + '25',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
      ...getPrimaryShadow.card(theme),
    },
    planCardLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: theme.spacing.xs,
    },
    planRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    planIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    planText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onBackground,
      flex: 1,
    },
    socialProofCard: {
      backgroundColor: theme.colors.surfaceVariant + '80',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.secondary,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginBottom: theme.spacing.xs,
    },
    ratingText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.xs,
      fontWeight: '600',
    },
    testimonialQuote: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onBackground,
      fontStyle: 'italic',
      lineHeight: 20,
      marginBottom: 4,
    },
    testimonialAuthor: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    perksHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xs + 2,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
    },
    premiumBadgeText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    perksHeader: {
      ...theme.typography.titleSmall,
      color: theme.colors.onBackground,
      fontWeight: '700',
    },
    perksGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    perkCard: {
      flexBasis: '48%',
      flexGrow: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm + 2,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      gap: 4,
    },
    perkIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    perkTitle: {
      ...theme.typography.bodyMedium,
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.onBackground,
    },
    perkDesc: {
      ...theme.typography.bodySmall,
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 16,
    },
    trialLine: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: theme.spacing.md,
    },
    ctaWrap: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    ctaFootnote: {
      ...theme.typography.bodySmall,
      fontSize: 11,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });

export default PlanRevealStep;
