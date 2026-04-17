import { useUserProfile } from '@/hooks';
import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { useToast } from '@/providers/ToastProvider';

import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import CompletionStep from './steps/CompletionStep';
import { useTranslation } from 'react-i18next';
import GoalSettingStep from './steps/GoalSettingStep';
import InteractiveDemoStep from './steps/InteractiveDemoStep';
import NotificationPermissionStep from './steps/NotificationPermissionStep';
import PaywallStep from './steps/PaywallStep';
import PersonalizationStep from './steps/PersonalizationStep';
import PlanRevealStep from './steps/PlanRevealStep';
import WelcomeStep from './steps/WelcomeStep';
import OnboardingProgressDots from '@/features/onboarding/components/OnboardingProgressDots';
import { logger } from '@/utils/debugConfig';

import { ScreenLayout } from '@/shared/components/layout';

// Define onboarding steps
const ONBOARDING_STEPS = [
  'welcome',
  'demo',
  'goal',
  'personalization',
  'notifications',
  'planReveal',
  'paywall',
  'completion',
] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

interface OnboardingData {
  username: string;
  dailyGoal: number;
  selectedTheme: string;
  hasCompletedDemo: boolean;
}

export const EnhancedOnboardingFlowScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();
  const { showError } = useToast();

  // TanStack Query for profile updates
  const { updateProfileAsync, isUpdatingProfile } = useUserProfile();

  // Onboarding state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    dailyGoal: 3,
    selectedTheme: 'auto',
    hasCompletedDemo: false,
  });

  // Navigate to previous step (moved before useEffect)
  const handleStepBack = useCallback(() => {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      const previousStep = ONBOARDING_STEPS[currentIndex - 1];
      setCurrentStep(previousStep);

      // Track step back navigation
      analyticsService.logEvent('onboarding_step_back', {
        from_step: currentStep,
        to_step: previousStep,
        step_index: currentIndex,
      });
    }
  }, [currentStep]);

  // Navigate to next step
  const handleStepNext = useCallback(
    (stepData?: Partial<OnboardingData>) => {
      if (stepData) {
        setOnboardingData((prev) => ({ ...prev, ...stepData }));
      }

      const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
      if (currentIndex < ONBOARDING_STEPS.length - 1) {
        const nextStep = ONBOARDING_STEPS[currentIndex + 1];
        setCurrentStep(nextStep);

        // Track step progression
        analyticsService.logEvent('onboarding_step_completed', {
          step: currentStep,
          next_step: nextStep,
          step_index: currentIndex,
        });
      }
    },
    [currentStep]
  );

  useEffect(() => {
    // Track onboarding start
    analyticsService.logEvent('enhanced_onboarding_started', {
      flow_version: '2.3',
      total_steps: ONBOARDING_STEPS.length,
    });

    // Handle Android back button
    const handleBackPress = () => {
      handleStepBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [handleStepBack]);

  // Complete onboarding and save data
  const handleOnboardingComplete = useCallback(async () => {
    try {
      const finalData = {
        username: onboardingData.username || t('onboarding.flow.defaultUsername'),
        daily_gratitude_goal: onboardingData.dailyGoal || 3,
        use_varied_prompts: true, // Always enable varied prompts
        onboarded: true,
      };

      // Persist onboarding state before celebrating completion.
      await updateProfileAsync(finalData);

      // Track completion
      analyticsService.logEvent('enhanced_onboarding_completed', {
        flow_version: '2.3',
        username_length: finalData.username.length,
        daily_goal: finalData.daily_gratitude_goal,
        theme: onboardingData.selectedTheme || 'auto',
        varied_prompts: finalData.use_varied_prompts,
        completed_demo: onboardingData.hasCompletedDemo || false,
      });

      hapticFeedback.success();

      // Navigation will be handled automatically by RootNavigator
      // when onboarded status changes
    } catch (error) {
      logger.error('Error completing onboarding:', error as Error);
      analyticsService.logEvent('onboarding_completion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      showError(
        t('onboarding.flow.saveError', {
          defaultValue: 'We could not finish setting up your profile. Please try again.',
        })
      );
    }
  }, [onboardingData, showError, t, updateProfileAsync]);

  // Render current step
  const renderCurrentStep = () => {
    const stepProps = {
      onNext: handleStepNext,
      onBack: handleStepBack,
    };

    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep {...stepProps} />;

      case 'demo':
        return (
          <InteractiveDemoStep
            onNext={() => {
              setOnboardingData((prev) => ({ ...prev, hasCompletedDemo: true }));
              handleStepNext();
            }}
            onBack={handleStepBack}
          />
        );

      case 'goal':
        return (
          <GoalSettingStep
            {...stepProps}
            onNext={(selectedGoal) => handleStepNext({ dailyGoal: selectedGoal })}
            initialGoal={onboardingData.dailyGoal}
          />
        );

      case 'personalization':
        return (
          <PersonalizationStep
            {...stepProps}
            onNext={(data) =>
              handleStepNext({ username: data.username, selectedTheme: data.selectedTheme })
            }
            initialData={{
              username: onboardingData.username,
              selectedTheme: onboardingData.selectedTheme,
            }}
          />
        );

      case 'notifications':
        return <NotificationPermissionStep {...stepProps} />;

      case 'planReveal':
        return (
          <PlanRevealStep
            {...stepProps}
            username={onboardingData.username || t('onboarding.flow.defaultUsername')}
            dailyGoal={onboardingData.dailyGoal || 3}
          />
        );

      case 'paywall':
        return <PaywallStep onNext={stepProps.onNext} />;

      case 'completion':
        return (
          <CompletionStep
            onComplete={handleOnboardingComplete}
            onBack={handleStepBack}
            isCompleting={isUpdatingProfile}
            userSummary={{
              username: onboardingData.username || t('onboarding.flow.defaultUsername'),
              dailyGoal: onboardingData.dailyGoal || 3,
              selectedTheme: onboardingData.selectedTheme || 'auto',
              // ✅ SIMPLIFIED: Default features enabled, no user selection needed
              featuresEnabled: t('onboarding.flow.featuresEnabled', {
                returnObjects: true,
              }) as string[],
            }}
          />
        );

      default:
        return <WelcomeStep {...stepProps} />;
    }
  };

  return (
    <ScreenLayout
      showsVerticalScrollIndicator={false}
      edges={['top']}
      edgeToEdge={true}
      backgroundColor={theme.colors.background}
    >
      <View style={styles.container}>
        <View style={styles.stepContainer}>{renderCurrentStep()}</View>

        {/* Step Progress Indicator (hidden on paywall + completion for focus) */}
        {currentStep !== 'completion' && currentStep !== 'paywall' && (
          <View style={styles.progressContainer} pointerEvents="none">
            <OnboardingProgressDots
              total={ONBOARDING_STEPS.length}
              current={ONBOARDING_STEPS.indexOf(currentStep)}
            />
          </View>
        )}
      </View>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    stepContainer: {
      flex: 1,
      paddingTop: theme.spacing.xxl,
    },
    progressContainer: {
      position: 'absolute',
      top: theme.spacing.lg,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      zIndex: 10,
      paddingVertical: theme.spacing.xs,
    },
  });

export default EnhancedOnboardingFlowScreen;
