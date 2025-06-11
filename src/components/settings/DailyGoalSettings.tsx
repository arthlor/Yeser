import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TextInput } from 'react-native-paper';

import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { logger } from '@/utils/debugConfig';

import type { AppTheme } from '@/themes/types';

interface DailyGoalSettingsProps {
  currentGoal: number;
  onUpdateGoal: (goal: number) => void;
}

const GOAL_OPTIONS = [
  { value: 1, label: '1 Minnet', description: 'Basit ve etkili', icon: 'numeric-1' },
  { value: 3, label: '3 Minnet', description: 'Önerilen günlük hedef', icon: 'numeric-3' },
  { value: 5, label: '5 Minnet', description: 'Daha derin deneyim', icon: 'numeric-5' },
];

const MAX_CUSTOM_GOAL = 20;

const DailyGoalSettings: React.FC<DailyGoalSettingsProps> = React.memo(
  ({ currentGoal, onUpdateGoal }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const [isExpanded, setIsExpanded] = useState(false);
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [customGoalInput, setCustomGoalInput] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const getCurrentGoalOption = () => {
      return (
        GOAL_OPTIONS.find((option) => option.value === currentGoal) || {
          value: currentGoal,
          label: `${currentGoal} Minnet`,
          description: 'Özel hedef',
          icon: 'target',
        }
      );
    };

    const getCustomGoalValidation = useCallback(() => {
      const numValue = parseInt(customGoalInput, 10);

      if (!customGoalInput || isNaN(numValue)) {
        return { isValid: false, message: '' };
      }

      if (numValue < 1) {
        return { isValid: false, message: 'En az 1 olmalıdır' };
      }

      if (numValue > MAX_CUSTOM_GOAL) {
        return { isValid: false, message: `En fazla ${MAX_CUSTOM_GOAL} olmalıdır` };
      }

      if (numValue === currentGoal) {
        return { isValid: false, message: 'Mevcut hedefle aynı' };
      }

      return { isValid: true, message: '' };
    }, [customGoalInput, currentGoal]);

    const handleToggleExpanded = useCallback(() => {
      if (isUpdating) {
        return;
      }

      setIsExpanded(!isExpanded);
      hapticFeedback.light();

      analyticsService.logEvent('daily_goal_settings_toggled', {
        expanded: !isExpanded,
        current_goal: currentGoal,
      });
    }, [isExpanded, currentGoal, isUpdating]);

    const handleGoalSelect = useCallback(
      (goal: number) => {
        if (goal === currentGoal || isUpdating) {
          return;
        }

        setIsUpdating(true);
        hapticFeedback.medium();

        try {
          onUpdateGoal(goal);

          analyticsService.logEvent('daily_goal_changed', {
            old_goal: currentGoal,
            new_goal: goal,
            changed_from_settings: true,
          });

          logger.debug('Daily goal updated from settings', {
            oldGoal: currentGoal,
            newGoal: goal,
          });

          // Auto-collapse after selection
          setTimeout(() => {
            setIsExpanded(false);
            setIsUpdating(false);
          }, 500);
        } catch (error) {
          logger.error('Error updating daily goal', error as Error);
          setIsUpdating(false);
        }
      },
      [currentGoal, onUpdateGoal, isUpdating]
    );

    const handleCustomGoalToggle = useCallback(() => {
      if (isUpdating) {
        return;
      }

      setShowCustomInput(!showCustomInput);
      setCustomGoalInput(currentGoal.toString());
      hapticFeedback.light();
    }, [showCustomInput, currentGoal, isUpdating]);

    const handleCustomGoalSubmit = useCallback(() => {
      if (isUpdating) {
        return;
      }

      const validation = getCustomGoalValidation();
      if (!validation.isValid) {
        return;
      }

      const customGoal = parseInt(customGoalInput, 10);
      setIsUpdating(true);

      try {
        onUpdateGoal(customGoal);
        setShowCustomInput(false);
        setIsExpanded(false);

        analyticsService.logEvent('custom_daily_goal_set', {
          old_goal: currentGoal,
          new_goal: customGoal,
        });
      } catch (error) {
        logger.error('Error setting custom daily goal', error as Error);
      } finally {
        setIsUpdating(false);
      }
    }, [customGoalInput, currentGoal, onUpdateGoal, isUpdating, getCustomGoalValidation]);

    const isCustomGoal = !GOAL_OPTIONS.find((option) => option.value === currentGoal);
    const currentOption = getCurrentGoalOption();
    const customValidation = getCustomGoalValidation();

    return (
      <ThemedCard variant="elevated" density="standard" elevation="card" style={styles.card}>
        {/* Main Setting Row */}
        <TouchableOpacity
          style={styles.mainRow}
          onPress={handleToggleExpanded}
          activeOpacity={0.8}
          accessibilityLabel={`Günlük hedef: ${currentOption.label}. Değiştirmek için dokunun.`}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          <View style={styles.settingInfo}>
            <View style={[styles.iconContainer, isExpanded && styles.iconContainerExpanded]}>
              <Icon name="target" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>Günlük Minnettarlık Hedefi</Text>
              <View style={styles.currentGoalContainer}>
                <Text style={[styles.currentGoalBadge, isCustomGoal && styles.customGoalBadge]}>
                  {currentOption.label}
                </Text>
                <Text style={styles.settingDescription}>{currentOption.description}</Text>
              </View>
            </View>
          </View>

          <View style={styles.expandContainer}>
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isExpanded ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded Goal Options */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            <View style={styles.divider} />

            {/* Subtle Warning */}
            <View style={styles.warningContainer}>
              <Icon name="information-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.warningText}>
                Günde en fazla {MAX_CUSTOM_GOAL} minnettarlık girişi yapabilirsiniz.
              </Text>
            </View>

            {GOAL_OPTIONS.map((option) => {
              const isSelected = option.value === currentGoal;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.goalOption, isSelected && styles.goalOptionSelected]}
                  onPress={() => handleGoalSelect(option.value)}
                  activeOpacity={0.7}
                  disabled={isUpdating}
                  accessibilityLabel={`${option.label}: ${option.description}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.goalOptionContent}>
                    <View style={styles.goalIconContainer}>
                      <Icon
                        name={option.icon}
                        size={18}
                        color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      />
                    </View>

                    <View style={styles.goalTextContainer}>
                      <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.goalDescription,
                          isSelected && styles.goalDescriptionSelected,
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={styles.selectedIndicator}>
                        <Icon name="check" size={16} color={theme.colors.primary} />
                      </View>
                    )}

                    {option.value === 3 && !isSelected && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>Önerilen</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Custom Goal Option */}
            <TouchableOpacity
              style={[
                styles.goalOption,
                (isCustomGoal || showCustomInput) && styles.goalOptionSelected,
              ]}
              onPress={handleCustomGoalToggle}
              activeOpacity={0.7}
              disabled={isUpdating}
              accessibilityLabel="Özel hedef belirle"
              accessibilityRole="button"
            >
              <View style={styles.goalOptionContent}>
                <View style={styles.goalIconContainer}>
                  <Icon
                    name="pencil"
                    size={18}
                    color={
                      isCustomGoal || showCustomInput
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </View>

                <View style={styles.goalTextContainer}>
                  <Text
                    style={[
                      styles.goalLabel,
                      (isCustomGoal || showCustomInput) && styles.goalLabelSelected,
                    ]}
                  >
                    Özel Hedef
                  </Text>
                  <Text
                    style={[
                      styles.goalDescription,
                      (isCustomGoal || showCustomInput) && styles.goalDescriptionSelected,
                    ]}
                  >
                    {isCustomGoal
                      ? `Mevcut: ${currentGoal} Minnet`
                      : 'Kendi hedefini belirle (1-20)'}
                  </Text>
                </View>

                {(isCustomGoal || showCustomInput) && (
                  <View style={styles.selectedIndicator}>
                    <Icon name="check" size={16} color={theme.colors.primary} />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Custom Goal Input */}
            {showCustomInput && (
              <View style={styles.customInputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    mode="outlined"
                    label={`Günlük hedef (1-${MAX_CUSTOM_GOAL})`}
                    value={customGoalInput}
                    onChangeText={setCustomGoalInput}
                    keyboardType="numeric"
                    maxLength={2}
                    style={styles.customInput}
                    onSubmitEditing={handleCustomGoalSubmit}
                    autoFocus
                    editable={!isUpdating}
                    error={customValidation.message !== '' && !customValidation.isValid}
                  />
                  {customValidation.message !== '' && (
                    <Text
                      style={[
                        styles.validationMessage,
                        customValidation.isValid
                          ? styles.validationSuccess
                          : styles.validationError,
                      ]}
                    >
                      {customValidation.message}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.customSubmitButton,
                    (!customValidation.isValid || isUpdating) && styles.customSubmitButtonDisabled,
                  ]}
                  onPress={handleCustomGoalSubmit}
                  disabled={!customValidation.isValid || isUpdating}
                >
                  <Icon
                    name="check"
                    size={20}
                    color={
                      customValidation.isValid && !isUpdating
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ThemedCard>
    );
  }
);

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    iconContainerExpanded: {
      backgroundColor: theme.colors.primary + '20',
    },
    textContainer: {
      flex: 1,
    },
    currentGoalContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
      gap: theme.spacing.xs,
    },
    currentGoalBadge: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      fontWeight: '600',
      fontSize: 12,
    },
    customGoalBadge: {
      backgroundColor: theme.colors.secondary + '30',
      color: theme.colors.secondary,
    },
    settingTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: 2,
    },
    settingDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    expandContainer: {
      marginLeft: theme.spacing.sm,
      padding: theme.spacing.xs,
    },
    expandedContainer: {
      paddingBottom: theme.spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outline + '20',
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surfaceVariant + '40',
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    warningText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
      lineHeight: 18,
    },
    goalOption: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
    },
    goalOptionSelected: {
      backgroundColor: theme.colors.primaryContainer + '50',
      borderColor: theme.colors.primary,
    },
    goalOptionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      minHeight: 60,
    },
    goalIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    goalTextContainer: {
      flex: 1,
    },
    goalLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: 2,
    },
    goalLabelSelected: {
      color: theme.colors.primary,
    },
    goalDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    goalDescriptionSelected: {
      color: theme.colors.primary + 'CC',
    },
    selectedIndicator: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.sm,
    },
    recommendedBadge: {
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      marginLeft: theme.spacing.sm,
    },
    recommendedText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimary,
      fontWeight: '600',
      fontSize: 10,
    },
    customInputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceVariant + '30',
      borderRadius: theme.borderRadius.lg,
    },
    inputWrapper: {
      flex: 1,
    },
    customInput: {
      backgroundColor: theme.colors.surface,
    },
    validationMessage: {
      ...theme.typography.bodySmall,
      marginTop: theme.spacing.xs,
      marginLeft: theme.spacing.sm,
    },
    validationError: {
      color: theme.colors.error,
    },
    validationSuccess: {
      color: theme.colors.primary,
    },
    customSubmitButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4, // Align with input field
    },
    customSubmitButtonDisabled: {
      backgroundColor: theme.colors.surfaceVariant,
    },
  });

DailyGoalSettings.displayName = 'DailyGoalSettings';

export default DailyGoalSettings;
