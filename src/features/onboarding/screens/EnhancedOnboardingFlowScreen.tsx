import { useUserProfile } from '@/hooks';
import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';

import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import CompletionStep from './steps/CompletionStep';
import GoalSettingStep from './steps/GoalSettingStep';
import InteractiveDemoStep from './steps/InteractiveDemoStep';
import PersonalizationStep from './steps/PersonalizationStep';
import WelcomeStep from './steps/WelcomeStep';
import { logger } from '@/utils/debugConfig';

import { ScreenLayout } from '@/shared/components/layout';

// Define onboarding steps
const ONBOARDING_STEPS = ['welcome', 'demo', 'goal', 'personalization', 'completion'] as const;

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

  // TanStack Query for profile updates
  const { updateProfile } = useUserProfile();

  // Onboarding state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    dailyGoal: 3,
    selectedTheme: 'light',
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
      flow_version: '2.2', // Updated version - simplified notification system
      total_steps: ONBOARDING_STEPS.length,
      notification_system: 'simplified',
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
        username: onboardingData.username || 'Kullanıcı',
        daily_gratitude_goal: onboardingData.dailyGoal || 3,
        // ✅ SIMPLIFIED: Only essential fields for simplified notification system
        use_varied_prompts: true, // Always enable varied prompts
        onboarded: true,
        // 🚀 SIMPLIFIED: Only notifications_enabled controls everything
        // Fixed schedule: ["12:00", "14:00", "19:00", "21:00"] - no user configuration needed
        notifications_enabled: false, // Disabled by default - users can enable in Settings
      };

      // Save to profile using TanStack Query
      updateProfile(finalData);

      // Track completion
      analyticsService.logEvent('enhanced_onboarding_completed', {
        flow_version: '2.2', // Updated version for simplified notification system
        username_length: finalData.username.length,
        daily_goal: finalData.daily_gratitude_goal,
        theme: onboardingData.selectedTheme || 'light',
        varied_prompts: finalData.use_varied_prompts,
        notifications_enabled: finalData.notifications_enabled,
        completed_demo: onboardingData.hasCompletedDemo || false,
        notification_system: 'simplified', // Track simplified notification system
        fixed_schedule: '12:00,14:00,19:00,21:00', // Track hardcoded schedule
      });

      hapticFeedback.success();

      // Navigation will be handled automatically by RootNavigator
      // when onboarded status changes
    } catch (error) {
      logger.error('Error completing onboarding:', error as Error);
      analyticsService.logEvent('onboarding_completion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [onboardingData, updateProfile]);

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

      case 'completion':
        return (
          <CompletionStep
            onComplete={handleOnboardingComplete}
            onBack={handleStepBack}
            userSummary={{
              username: onboardingData.username || 'Kullanıcı',
              dailyGoal: onboardingData.dailyGoal || 3,
              selectedTheme: onboardingData.selectedTheme || 'light',
              // ✅ SIMPLIFIED: Default features enabled, no user selection needed
              featuresEnabled: ['Çeşitli İlham Soruları', 'Anı Pırıltıları'],
            }}
          />
        );

      default:
        return <WelcomeStep {...stepProps} />;
    }
  };

  return (
    <ScreenLayout showsVerticalScrollIndicator={false} edges={['top']} edgeToEdge={true}>
      <View style={styles.container}>
        <View style={styles.stepContainer}>{renderCurrentStep()}</View>

        {/* Step Progress Indicator */}
        {currentStep !== 'completion' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((ONBOARDING_STEPS.indexOf(currentStep) + 1) / ONBOARDING_STEPS.length) * 100}%`,
                  },
                ]}
              />
            </View>
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
      paddingTop: theme.spacing.xxl + theme.spacing.lg,
    },
    progressContainer: {
      position: 'absolute',
      top: theme.spacing.lg,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      zIndex: 10,
      backgroundColor: theme.colors.background + 'E6',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
    },
    progressBar: {
      height: 3,
      backgroundColor: theme.colors.outline + '20',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
  });

export default EnhancedOnboardingFlowScreen;
