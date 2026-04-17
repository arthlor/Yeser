import { analyticsService } from '@/services/analyticsService';
import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import OnboardingNavHeader from '@/features/onboarding/components/OnboardingNavHeader';
import { OnboardingButton } from '@/features/onboarding/components/OnboardingButton';
import OnboardingTrustStrip from '@/features/onboarding/components/OnboardingTrustStrip';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { OnboardingMascot } from '@/features/onboarding/components/OnboardingMascot';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface WelcomeStepProps {
  onNext: () => void;
}

type FeatureKey = 'daily' | 'streak' | 'growth';

interface FeatureCardProps {
  icon: keyof typeof Feather.glyphMap;
  tintKey: FeatureKey;
  title: string;
  description: string;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();
  const animations = useCoordinatedAnimations();

  useEffect(() => {
    animations.animateEntrance({ duration: 500 });
    analyticsService.logScreenView('onboarding_welcome_step');
    analyticsService.logEvent('onboarding_welcome_viewed');
  }, [animations]);

  const handleGetStarted = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_welcome_continued');
    onNext();
  }, [onNext]);

  const getTintForKey = useCallback(
    (key: FeatureKey) => {
      switch (key) {
        case 'daily':
          return theme.colors.primary;
        case 'streak':
          return theme.colors.secondary;
        case 'growth':
          return theme.colors.success;
        default:
          return theme.colors.primary;
      }
    },
    [theme]
  );

  const FeatureCard: React.FC<FeatureCardProps> = ({ icon, tintKey, title, description }) => {
    const tint = getTintForKey(tintKey);
    return (
      <View style={styles.featureItem}>
        <View style={[styles.featureIconContainer, { backgroundColor: tint + '18' }]}>
          <Feather name={icon} size={18} color={tint} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
      </View>
    );
  };

  return (
    <OnboardingLayout edgeToEdge={true} ambient="warm">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        <OnboardingNavHeader />

        <View style={styles.hero}>
          <OnboardingMascot source={require('@/assets/assets/mascot.png')} delay={200} />

          <View style={styles.socialProofPill}>
            <Feather name="users" size={12} color={theme.colors.primary} />
            <Text style={styles.socialProofText}>{t('onboarding.welcome.socialProof')}</Text>
          </View>

          <Text style={styles.welcomeTitle}>{t('onboarding.welcome.title')}</Text>
          <Text style={styles.welcomeSubtitle}>{t('onboarding.welcome.subtitle')}</Text>
        </View>

        <View style={styles.featuresSection}>
          <FeatureCard
            icon="heart"
            tintKey="daily"
            title={t('onboarding.welcome.featureDailyTitle')}
            description={t('onboarding.welcome.featureDailyDesc')}
          />
          <FeatureCard
            icon="zap"
            tintKey="streak"
            title={t('onboarding.welcome.featureStreakTitle')}
            description={t('onboarding.welcome.featureStreakDesc')}
          />
          <FeatureCard
            icon="feather"
            tintKey="growth"
            title={t('onboarding.welcome.featureGrowthTitle')}
            description={t('onboarding.welcome.featureGrowthDesc')}
          />
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.encouragementText}>{t('onboarding.welcome.encouragement')}</Text>
          <OnboardingButton
            onPress={handleGetStarted}
            title={t('onboarding.welcome.getStarted')}
            accessibilityLabel={t('onboarding.welcome.getStartedA11y')}
          />
          <OnboardingTrustStrip />
        </View>
      </Animated.View>
    </OnboardingLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
    },
    hero: {
      alignItems: 'center',
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
    },
    socialProofPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '14',
      marginBottom: theme.spacing.xs,
    },
    socialProofText: {
      ...theme.typography.labelSmall,
      fontSize: 10,
      color: theme.colors.primary,
      letterSpacing: 0.3,
    },
    welcomeTitle: {
      ...theme.typography.headlineMedium,
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    welcomeSubtitle: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: theme.spacing.sm,
    },
    featuresSection: {
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      ...getPrimaryShadow.small(theme),
    },
    featureIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: 1,
    },
    featureDescription: {
      ...theme.typography.bodySmall,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 16,
    },
    actionSection: {
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      alignItems: 'stretch',
    },
    encouragementText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 18,
      fontSize: 12,
      fontStyle: 'italic',
      paddingHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
  });

export default WelcomeStep;
