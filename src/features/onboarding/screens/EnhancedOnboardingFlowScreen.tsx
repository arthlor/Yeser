import { useUserProfile } from '@/hooks';
import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import type { RootStackParamList } from '@/types/navigation';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, StyleSheet, View } from 'react-native';

import CompletionStep from './steps/CompletionStep';
import FeatureIntroStep from './steps/FeatureIntroStep';
import GoalSettingStep from './steps/GoalSettingStep';
import InteractiveDemoStep from './steps/InteractiveDemoStep';
import PersonalizationStep from './steps/PersonalizationStep';
import WelcomeStep from './steps/WelcomeStep';
import { logger } from '@/utils/debugConfig';

import { ScreenLayout } from '@/shared/components/layout';

type EnhancedOnboardingFlowNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

// Define onboarding steps
const ONBOARDING_STEPS = [
  'welcome',
  'demo',
  'goal',
  'personalization',
  'features',
  'completion',
] as const;

type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

interface OnboardingData {
  username: string;
  dailyGoal: number;
  selectedTheme: string;
  useVariedPrompts: boolean;
  throwbackEnabled: boolean;
  throwbackFrequency: 'daily' | 'weekly' | 'monthly';
  hasCompletedDemo: boolean;
}

export const EnhancedOnboardingFlowScreen: React.FC = () => {
  const navigation = useNavigation<EnhancedOnboardingFlowNavigationProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // TanStack Query for profile updates
  const { profile, updateProfile, updateProfileError, isUpdatingProfile } = useUserProfile();

  // Onboarding state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    dailyGoal: 3,
    selectedTheme: 'light',
    useVariedPrompts: true,
    throwbackEnabled: true,
    throwbackFrequency: 'weekly',
    hasCompletedDemo: false,
  });

  // Animation for step transitions (simplified)
  const stepAnim = useRef(new Animated.Value(1)).current;

  // Animate step transitions
  const animateStepTransition = useCallback(() => {
    Animated.sequence([
      Animated.timing(stepAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(stepAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepAnim]);

  // Navigate to previous step (moved before useEffect)
  const handleStepBack = useCallback(() => {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      const previousStep = ONBOARDING_STEPS[currentIndex - 1];
      setCurrentStep(previousStep);
      animateStepTransition();

      // Track step back navigation
      analyticsService.logEvent('onboarding_step_back', {
        from_step: currentStep,
        to_step: previousStep,
        step_index: currentIndex,
      });
    }
  }, [currentStep, animateStepTransition]);

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
        animateStepTransition();

        // Track step progression
        analyticsService.logEvent('onboarding_step_completed', {
          step: currentStep,
          next_step: nextStep,
          step_index: currentIndex,
        });
      }
    },
    [currentStep, animateStepTransition]
  );

  useEffect(() => {
    // Track onboarding start
    analyticsService.logEvent('enhanced_onboarding_started', {
      flow_version: '2.0',
      total_steps: ONBOARDING_STEPS.length,
    });

    // Initial animation for first step
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Handle Android back button
    const handleBackPress = () => {
      handleStepBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [stepAnim, handleStepBack]);

  // Complete onboarding and save data
  const handleOnboardingComplete = useCallback(async () => {
    try {
      const finalData = {
        username: onboardingData.username || 'Kullanıcı',
        daily_gratitude_goal: onboardingData.dailyGoal || 3,
        use_varied_prompts: onboardingData.useVariedPrompts ?? true,
        throwback_reminder_enabled: onboardingData.throwbackEnabled ?? true,
        throwback_reminder_frequency: onboardingData.throwbackFrequency || 'weekly',
        onboarded: true,
        // Keep existing reminder settings from the profile
        reminder_enabled: profile?.reminder_enabled ?? true,
        reminder_time: profile?.reminder_time || '09:00:00',
      };

      // Save to profile using TanStack Query
      updateProfile(finalData);

      // Track completion
      analyticsService.logEvent('enhanced_onboarding_completed', {
        flow_version: '2.0',
        username_length: finalData.username.length,
        daily_goal: finalData.daily_gratitude_goal,
        theme: onboardingData.selectedTheme || 'light',
        varied_prompts: finalData.use_varied_prompts,
        throwback_enabled: finalData.throwback_reminder_enabled,
        throwback_frequency: finalData.throwback_reminder_frequency,
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
    }
  }, [onboardingData, profile, updateProfile]);

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

      case 'features':
        return (
          <FeatureIntroStep
            {...stepProps}
            onNext={(features) =>
              handleStepNext({
                useVariedPrompts: features.useVariedPrompts,
                throwbackEnabled: features.throwbackEnabled,
                throwbackFrequency: features.throwbackFrequency,
              })
            }
            initialPreferences={{
              useVariedPrompts: onboardingData.useVariedPrompts ?? true,
              throwbackEnabled: onboardingData.throwbackEnabled ?? true,
              throwbackFrequency: onboardingData.throwbackFrequency || 'weekly',
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
              featuresEnabled: [
                ...(onboardingData.useVariedPrompts ? ['Çeşitli İlham Soruları'] : []),
                ...(onboardingData.throwbackEnabled ? ['Anı Pırıltıları'] : []),
              ],
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
        <Animated.View
          style={[
            styles.stepContainer,
            {
              opacity: stepAnim,
              transform: [
                {
                  translateX: stepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {renderCurrentStep()}
        </Animated.View>

        {/* Step Progress Indicator */}
        {currentStep !== 'completion' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View
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
      paddingTop: theme.spacing.xl,
    },
    progressContainer: {
      position: 'absolute',
      top: theme.spacing.xl + 10,
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
