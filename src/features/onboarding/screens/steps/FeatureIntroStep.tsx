import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';

import React, { useCallback, useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';

import { ScreenSection } from '@/shared/components/layout';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

interface FeatureIntroStepProps {
  onNext: (features: FeaturePreferences) => void;
  onBack?: () => void;
  initialPreferences?: FeaturePreferences;
}

interface FeaturePreferences {
  useVariedPrompts: boolean;
  throwbackEnabled: boolean;
}

export const FeatureIntroStep: React.FC<FeatureIntroStepProps> = ({
  onNext,
  onBack,
  initialPreferences,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [features, setFeatures] = useState<FeaturePreferences>({
    useVariedPrompts: initialPreferences?.useVariedPrompts ?? true,
    throwbackEnabled: initialPreferences?.throwbackEnabled ?? true,
  });

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all animations
  const animations = useCoordinatedAnimations();

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    // Analytics tracking
    analyticsService.logScreenView('onboarding_feature_intro_step');

    // Use coordinated entrance animation
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  const handleFeatureToggle = useCallback((feature: keyof FeaturePreferences, value: boolean) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: value,
    }));
    hapticFeedback.light();

    analyticsService.logEvent('onboarding_feature_toggled', {
      feature,
      value,
    });
  }, []);

  const handleContinue = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_features_configured', {
      varied_prompts: features.useVariedPrompts,
      throwback_enabled: features.throwbackEnabled,
    });

    onNext(features);
  }, [features, onNext]);

  return (
    <OnboardingLayout edgeToEdge={true}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
          },
        ]}
      >
        {/* Enhanced Navigation Header with Better Back Button */}
        {onBack && (
          <ScreenSection>
            <View style={styles.navigationHeader}>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  onBack();
                }}
                style={styles.backButtonContainer}
                activeOpacity={0.7}
                accessibilityLabel="Geri dön"
                accessibilityRole="button"
                accessibilityHint="Önceki adıma geri dön"
              >
                <View style={styles.backButtonInner}>
                  <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} />
                  <Text style={styles.backButtonText}>Geri</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScreenSection>
        )}

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>Minnet Hatırlatıcıları ✨</Text>
            <Text style={styles.subtitle}>
              Minnettarlık deneyimini daha da zenginleştirelim. Bu özellikleri istediğin zaman açıp
              kapatabilirsin.
            </Text>
          </View>
        </ScreenSection>

        {/* Features Section */}
        <ScreenSection variant="edge-to-edge">
          {/* Varied Prompts Feature */}
          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="bulb" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.featureTitleContainer}>
                <Text style={styles.featureTitle}>Çeşitli İlham Soruları</Text>
                <Text style={styles.featureDescription}>
                  Minnet Ekle sayfasında farklı sorulardan ilham al. "Bugün seni güldüren neydi?"
                  gibi yaratıcı sorular.
                </Text>
              </View>
              <ThemedSwitch
                value={features.useVariedPrompts}
                onValueChange={(value: boolean) => handleFeatureToggle('useVariedPrompts', value)}
                size="medium"
                testID="onboarding-varied-prompts-switch"
              />
            </View>
          </View>

          {/* Throwback Feature */}
          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <View style={styles.featureIconWrapper}>
                <Ionicons name="time" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.featureTitleContainer}>
                <Text style={styles.featureTitle}>Anı Hatırlatıcıları</Text>
                <Text style={styles.featureDescription}>
                  Her gün geçmişteki güzel anılarını yeniden keşfet. Eski minnettarlıklarını
                  hatırlatan günlük bildirimler al.
                </Text>
              </View>
              <ThemedSwitch
                value={features.throwbackEnabled}
                onValueChange={(value: boolean) => handleFeatureToggle('throwbackEnabled', value)}
                size="medium"
                testID="onboarding-throwback-switch"
              />
            </View>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                Bu ayarları istediğin zaman profil ayarlarından değiştirebilirsin. Deneyimi tamamen
                senin kontrolünde!
              </Text>
            </View>
          </View>
        </ScreenSection>

        {/* Actions Section */}
        <ScreenSection>
          <View style={styles.footer}>
            <OnboardingButton
              onPress={handleContinue}
              title="Devam Et"
              accessibilityLabel="Özellikleri ayarla ve devam et"
            />
          </View>
        </ScreenSection>
      </Animated.View>
    </OnboardingLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    navigationHeader: {
      alignItems: 'flex-start',
      paddingBottom: theme.spacing.md,
    },
    backButtonContainer: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface + 'CC',
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    backButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    backButtonText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    header: {
      alignItems: 'center',
      paddingTop: 0,
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    featureCard: {
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // Removed primary shadow
    },
    featureHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    featureIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
    },
    featureTitleContainer: {
      flex: 1,
    },
    featureTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    featureDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },

    infoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // Removed primary shadow
    },
    infoContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    infoText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      flex: 1,
      lineHeight: 20,
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    // Removed button styles - handled by OnboardingButton component
  });

export default FeatureIntroStep;
