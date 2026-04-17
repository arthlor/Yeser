import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { OnboardingMascot } from '@/features/onboarding/components/OnboardingMascot';
import { Feather } from '@expo/vector-icons';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useCallback, useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import OnboardingNavHeader from '@/features/onboarding/components/OnboardingNavHeader';
import { OnboardingButton } from '@/features/onboarding/components/OnboardingButton';
import { ScreenSection } from '@/shared/components/layout';
import { useTranslation } from 'react-i18next';

interface GoalSettingStepProps {
  onNext: (selectedGoal: number) => void;
  onBack: () => void;
  initialGoal?: number;
}

export const GoalSettingStep: React.FC<GoalSettingStepProps> = ({
  onNext,
  onBack,
  initialGoal = 3,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [selectedGoal, setSelectedGoal] = React.useState(initialGoal);

  const animations = useCoordinatedAnimations();
  const styles = createStyles(theme);

  useEffect(() => {
    analyticsService.logScreenView('onboarding_goal_setting_step');
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  const containerStyle = useMemo(
    () => ({
      opacity: animations.fadeAnim,
      transform: animations.entranceTransform,
    }),
    [animations.fadeAnim, animations.entranceTransform]
  );

  const goalOptions = useMemo(
    () => [
      {
        value: 1,
        emoji: '🌱',
        label: t('onboarding.goal.options.one.label'),
        description: t('onboarding.goal.options.one.desc'),
        vibe: t('onboarding.goal.options.one.vibe'),
      },
      {
        value: 3,
        emoji: '🌿',
        label: t('onboarding.goal.options.three.label'),
        description: t('onboarding.goal.options.three.desc'),
        vibe: t('onboarding.goal.options.three.vibe'),
      },
      {
        value: 5,
        emoji: '🌳',
        label: t('onboarding.goal.options.five.label'),
        description: t('onboarding.goal.options.five.desc'),
        vibe: t('onboarding.goal.options.five.vibe'),
      },
      {
        value: 0,
        emoji: '✨',
        label: t('onboarding.goal.options.custom.label'),
        description: t('onboarding.goal.options.custom.desc'),
        vibe: t('onboarding.goal.options.custom.vibe'),
      },
    ],
    [t]
  );

  const handleGoalSelect = useCallback((goal: number) => {
    setSelectedGoal(goal);
    hapticFeedback.light();
    analyticsService.logEvent('onboarding_goal_selected', { selected_goal: goal });
  }, []);

  const handleContinue = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_goal_confirmed', { final_goal: selectedGoal });
    onNext(selectedGoal);
  }, [selectedGoal, onNext]);

  const renderGoalOption = useCallback(
    (option: (typeof goalOptions)[0]) => {
      const isSelected = selectedGoal === option.value;
      const isRecommended = option.value === 3;

      return (
        <TouchableOpacity
          key={option.value}
          onPress={() => handleGoalSelect(option.value)}
          style={[styles.optionCard, isSelected && styles.optionCardSelected]}
          activeOpacity={0.85}
          accessible
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={`${option.label}: ${option.description}`}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionEmojiWrap}>
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
            </View>
            <View style={styles.optionText}>
              <View style={styles.optionLabelRow}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Feather name="star" size={10} color={theme.colors.onPrimary} />
                    <Text style={styles.recommendedText}>
                      {t('onboarding.goal.options.recommended')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDescription}>{option.description}</Text>
              <Text style={styles.optionVibe}>{option.vibe}</Text>
            </View>
            <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
              {isSelected && (
                <Feather name="check" size={14} color={theme.colors.onPrimary} strokeWidth={3} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedGoal, theme, handleGoalSelect, styles, t]
  );

  return (
    <OnboardingLayout edgeToEdge={true} ambient="warm">
      <Animated.View style={[styles.container, containerStyle]}>
        <ScreenSection>
          <OnboardingNavHeader
            onBack={() => {
              hapticFeedback.light();
              onBack();
            }}
          />
        </ScreenSection>

        <OnboardingMascot source={require('@/assets/assets/mascot2.png')} delay={200} />

        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>{t('onboarding.goal.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.goal.subtitle')}</Text>
          </View>
        </ScreenSection>

        <ScreenSection>
          <View style={styles.optionsContainer}>{goalOptions.map(renderGoalOption)}</View>

          <View style={styles.infoCard}>
            <Feather name="info" size={16} color={theme.colors.primary} />
            <Text style={styles.infoText}>{t('onboarding.goal.info')}</Text>
          </View>
        </ScreenSection>

        <ScreenSection>
          <View style={styles.footer}>
            <OnboardingButton
              onPress={handleContinue}
              title={t('onboarding.goal.continue')}
              accessibilityLabel={t('onboarding.goal.continueA11y')}
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
    header: { alignItems: 'center', paddingTop: 0 },
    title: {
      ...theme.typography.headlineMedium,
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: theme.spacing.sm,
    },
    optionsContainer: {
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    optionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + '35',
    },
    optionCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '0E',
      ...getPrimaryShadow.small(theme),
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    optionEmojiWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionEmoji: {
      fontSize: 22,
    },
    optionText: {
      flex: 1,
    },
    optionLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: 2,
    },
    optionLabel: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onBackground,
      fontWeight: '600',
    },
    optionLabelSelected: {
      color: theme.colors.primary,
    },
    optionDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    optionVibe: {
      ...theme.typography.bodySmall,
      fontSize: 11,
      color: theme.colors.primary,
      marginTop: 2,
      fontStyle: 'italic',
      letterSpacing: 0.2,
    },
    radioButton: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.outline,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    recommendedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.xs + 2,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
    },
    recommendedText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary + '0E',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    infoText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
      lineHeight: 18,
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
  });

export default GoalSettingStep;
