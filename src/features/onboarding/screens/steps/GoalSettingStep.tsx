import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { OnboardingMascot } from '@/features/onboarding/components/OnboardingMascot';
import { Feather } from '@expo/vector-icons';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useCallback, useEffect, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import OnboardingNavHeader from '@/features/onboarding/components/OnboardingNavHeader';
import { OnboardingButton } from '@/features/onboarding/components/OnboardingButton';
import { ScreenSection } from '@/shared/components/layout';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

interface GoalSettingStepProps {
  onNext: (selectedGoal: number) => void;
  onBack: () => void;
  initialGoal?: number;
  currentStep?: number;
  totalSteps?: number;
}

const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);

export const GoalSettingStep: React.FC<GoalSettingStepProps> = ({
  onNext,
  onBack,
  initialGoal = 3,
  currentStep,
  totalSteps,
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
    ],
    [t]
  );

  const handleGoalSelect = useCallback(
    (goal: number) => {
      if (selectedGoal !== goal) {
        setSelectedGoal(goal);
        hapticFeedback.light();
        analyticsService.logEvent('onboarding_goal_selected', { selected_goal: goal });
      }
    },
    [selectedGoal]
  );

  const handleContinue = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_goal_confirmed', { final_goal: selectedGoal });
    onNext(selectedGoal);
  }, [selectedGoal, onNext]);

  return (
    <OnboardingLayout edgeToEdge={true} ambient="warm">
      <Animated.View style={[styles.container, containerStyle]}>
        <ScreenSection>
          <OnboardingNavHeader
            onBack={() => {
              hapticFeedback.light();
              onBack();
            }}
            currentStep={currentStep}
            totalSteps={totalSteps}
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
          <View style={styles.optionsContainer}>
            {goalOptions.map((option) => (
              <GoalOptionCard
                key={option.value}
                option={option}
                isSelected={selectedGoal === option.value}
                onSelect={handleGoalSelect}
                styles={styles}
                theme={theme}
                t={t}
              />
            ))}
          </View>

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
    header: { alignItems: 'center', paddingTop: 0, marginBottom: theme.spacing.sm },
    title: {
      ...theme.typography.headlineMedium,
      fontSize: 26,
      fontWeight: '700',
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
      letterSpacing: -0.5,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.sm,
    },
    optionsContainer: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    optionCardContainer: {
      borderRadius: theme.borderRadius.xl,
    },
    optionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1.5,
      borderColor: theme.colors.outline + '15',
      overflow: 'hidden',
    },
    optionCardSelected: {
      borderColor: theme.colors.primary,
      ...getPrimaryShadow.card(theme),
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    optionEmojiWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionEmojiWrapSelected: {
      backgroundColor: theme.colors.surface,
      ...getPrimaryShadow.small(theme),
    },
    optionEmoji: {
      fontSize: 24,
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
      fontSize: 16,
      color: theme.colors.onBackground,
      fontWeight: '600',
    },
    optionLabelSelected: {
      color: theme.colors.primary,
    },
    optionDescription: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
    },
    optionVibe: {
      ...theme.typography.bodySmall,
      fontSize: 12,
      color: theme.colors.primary,
      marginTop: 4,
      fontStyle: 'italic',
      letterSpacing: 0.2,
      fontWeight: '500',
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.outline + '40',
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
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.full,
    },
    recommendedText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimary,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.primary + '0A',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '20',
    },
    infoText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
      lineHeight: 18,
      fontSize: 13,
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
  });

interface GoalOption {
  value: number;
  emoji: string;
  label: string;
  description: string;
  vibe: string;
}

interface GoalOptionCardProps {
  option: GoalOption;
  isSelected: boolean;
  onSelect: (value: number) => void;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
  t: (key: string) => string;
}

const GoalOptionCard: React.FC<GoalOptionCardProps> = ({
  option,
  isSelected,
  onSelect,
  styles,
  theme,
  t,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isRecommended = option.value === 3;

  return (
    <AnimatedPressable
      onPress={() => onSelect(option.value)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.optionCardContainer, animatedStyle]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${option.label}: ${option.description}`}
    >
      <View style={[styles.optionCard, isSelected && styles.optionCardSelected]}>
        {isSelected && (
          <LinearGradient
            colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}
        <View style={styles.optionContent}>
          <View style={[styles.optionEmojiWrap, isSelected && styles.optionEmojiWrapSelected]}>
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
            {isSelected && <Text style={styles.optionVibe}>{option.vibe}</Text>}
          </View>
          <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
            {isSelected && (
              <Feather name="check" size={14} color={theme.colors.onPrimary} strokeWidth={3} />
            )}
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

export default GoalSettingStep;
