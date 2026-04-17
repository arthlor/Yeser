import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import { useGratitudeBenefits } from '../hooks/useGratitudeBenefits';
import { useUserProfile } from '@/shared/hooks/useUserProfile';
import { useStreakData } from '@/features/streak/hooks/useStreakData';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { ScreenLayout } from '@/shared/components/layout';
import { analyticsService } from '@/services/analyticsService';
import { logger } from '@/utils/debugConfig';
import { getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';
import type { AppStackParamList } from '@/types/navigation';
import { useTranslation } from 'react-i18next';

type WhyGratitudeScreenNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'WhyGratitude'
>;

export const WhyGratitudeScreen: React.FC = React.memo(() => {
  const { theme } = useTheme();
  const { showSuccess } = useToast();
  const navigation = useNavigation<WhyGratitudeScreenNavigationProp>();
  const { t } = useTranslation();

  const { data: benefits, isLoading, error, refetch } = useGratitudeBenefits();
  const { profile } = useUserProfile();
  const { data: streak } = useStreakData();

  React.useEffect(() => {
    if (error) {
      logger.error('WhyGratitudeScreen error:', { error });
    }
  }, [error, t]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  React.useEffect(() => {
    analyticsService.logScreenView('why_gratitude_screen');
    analyticsService.logEvent('why_gratitude_viewed', {
      user_id: profile?.id || 'anonymous',
      user_streak: streak?.current_streak || 0,
      has_benefits_data: !!benefits?.length,
      timestamp: Date.now(),
    });
  }, [profile?.id, streak?.current_streak, benefits?.length]);

  const handleStartJournaling = useCallback(
    (prompt?: string | null, source: 'main_button' | 'benefit_card' = 'main_button') => {
      analyticsService.logEvent('cta_button_pressed', {
        prompt: prompt || 'none',
        user_streak: streak?.current_streak || 0,
        user_id: profile?.id || 'anonymous',
        source,
      });

      analyticsService.logEvent('navigation_to_journal', {
        source: 'why_gratitude',
        prompt_used: !!prompt,
        user_id: profile?.id || 'anonymous',
      });

      setTimeout(() => {
        try {
          navigation.navigate('MainAppTabs', {
            screen: 'DailyEntryTab',
            params: { initialPrompt: prompt || undefined },
          });
        } catch (error) {
          logger.warn('Navigation failed in WhyGratitudeScreen:', { error });
          navigation.navigate('MainAppTabs', {
            screen: 'DailyEntryTab',
          });
        }
      }, 100);

      if (prompt) {
        showSuccess(t('whyGratitude.cta.successMessage', { prompt }));
      }
    },
    [navigation, streak?.current_streak, profile?.id, showSuccess, t]
  );

  const handleBenefitCtaPress = useCallback(
    (prompt: string, benefitId: number, title: string, index: number) => {
      analyticsService.logEvent('benefit_card_cta_pressed', {
        benefit_id: benefitId,
        title,
        prompt,
        index,
        user_id: profile?.id || 'anonymous',
      });

      handleStartJournaling(prompt, 'benefit_card');
    },
    [handleStartJournaling, profile?.id]
  );

  const handleRetry = useCallback(() => {
    refetch();
    showSuccess(t('common.loading'));
  }, [refetch, showSuccess, t]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const primaryPrompt = useMemo(() => benefits?.[0]?.cta_prompt, [benefits]);
  const currentStreak = streak?.current_streak ?? 0;

  if (isLoading) {
    return (
      <ScreenLayout edges={['top']} edgeToEdge={true} backgroundColor={theme.colors.surface}>
        <View style={styles.loadingContainer}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.loadingContent}>
            <ActivityIndicator
              animating={true}
              color={theme.colors.primary}
              size="large"
              accessibilityLabel={t('shared.layout.screenContent.loading')}
            />
            <Text style={styles.loadingText}>{t('shared.layout.screenContent.loading')}</Text>
            <Text style={styles.loadingSubtext}>{t('whyGratitude.loadingSubtext')}</Text>
          </Animated.View>
        </View>
      </ScreenLayout>
    );
  }

  if (error) {
    return (
      <ScreenLayout edges={['top']} edgeToEdge={true} backgroundColor={theme.colors.surface}>
        <View style={styles.errorContainer}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.errorContent}>
            <View style={styles.errorIconWrap}>
              <Icon name="alert-circle-outline" size={40} color={theme.colors.error} />
            </View>
            <Text style={styles.errorTitle}>
              {t('shared.layout.errorState.cases.generic.title')}
            </Text>
            <Text style={styles.errorMessage}>
              {t('shared.layout.errorState.cases.generic.message')}
            </Text>
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton} activeOpacity={0.85}>
              <Icon name="refresh" size={18} color={theme.colors.onPrimary} />
              <Text style={styles.retryButtonLabel}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenLayout
        edges={['top']}
        edgeToEdge={true}
        backgroundColor={theme.colors.surface}
        scrollable={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={handleGoBack}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button"
            style={styles.appBarBackAction}
            hitSlop={8}
          >
            <Icon name="arrow-left" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.appBarTitle} numberOfLines={1}>
            {t('whyGratitude.title')}
          </Text>
          <View style={styles.appBarSpacer} />
        </View>

        {/* Hero */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.heroSection}>
          {/* Soft decorative glow */}
          <View pointerEvents="none" style={styles.heroGlowA} />
          <View pointerEvents="none" style={styles.heroGlowB} />

          <Animated.View
            entering={FadeInUp.duration(600).springify()}
            style={styles.heroIconContainer}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.tertiary || theme.colors.primary]}
              style={styles.heroIconBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="heart-multiple" size={40} color={theme.colors.onPrimary} />
            </LinearGradient>
            <View style={styles.heroIconHalo} />
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(120).duration(500)}
            style={styles.title}
            accessibilityRole="header"
          >
            {t('whyGratitude.hero.title')}
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(200).duration(500)} style={styles.intro}>
            {t('whyGratitude.hero.subtitle')}
          </Animated.Text>

          {/* Personalised streak pill */}
          {currentStreak > 0 && (
            <Animated.View
              entering={FadeInUp.delay(280).duration(500).springify()}
              style={styles.streakPill}
            >
              <Icon name="fire" size={16} color={theme.colors.primary} />
              <Text style={styles.streakPillText}>
                <Text style={styles.streakPillNumber}>{currentStreak}</Text>{' '}
                {t('whyGratitude.hero.streakLabel', { defaultValue: 'day streak' })}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Benefits */}
        <View style={styles.benefitsSection}>
          <Animated.Text entering={FadeInUp.delay(320).duration(500)} style={styles.benefitsTitle}>
            {t('whyGratitude.benefits.title')}
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.delay(380).duration(500)}
            style={styles.benefitsSubtitle}
          >
            {t('whyGratitude.benefits.subtitle')}
          </Animated.Text>

          {benefits?.map((benefit, index) => {
            const stepNumber = index + 1;
            return (
              <Animated.View
                key={benefit.id}
                entering={FadeInUp.delay(420 + index * 90)
                  .duration(500)
                  .springify()}
              >
                <TouchableOpacity
                  style={styles.benefitCard}
                  onPress={() =>
                    handleBenefitCtaPress(
                      benefit.cta_prompt || '',
                      benefit.id,
                      benefit.title,
                      index
                    )
                  }
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${benefit.title}. ${benefit.description}`}
                >
                  {/* Numbered step badge */}
                  <View style={styles.benefitStepBadge}>
                    <Text style={styles.benefitStepText}>{stepNumber}</Text>
                  </View>

                  <View style={styles.benefitContent}>
                    <View style={styles.benefitIconContainer}>
                      <Icon name={benefit.icon} size={22} color={theme.colors.primary} />
                    </View>

                    <View style={styles.benefitTextContainer}>
                      <Text style={styles.benefitTitle} numberOfLines={2}>
                        {benefit.title}
                      </Text>
                      <Text style={styles.benefitDescription}>{benefit.description}</Text>
                      {benefit.stat && (
                        <View style={styles.benefitStatBadge}>
                          <Icon
                            name="chart-line"
                            size={12}
                            color={theme.colors.primary}
                            style={styles.benefitStatIcon}
                          />
                          <Text style={styles.benefitStatText} numberOfLines={2}>
                            {benefit.stat}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.benefitArrow}>
                      <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(720).duration(500)} style={styles.ctaSection}>
          <LinearGradient
            colors={[
              `${theme.colors.primary}12`,
              `${theme.colors.tertiary || theme.colors.primary}06`,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaCard}
          >
            <View style={styles.ctaIconWrap}>
              <Icon name="sprout" size={24} color={theme.colors.primary} />
            </View>
            <Text style={styles.ctaTitle}>{t('whyGratitude.cta.title')}</Text>
            <Text style={styles.ctaSubtitle}>{t('whyGratitude.cta.subtitle')}</Text>

            <TouchableOpacity
              onPress={() => handleStartJournaling(primaryPrompt)}
              style={styles.ctaButtonWrapper}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={t('whyGratitude.cta.button')}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.tertiary || theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonLabel}>{t('whyGratitude.cta.button')}</Text>
                <Icon name="arrow-right" size={18} color={theme.colors.onPrimary} />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </ScreenLayout>
    </ErrorBoundary>
  );
});

WhyGratitudeScreen.displayName = 'WhyGratitudeScreen';

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Header
    appBar: {
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    appBarBackAction: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}0D`,
    },
    appBarTitle: {
      fontWeight: '700',
      fontSize: 17,
      color: theme.colors.onSurface,
      flex: 1,
      textAlign: 'center',
    },
    appBarSpacer: {
      width: 40,
      height: 40,
    },

    // Layout
    contentContainer: {
      paddingBottom: theme.spacing.xxxl,
    },

    // Hero
    heroSection: {
      alignItems: 'center',
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      position: 'relative',
      overflow: 'hidden',
    },
    heroGlowA: {
      position: 'absolute',
      top: -60,
      right: -40,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: `${theme.colors.primary}1A`,
      opacity: 0.6,
    },
    heroGlowB: {
      position: 'absolute',
      bottom: -40,
      left: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: `${theme.colors.tertiary || theme.colors.primary}14`,
      opacity: 0.5,
    },
    heroIconContainer: {
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroIconBackground: {
      width: 88,
      height: 88,
      borderRadius: 44,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.floating(theme),
    },
    heroIconHalo: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${theme.colors.primary}10`,
      zIndex: -1,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      lineHeight: 34,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    intro: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      opacity: 0.9,
      maxWidth: 340,
    },
    streakPill: {
      marginTop: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.full,
      backgroundColor: `${theme.colors.primary}12`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}22`,
    },
    streakPillText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    streakPillNumber: {
      color: theme.colors.primary,
      fontWeight: '800',
    },

    // Benefits
    benefitsSection: {
      marginTop: theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg,
    },
    benefitsTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
    },
    benefitsSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      opacity: 0.75,
      marginBottom: theme.spacing.xl,
    },

    benefitCard: {
      position: 'relative',
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: `${theme.colors.outline}14`,
      ...getPrimaryShadow.small(theme),
    },
    benefitStepBadge: {
      position: 'absolute',
      top: -10,
      left: theme.spacing.lg,
      minWidth: 28,
      height: 28,
      borderRadius: 14,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
      ...getPrimaryShadow.small(theme),
    },
    benefitStepText: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    benefitContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      paddingTop: theme.spacing.lg + 6,
      gap: theme.spacing.md,
    },
    benefitIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${theme.colors.primary}12`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    benefitTextContainer: {
      flex: 1,
    },
    benefitTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
      marginBottom: 2,
      lineHeight: 22,
    },
    benefitDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
      opacity: 0.9,
    },
    benefitStatBadge: {
      marginTop: theme.spacing.sm,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.full,
      backgroundColor: `${theme.colors.primary}10`,
      maxWidth: '100%',
    },
    benefitStatIcon: {
      marginRight: 2,
    },
    benefitStatText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 12,
      flexShrink: 1,
    },
    benefitArrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${theme.colors.primary}08`,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // CTA
    ctaSection: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    ctaCard: {
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: `${theme.colors.primary}1F`,
    },
    ctaIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${theme.colors.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    ctaTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
    },
    ctaSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      opacity: 0.85,
      lineHeight: 20,
      maxWidth: 320,
    },
    ctaButtonWrapper: {
      width: '100%',
      borderRadius: theme.borderRadius.full,
      ...getPrimaryShadow.floating(theme),
    },
    ctaButton: {
      flexDirection: 'row',
      borderRadius: theme.borderRadius.full,
      minHeight: 54,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    ctaButtonLabel: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
      color: theme.colors.onPrimary,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContent: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    loadingText: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      marginTop: theme.spacing.lg,
      textAlign: 'center',
      fontWeight: '600',
    },
    loadingSubtext: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      opacity: 0.7,
    },

    // Error
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContent: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    errorIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${theme.colors.error}14`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    errorTitle: {
      ...theme.typography.titleLarge,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      fontWeight: '700',
    },
    errorMessage: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      lineHeight: 22,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      gap: 8,
    },
    retryButtonLabel: {
      fontWeight: '700',
      color: theme.colors.onPrimary,
      fontSize: 15,
    },
  });
