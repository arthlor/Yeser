import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getPrimaryShadow } from '@/themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import type { MoodEmoji } from '@/types/mood.types';

import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { ScreenSection } from '@/shared/components/layout';
import OnboardingNavHeader from '@/components/onboarding/OnboardingNavHeader';
import OnboardingGratitudeInput from '@/components/onboarding/OnboardingGratitudeInput';
import { useGratitudeMutations } from '@/features/gratitude/hooks';
import { useCurrentPrompt } from '@/features/gratitude/hooks';

interface InteractiveDemoStepProps {
  onNext: () => void;
  onBack: () => void;
}

/**
 * **SIMPLIFIED INTERACTIVE DEMO STEP**: Minimal, elegant demo experience
 *
 * **ANIMATION COORDINATION COMPLETED**:
 * - Eliminated complex manual Animated.timing calls
 * - Replaced with coordinated animation system for all interactions
 * - Simplified entrance and success animations
 * - Maintained demo functionality with minimal, non-intrusive animations
 */
export const InteractiveDemoStep: React.FC<InteractiveDemoStepProps> = ({ onNext, onBack }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { t } = useTranslation();

  // Use real app hooks for authentic experience
  const { data: currentPrompt, isLoading: promptLoading } = useCurrentPrompt();
  const { addStatement, isAddingStatement } = useGratitudeMutations();

  const [hasWrittenStatement, setHasWrittenStatement] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all demo animations
  const animations = useCoordinatedAnimations();

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // **COORDINATED SUCCESS**: Simple success animation
  useEffect(() => {
    if (showSuccess) {
      animations.animateEntrance({ duration: 500 });
    }
  }, [showSuccess, animations]);

  const handleStatementSubmit = useCallback(
    (statement: string, mood: MoodEmoji | null) => {
      // Save as real gratitude entry for today's date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      addStatement(
        { entryDate: today, statement, moodEmoji: mood },
        {
          onSuccess: () => {
            setHasWrittenStatement(true);
            setShowSuccess(true);
            hapticFeedback.success();

            // Track demo completion with success
            analyticsService.logEvent('onboarding_demo_statement_saved', {
              statement_length: statement.length,
              used_prompt: !!currentPrompt,
              entry_date: today,
              mood,
            });

            // Auto-advance after celebration
            setTimeout(() => {
              onNext();
            }, 2500);
          },
          onError: (error: Error) => {
            // Still show success for UX, but track the error
            setHasWrittenStatement(true);
            setShowSuccess(true);
            hapticFeedback.success();

            analyticsService.logEvent('onboarding_demo_statement_error', {
              statement_length: statement.length,
              error: error.message,
              mood,
            });

            // Continue with onboarding even if save failed
            setTimeout(() => {
              onNext();
            }, 2500);
          },
        }
      );
    },
    [currentPrompt, onNext, addStatement]
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
    <OnboardingLayout edgeToEdge={true}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: animations.fadeAnim,
          },
        ]}
      >
        {/* Standardized compact header */}
        <ScreenSection>
          <OnboardingNavHeader
            onBack={() => {
              hapticFeedback.light();
              onBack();
            }}
          />
        </ScreenSection>

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>{t('onboarding.demo.title')}</Text>
            <Text style={styles.subtitle}>{t('onboarding.demo.subtitle')}</Text>
          </View>
        </ScreenSection>

        {/* Interactive Demo Section */}
        <ScreenSection>
          <View style={styles.demoArea}>
            {/* Current Prompt Display */}
            <View style={styles.promptCard}>
              <View style={styles.promptHeader}>
                <Ionicons name="bulb-outline" size={20} color={theme.colors.primary} />
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

            {/* Gratitude Input - Using Specialized Onboarding Component */}
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

            {/* Success Celebration */}
            {showSuccess && (
              <Animated.View
                style={[
                  styles.successContainer,
                  {
                    opacity: animations.fadeAnim,
                  },
                ]}
              >
                <View style={styles.successCard}>
                  <View style={styles.successContent}>
                    <Text style={styles.successTitle}>{t('onboarding.demo.successTitle')}</Text>
                    <Text style={styles.successText}>{t('onboarding.demo.successText')}</Text>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </ScreenSection>

        {/* Progress & Actions Section */}
        <ScreenSection>
          <View style={styles.footer}>
            {isAddingStatement && (
              <View style={styles.savingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.savingText}>{t('onboarding.demo.savingText')}</Text>
              </View>
            )}

            {!hasWrittenStatement && !isAddingStatement && (
              <>
                <Text style={styles.encouragement}>{t('onboarding.demo.encouragement')}</Text>
              </>
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
    // Navigation header moved to shared component
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
    demoArea: {
      gap: theme.spacing.md,
    },
    promptCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // 🌟 Beautiful primary shadow for prompt card (no react-native-paper conflicts)
      ...getPrimaryShadow.card(theme),
    },
    promptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    promptLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    promptLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    promptText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      fontStyle: 'italic',
      lineHeight: 22,
    },
    successContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      backgroundColor: theme.colors.background + '95',
    },
    successCard: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      // 🌟 Beautiful primary shadow for success card (no react-native-paper conflicts)
      ...getPrimaryShadow.overlay(theme),
    },
    successContent: {
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    successTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    successText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    footer: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    encouragement: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
    },

    savingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    savingText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
    },
  });

export default InteractiveDemoStep;
