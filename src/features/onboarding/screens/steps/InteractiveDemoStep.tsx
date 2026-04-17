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

  // Guards against double advancement when the mutation fires both
  // onSuccess and a retry callback, or when the user taps twice.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancedRef = useRef(false);

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

  // Cancel any pending auto-advance when unmounting.
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
      // Save as real gratitude entry for today's date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      addStatement(
        { entryDate: today, statement, moodEmoji: mood },
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
            // Still celebrate for UX but record the error.
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
          },
        ]}
      >
        <ScreenSection>
          <OnboardingNavHeader
            onBack={() => {
              hapticFeedback.light();
              onBack();
            }}
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
                <Feather name="sunrise" size={14} color={theme.colors.primary} />
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
                    <View style={styles.successBadge}>
                      <Feather name="check" size={18} color={theme.colors.onPrimary} />
                    </View>
                    <Text style={styles.successTitle}>{t('onboarding.demo.successTitle')}</Text>
                    <Text style={styles.successText}>{t('onboarding.demo.successText')}</Text>
                    <Text style={styles.successFootnote}>
                      {t('onboarding.demo.successFootnote')}
                    </Text>
                  </View>
                </View>
              </Animated.View>
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
    // Navigation header moved to shared component
    header: {
      alignItems: 'center',
      paddingTop: 0,
    },
    kickerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.secondary + '18',
      marginBottom: theme.spacing.xs,
    },
    kickerText: {
      ...theme.typography.labelSmall,
      fontSize: 10,
      color: theme.colors.secondary,
      letterSpacing: 0.3,
    },
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
    },
    demoArea: {
      gap: theme.spacing.sm,
    },
    promptCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      ...getPrimaryShadow.card(theme),
    },
    promptHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    promptLabel: {
      ...theme.typography.bodySmall,
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    promptLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    promptText: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.onBackground,
      fontStyle: 'italic',
      lineHeight: 20,
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
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      ...getPrimaryShadow.overlay(theme),
    },
    successContent: {
      alignItems: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    successBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xs,
    },
    successTitle: {
      ...theme.typography.titleLarge,
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.onBackground,
      marginBottom: 2,
      textAlign: 'center',
    },
    successText: {
      ...theme.typography.bodyMedium,
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    successFootnote: {
      ...theme.typography.bodySmall,
      fontSize: 12,
      color: theme.colors.primary,
      marginTop: theme.spacing.xs,
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
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    savingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    savingText: {
      ...theme.typography.bodySmall,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
  });

export default InteractiveDemoStep;
