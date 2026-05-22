import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { OnboardingMascot } from '@/features/onboarding/components/OnboardingMascot';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPrimaryShadow } from '@/themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import type { MoodEmoji } from '@/types/mood.types';

import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import { ScreenSection } from '@/shared/components/layout';
import OnboardingNavHeader from '@/features/onboarding/components/OnboardingNavHeader';
import OnboardingGratitudeInput from '@/features/onboarding/components/OnboardingGratitudeInput';
import { useGratitudeMutations } from '@/features/gratitude/hooks';
import { useCurrentPrompt } from '@/features/gratitude/hooks';

interface InteractiveDemoStepProps {
  onNext: () => void;
  onBack: () => void;
  currentStep?: number;
  totalSteps?: number;
}

export const InteractiveDemoStep: React.FC<InteractiveDemoStepProps> = ({
  onNext,
  onBack,
  currentStep,
  totalSteps,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  const { data: currentPrompt, isLoading: promptLoading } = useCurrentPrompt();
  const { addStatement, isAddingStatement } = useGratitudeMutations();

  const [hasWrittenStatement, setHasWrittenStatement] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancedRef = useRef(false);

  const animations = useCoordinatedAnimations();
  const successScale = useRef(new Animated.Value(0.9)).current;
  const successFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  useEffect(() => {
    if (showSuccess) {
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(successFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSuccess, successScale, successFade]);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = null;
      }
    };
  }, []);

  const scheduleAdvance = useCallback(() => {
    if (advancedRef.current || advanceTimerRef.current) {
      return;
    }
    advanceTimerRef.current = setTimeout(() => {
      advancedRef.current = true;
      advanceTimerRef.current = null;
      onNext();
    }, 2400);
  }, [onNext]);

  const handleStatementSubmit = useCallback(
    (statement: string, mood: MoodEmoji | null) => {
      const today = new Date().toISOString().split('T')[0];

      addStatement(
        { entryDate: today, statement, moodEmoji: mood, isDemo: true },
        {
          onSuccess: () => {
            setHasWrittenStatement(true);
            setShowSuccess(true);
            hapticFeedback.success();

            analyticsService.logEvent('onboarding_demo_statement_saved', {
              statement_length: statement.length,
              used_prompt: !!currentPrompt,
              entry_date: today,
              mood,
            });

            scheduleAdvance();
          },
          onError: (error: Error) => {
            setHasWrittenStatement(true);
            setShowSuccess(true);
            hapticFeedback.success();

            analyticsService.logEvent('onboarding_demo_statement_error', {
              statement_length: statement.length,
              error: error.message,
              mood,
            });

            scheduleAdvance();
          },
        }
      );
    },
    [currentPrompt, scheduleAdvance, addStatement]
  );

  const getPromptText = () => {
    if (promptLoading) {
      return t('onboarding.demo.promptLoading');
    }
    if (currentPrompt) {
      return currentPrompt.prompt_text;
    }
    return t('onboarding.demo.promptFallback');
  };

  return (
    <OnboardingLayout edgeToEdge={true} ambient="sunrise">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
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

        <OnboardingMascot source={require('@/assets/assets/mascot1.png')} delay={200} />

        <ScreenSection>
          <View style={styles.header}>
            <View style={styles.kickerPill}>
              <Feather name="sun" size={12} color={theme.colors.secondary} />
              <Text style={styles.kickerText}>{t('onboarding.demo.kicker')}</Text>
            </View>
            <Text style={styles.title}>{t('onboarding.demo.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.demo.subtitle')}</Text>
          </View>
        </ScreenSection>

        <ScreenSection>
          <View style={styles.demoArea}>
            <View style={styles.promptCard}>
              <View style={styles.promptHeader}>
                <Feather name="sunrise" size={16} color={theme.colors.primary} />
                <Text style={styles.promptLabel}>{t('onboarding.demo.promptLabel')}</Text>
              </View>
              {promptLoading ? (
                <View style={styles.promptLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.promptText}>{t('onboarding.demo.promptLoading')}</Text>
                </View>
              ) : (
                <Text style={styles.promptText}>{getPromptText()}</Text>
              )}
            </View>

            <OnboardingGratitudeInput
              onSubmitWithMood={handleStatementSubmit}
              placeholder={t('onboarding.demo.placeholder')}
              buttonText={
                isAddingStatement
                  ? t('onboarding.demo.buttonSaving')
                  : t('onboarding.demo.buttonTry')
              }
              disabled={isAddingStatement || hasWrittenStatement}
            />

            {showSuccess && (
              <View style={styles.successContainer}>
                <Animated.View
                  style={[
                    styles.successCard,
                    {
                      opacity: successFade,
                      transform: [{ scale: successScale }],
                    },
                  ]}
                >
                  <View style={styles.successContent}>
                    <View style={styles.successBadge}>
                      <Feather name="check" size={24} color={theme.colors.onPrimary} />
                    </View>
                    <Text style={styles.successTitle}>{t('onboarding.demo.successTitle')}</Text>
                    <Text style={styles.successText}>{t('onboarding.demo.successText')}</Text>
                    <Text style={styles.successFootnote}>
                      {t('onboarding.demo.successFootnote')}
                    </Text>
                  </View>
                </Animated.View>
              </View>
            )}
          </View>
        </ScreenSection>

        <ScreenSection>
          <View style={styles.footer}>
            {isAddingStatement && (
              <View style={styles.savingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.savingText}>{t('onboarding.demo.savingText')}</Text>
              </View>
            )}

            {!hasWrittenStatement && !isAddingStatement && (
              <Text style={styles.encouragement}>{t('onboarding.demo.encouragement')}</Text>
            )}
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
    header: {
      alignItems: 'center',
      paddingTop: 0,
      marginBottom: theme.spacing.sm,
    },
    kickerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.secondary + '10',
      marginBottom: theme.spacing.sm,
    },
    kickerText: {
      ...theme.typography.labelSmall,
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.secondary,
      letterSpacing: 0.4,
    },
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
    },
    demoArea: {
      gap: theme.spacing.md,
    },
    promptCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '15',
      ...getPrimaryShadow.overlay(theme), // Softer, more elevated shadow
    },
    promptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    promptLabel: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    promptLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    promptText: {
      ...theme.typography.bodyMedium,
      fontSize: 15,
      color: theme.colors.onBackground,
      fontStyle: 'italic',
      lineHeight: 24,
    },
    successContainer: {
      position: 'absolute',
      top: -theme.spacing.xl,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      backgroundColor: theme.colors.background + 'A0', // Slightly more opaque
      zIndex: 10,
    },
    successCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xxl, // Softer corners
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '20',
      ...getPrimaryShadow.overlay(theme),
    },
    successContent: {
      alignItems: 'center',
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    successBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
      ...getPrimaryShadow.small(theme),
    },
    successTitle: {
      ...theme.typography.titleLarge,
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.onBackground,
      marginBottom: 2,
      textAlign: 'center',
    },
    successText: {
      ...theme.typography.bodyMedium,
      fontSize: 15,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 22,
    },
    successFootnote: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.primary,
      marginTop: theme.spacing.md,
      textAlign: 'center',
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    encouragement: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    savingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    savingText: {
      ...theme.typography.bodySmall,
      fontSize: 13,
      color: theme.colors.onSurfaceVariant,
    },
  });

export default InteractiveDemoStep;
