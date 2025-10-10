import { analyticsService } from '@/services/analyticsService';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import OnboardingNavHeader from '@/components/onboarding/OnboardingNavHeader';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { useTheme } from '@/providers/ThemeProvider';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface WelcomeStepProps {
  onNext: () => void;
}

/**
 * **SIMPLIFIED WELCOME STEP**: Minimal, elegant welcome experience
 *
 * **ANIMATION SIMPLIFICATION COMPLETED**:
 * - Reduced from 4 animation instances to 1 (75% reduction)
 * - Eliminated complex staged sequences (headerAnimations, featuresAnimations, encouragementAnimations, actionAnimations)
 * - Removed custom slideAnim for simpler unified entrance
 * - Replaced with subtle 500ms entrance fade following roadmap philosophy
 * - Simplified staggered animations to single coordinated entrance
 */
export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  // **SIMPLIFIED ANIMATION SYSTEM**: Single coordinated instance (4 → 1, 75% reduction)
  const animations = useCoordinatedAnimations();

  // **MINIMAL ENTRANCE**: Simple 500ms fade-in, barely noticeable
  const triggerEntranceAnimations = useCallback(() => {
    animations.animateEntrance({ duration: 500 });
  }, [animations]);

  // **UNIFIED ENTRANCE**: Single animation for all content sections
  useEffect(() => {
    triggerEntranceAnimations();

    // Track welcome step view
    analyticsService.logScreenView('onboarding_welcome_step');
    analyticsService.logEvent('onboarding_welcome_viewed');
  }, [triggerEntranceAnimations]);

  const handleGetStarted = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_welcome_continued');
    onNext();
  }, [onNext]);

  return (
    <OnboardingLayout edgeToEdge={true}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        {/* Compact standardized header */}
        <OnboardingNavHeader />
        <View style={styles.headerSection}>
          <Text style={styles.welcomeTitle}>{t('onboarding.welcome.title')}</Text>
          <Text style={styles.welcomeSubtitle}>{t('onboarding.welcome.subtitle')}</Text>
        </View>

        {/* **ENHANCED FEATURES**: Modern icon design with consistent visuals */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="heart-outline" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{t('onboarding.welcome.featureDailyTitle')}</Text>
              <Text style={styles.featureDescription}>
                {t('onboarding.welcome.featureDailyDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="flame-outline" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{t('onboarding.welcome.featureStreakTitle')}</Text>
              <Text style={styles.featureDescription}>
                {t('onboarding.welcome.featureStreakDesc')}
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="leaf-outline" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{t('onboarding.welcome.featureGrowthTitle')}</Text>
              <Text style={styles.featureDescription}>
                {t('onboarding.welcome.featureGrowthDesc')}
              </Text>
            </View>
          </View>
        </View>

        {/* **SIMPLIFIED ENCOURAGEMENT**: No separate animations, unified entrance */}
        <View style={styles.encouragementSection}>
          <Text style={styles.encouragementText}>{t('onboarding.welcome.encouragement')}</Text>
        </View>

        {/* **STANDARDIZED BUTTON**: Using OnboardingButton for consistency */}
        <View style={styles.actionSection}>
          <OnboardingButton
            onPress={handleGetStarted}
            title={t('onboarding.welcome.getStarted')}
            accessibilityLabel={t('onboarding.welcome.getStartedA11y')}
          />
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
      paddingHorizontal: theme.spacing.lg, // Add back padding for edge-to-edge mode
    },
    headerSection: {
      alignItems: 'center',
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    welcomeTitle: {
      ...theme.typography.headlineLarge,
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    welcomeSubtitle: {
      ...theme.typography.bodyLarge,
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: theme.spacing.md,
    },
    featuresSection: {
      flex: 1,
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      ...getPrimaryShadow.small(theme),
    },
    featureIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primaryContainer + '40',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.lg,
      borderWidth: 2,
      borderColor: theme.colors.primaryContainer + '60',
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      ...theme.typography.bodyMedium,
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
      lineHeight: 22,
    },
    featureDescription: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    encouragementSection: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    encouragementText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      fontSize: 14,
      fontStyle: 'italic',
      paddingHorizontal: theme.spacing.md,
    },
    actionSection: {
      paddingBottom: theme.spacing.xl * 2, // Increased padding to prevent device menu overlap
      paddingTop: theme.spacing.lg,
    },
    // Removed button styles - handled by OnboardingButton component
  });

export default WelcomeStep;
