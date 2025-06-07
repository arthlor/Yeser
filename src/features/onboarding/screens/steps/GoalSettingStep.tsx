import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { Ionicons } from '@expo/vector-icons';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, IconButton } from 'react-native-paper';

import { ScreenLayout, ScreenSection } from '@/shared/components/layout';

interface GoalSettingStepProps {
  onNext: (selectedGoal: number) => void;
  onBack: () => void;
  initialGoal?: number;
}

const GOAL_OPTIONS = [
  { value: 1, label: '1 İfade', description: 'Basit ve etkili' },
  { value: 3, label: '3 İfade', description: 'Önerilen günlük hedef' },
  { value: 5, label: '5 İfade', description: 'Daha derin deneyim' },
  { value: 0, label: 'Özel', description: 'Kendim belirleyeceğim' },
];

export const GoalSettingStep: React.FC<GoalSettingStepProps> = ({
  onNext,
  onBack,
  initialGoal = 3,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [selectedGoal, setSelectedGoal] = useState<number>(initialGoal);

  // Simplified animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleGoalSelect = useCallback((goal: number) => {
    setSelectedGoal(goal);
    hapticFeedback.light();

    // Track goal selection
    analyticsService.logEvent('onboarding_goal_selected', {
      selected_goal: goal,
    });
  }, []);

  const handleContinue = useCallback(() => {
    hapticFeedback.success();
    analyticsService.logEvent('onboarding_goal_confirmed', {
      final_goal: selectedGoal,
    });
    onNext(selectedGoal);
  }, [selectedGoal, onNext]);

  const renderGoalOption = useCallback(
    (option: (typeof GOAL_OPTIONS)[0], index: number) => {
      const isSelected = selectedGoal === option.value;

      return (
        <Animated.View
          key={option.value}
          style={[
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => handleGoalSelect(option.value)}
            style={[styles.optionCard, isSelected && styles.optionCardSelected]}
            activeOpacity={0.7}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${option.label}: ${option.description}`}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionLeft}>
                <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
                  )}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      isSelected && styles.optionDescriptionSelected,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
              </View>
              {option.value === 3 && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Önerilen</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [selectedGoal, fadeAnim, theme, handleGoalSelect, styles]
  );

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
            <Text style={styles.title}>Günlük Hedefin Nedir? 🎯</Text>
            <Text style={styles.subtitle}>
              Her gün kaç minnettarlık ifadesi yazmak istiyorsun? Başlangıçta küçük hedefler büyük
              başarıları getirir.
            </Text>
          </View>
        </ScreenSection>

        {/* Goal Options Section */}
        <ScreenSection>
          <View style={styles.optionsContainer}>
            {GOAL_OPTIONS.map((option, index) => renderGoalOption(option, index))}
          </View>

          {/* Info Card */}
          <Animated.View
            style={[
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.infoCard}>
              <View style={styles.infoContent}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.infoText}>
                  Bu tercihini istediğin zaman profil ayarlarından değiştirebilirsin.
                </Text>
              </View>
            </View>
          </Animated.View>
        </ScreenSection>

        {/* Actions Section */}
        <ScreenSection>
          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleContinue}
              style={styles.continueButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonText}
            >
              Devam Et
            </Button>
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
    optionsContainer: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    optionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 2,
      borderColor: theme.colors.outline,
      // Removed shadows for cleaner appearance
    },
    optionCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
      // Removed shadows for cleaner appearance
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.outline,
      marginRight: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    optionText: {
      flex: 1,
    },
    optionLabel: {
      ...theme.typography.bodyLarge,
      color: theme.colors.text,
      fontWeight: '600',
      marginBottom: 2,
    },
    optionLabelSelected: {
      color: theme.colors.primary,
    },
    optionDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
    },
    optionDescriptionSelected: {
      color: theme.colors.primary + 'CC',
    },
    recommendedBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    recommendedText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      // 🌟 Beautiful primary shadow for info card (no react-native-paper conflicts)
      ...getPrimaryShadow.card(theme),
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
    continueButton: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
    },
    buttonContent: {
      paddingVertical: theme.spacing.xs,
    },
    buttonText: {
      ...theme.typography.bodyMedium,
      fontWeight: '600',
    },

  });

export default GoalSettingStep;
