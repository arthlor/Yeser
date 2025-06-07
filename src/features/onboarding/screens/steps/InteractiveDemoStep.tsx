import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';
import { getPrimaryShadow } from '@/themes/utils';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, IconButton } from 'react-native-paper';
import { logger } from '@/utils/debugConfig';

import { ScreenLayout, ScreenSection } from '@/shared/components/layout';
import OnboardingGratitudeInput from '@/components/onboarding/OnboardingGratitudeInput';
import { useGratitudeMutations } from '@/features/gratitude/hooks';
import { useCurrentPrompt } from '@/features/gratitude/hooks';

interface InteractiveDemoStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const InteractiveDemoStep: React.FC<InteractiveDemoStepProps> = ({ onNext, onBack }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Use real app hooks for authentic experience
  const { data: currentPrompt, isLoading: promptLoading } = useCurrentPrompt();
  const { addStatement, isAddingStatement, addStatementError } = useGratitudeMutations();

  const [hasWrittenStatement, setHasWrittenStatement] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedStatement, setSavedStatement] = useState<string>('');

  // Simplified animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (showSuccess) {
      // Simple success animation
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [showSuccess, successAnim]);

  const handleStatementSubmit = useCallback(
    (statement: string) => {
      // Save as real gratitude entry for today's date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      addStatement(
        { entryDate: today, statement },
        {
          onSuccess: () => {
            setHasWrittenStatement(true);
            setShowSuccess(true);
            setSavedStatement(statement);
            hapticFeedback.success();

            // Track demo completion with success
            analyticsService.logEvent('onboarding_demo_statement_saved', {
              statement_length: statement.length,
              used_prompt: !!currentPrompt,
              entry_date: today,
            });

            // Auto-advance after celebration
            setTimeout(() => {
              onNext();
            }, 2500);
          },
          onError: (error: Error) => {
            logger.error('Error saving demo gratitude statement:', error);

            // Still show success for UX, but track the error
            setHasWrittenStatement(true);
            setShowSuccess(true);
            setSavedStatement(statement);
            hapticFeedback.success();

            analyticsService.logEvent('onboarding_demo_statement_error', {
              statement_length: statement.length,
              error: error.message,
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
    if (promptLoading) {return 'Loading inspiration...';}
    if (currentPrompt) {return currentPrompt.prompt_text_tr;}
    return 'Bugün neye minnettarsın?'; // Default fallback
  };

  return (
          <ScreenLayout edges={['top']} edgeToEdge={true}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Navigation Header */}
        <ScreenSection>
          <View style={styles.navigationHeader}>
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor={theme.colors.text}
              onPress={() => {
                hapticFeedback.light();
                onBack();
              }}
              accessibilityLabel="Geri dön"
              style={styles.backButton}
            />
          </View>
        </ScreenSection>

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>Hadi Deneyelim! ✨</Text>
            <Text style={styles.subtitle}>
              İlk minnettarlık ifadeni yazarak başlayalım. Küçük bir şey bile olabilir!
            </Text>
          </View>
        </ScreenSection>

        {/* Interactive Demo Section */}
        <ScreenSection>
          <View style={styles.demoArea}>
            {/* Current Prompt Display */}
            <View style={styles.promptCard}>
              <View style={styles.promptHeader}>
                <Ionicons name="bulb-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.promptLabel}>Bugünün İlhamı</Text>
              </View>
              {promptLoading ? (
                <View style={styles.promptLoading}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.promptText}>İlham yükleniyor...</Text>
                </View>
              ) : (
                <Text style={styles.promptText}>{getPromptText()}</Text>
              )}
            </View>

            {/* Gratitude Input - Using Specialized Onboarding Component */}
            <OnboardingGratitudeInput
              onSubmit={handleStatementSubmit}
              placeholder="Örneğin: Kahvemin sıcaklığı, arkadaşımın gülümsemesi..."
              buttonText={isAddingStatement ? 'Kaydediliyor...' : 'Dene'}
              disabled={isAddingStatement || hasWrittenStatement}
            />

            {/* Success Celebration */}
            {showSuccess && (
              <Animated.View
                style={[
                  styles.successContainer,
                  {
                    opacity: successAnim,
                  },
                ]}
              >
                <View style={styles.successCard}>
                  <View style={styles.successContent}>
                    <Text style={styles.successTitle}>Harika! 🎉</Text>
                    <Text style={styles.successText}>
                      İlk minnettarlık ifadeni yazdın ve kaydettik! Bu senin günlüğündeki ilk gerçek
                      kayıt. Şimdi uygulamayı nasıl kişiselleştireceğini görelim.
                    </Text>
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
                <Text style={styles.savingText}>İlk minnettarlığın kaydediliyor... ✨</Text>
              </View>
            )}

            {!hasWrittenStatement && !isAddingStatement && (
              <>
                <Text style={styles.encouragement}>💡 İpucu: Küçük şeyler de büyük fark yaratır</Text>


              </>
            )}
          </View>
        </ScreenSection>
      </Animated.View>
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    navigationHeader: {
      alignItems: 'flex-start',
      paddingBottom: 0,
    },
    backButton: {
      margin: 0,
      marginLeft: -theme.spacing.sm,
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
