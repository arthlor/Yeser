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
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface WelcomeStepProps {
  onNext: () => void;
  currentStep?: number;
  totalSteps?: number;
}

type FeatureKey = 'daily' | 'streak' | 'growth';

interface FeatureCardProps {
  icon: keyof typeof Feather.glyphMap;
  tintKey: FeatureKey;
  title: string;
  description: string;
  animValue: Animated.Value;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext, currentStep, totalSteps }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();
  const animations = useCoordinatedAnimations();

  // Staggered animation values for feature cards
  const cardAnims = useRef([...Array(3)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    animations.animateEntrance({ duration: 500 });

    // Stagger feature cards slightly after main entrance
    Animated.stagger(
      150,
      cardAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        })
      )
    ).start();

    analyticsService.logScreenView('onboarding_welcome_step');
    analyticsService.logEvent('onboarding_welcome_viewed');
  }, [animations, cardAnims]);

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

  const FeatureCard: React.FC<FeatureCardProps> = ({
    icon,
    tintKey,
    title,
    description,
    animValue,
  }) => {
    const tint = getTintForKey(tintKey);

    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0],
    });

    return (
      <Animated.View
        style={[styles.featureItem, { opacity: animValue, transform: [{ translateY }] }]}
      >
        <View style={[styles.featureIconContainer, { backgroundColor: tint + '15' }]}>
          <Feather name={icon} size={20} color={tint} />
        </View>
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
      </Animated.View>
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
        <OnboardingNavHeader currentStep={currentStep} totalSteps={totalSteps} />

        <View style={styles.hero}>
          <OnboardingMascot source={require('@/assets/assets/mascot.png')} delay={100} />

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
            animValue={cardAnims[0]}
          />
          <FeatureCard
            icon="zap"
            tintKey="streak"
            title={t('onboarding.welcome.featureStreakTitle')}
            description={t('onboarding.welcome.featureStreakDesc')}
            animValue={cardAnims[1]}
          />
          <FeatureCard
            icon="feather"
            tintKey="growth"
            title={t('onboarding.welcome.featureGrowthTitle')}
            description={t('onboarding.welcome.featureGrowthDesc')}
            animValue={cardAnims[2]}
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
      paddingBottom: theme.spacing.md, // Increased padding
    },
    socialProofPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '10',
      marginBottom: theme.spacing.sm,
    },
    socialProofText: {
      ...theme.typography.labelSmall,
      fontSize: 11,
      color: theme.colors.primary,
      letterSpacing: 0.4,
      fontWeight: '600',
    },
    welcomeTitle: {
      ...theme.typography.headlineMedium,
      fontSize: 28, // Slightly larger, more premium
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.5, // Tighter tracking for modern look
    },
    welcomeSubtitle: {
      ...theme.typography.bodyMedium,
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.sm,
    },
    featuresSection: {
      gap: theme.spacing.sm, // More spacing between cards
      paddingVertical: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl, // Softer corners
      padding: theme.spacing.md, // More breathing room
      borderWidth: StyleSheet.hairlineWidth, // More subtle border
      borderColor: theme.colors.outline + '15',
      ...getPrimaryShadow.card(theme), // Softer diffused shadow
    },
    featureIconContainer: {
      width: 44, // Slightly larger
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    featureContent: {
      flex: 1,
      justifyContent: 'center',
    },
    featureTitle: {
      ...theme.typography.bodyLarge,
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.onBackground,
      marginBottom: 2,
    },
    featureDescription: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18, // Better readability
    },
    actionSection: {
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.md,
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
