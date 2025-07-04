import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { analyticsService } from '@/services/analyticsService';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { logger } from '@/utils/debugConfig';

interface DailyGoalSettingsProps {
  currentGoal: number;
  onUpdateGoal: (goal: number) => void;
}

const GOAL_OPTIONS = [
  {
    value: 1,
    label: '1 Minnet',
    description: 'Küçük adımlar',
    icon: 'numeric-1-circle',
    colorKey: 'secondary' as const,
  },
  {
    value: 3,
    label: '3 Minnet',
    description: 'Önerilen hedef',
    icon: 'numeric-3-circle',
    colorKey: 'primary' as const,
  },
  {
    value: 5,
    label: '5 Minnet',
    description: 'Motive olduğumda',
    icon: 'numeric-5-circle',
    colorKey: 'tertiary' as const,
  },
];

const MAX_CUSTOM_GOAL = 20;

/**
 * 🎨 ENHANCED DAILY GOAL SETTINGS
 *
 * **DESIGN ENHANCEMENT COMPLETED**:
 * - Beautiful expandable card design with smooth animations
 * - Engaging goal option cards with colors and descriptions
 * - Inline custom goal input with real-time validation
 * - Enhanced visual hierarchy and user experience
 * - Maintains standard SettingsScreen layout consistency
 * - Custom goals up to 20 with beautiful validation feedback
 */
const DailyGoalSettings: React.FC<DailyGoalSettingsProps> = React.memo(
  ({ currentGoal, onUpdateGoal }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const [isExpanded, setIsExpanded] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [customGoalInput, setCustomGoalInput] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);

    // Get current goal display info
    const currentGoalInfo = useMemo(() => {
      const predefinedOption = GOAL_OPTIONS.find((option) => option.value === currentGoal);
      if (predefinedOption) {
        return {
          label: predefinedOption.label,
          description: predefinedOption.description,
          icon: predefinedOption.icon,
          color: theme.colors[predefinedOption.colorKey],
        };
      }
      return {
        label: `${currentGoal} Minnet`,
        description: 'Özel hedef',
        icon: 'target',
        color: theme.colors.tertiary,
      };
    }, [currentGoal, theme.colors]);

    const isCustomGoal = !GOAL_OPTIONS.find((option) => option.value === currentGoal);

    // Custom goal validation
    const customGoalValidation = useMemo(() => {
      if (!customGoalInput) {
        return { isValid: false, message: null };
      }

      const numValue = parseInt(customGoalInput, 10);

      if (isNaN(numValue)) {
        return { isValid: false, message: 'Geçersiz sayı' };
      }

      if (numValue < 1) {
        return { isValid: false, message: 'En az 1 olmalı' };
      }

      if (numValue > MAX_CUSTOM_GOAL) {
        return { isValid: false, message: `En fazla ${MAX_CUSTOM_GOAL} olmalı` };
      }

      if (numValue === currentGoal) {
        return { isValid: false, message: 'Mevcut hedefle aynı' };
      }

      return { isValid: true, message: 'Geçerli hedef ✓' };
    }, [customGoalInput, currentGoal]);

    const handleToggleExpanded = useCallback(() => {
      if (isUpdating) {
        return;
      }

      setIsExpanded(!isExpanded);
      setShowCustomInput(false);
      setCustomGoalInput('');
      hapticFeedback.light();

      analyticsService.logEvent('daily_goal_settings_toggled', {
        expanded: !isExpanded,
        current_goal: currentGoal,
      });
    }, [isExpanded, isUpdating, currentGoal]);

    const handleGoalSelect = useCallback(
      async (newGoal: number) => {
        if (newGoal === currentGoal || isUpdating) {
          return;
        }

        setIsUpdating(true);
        hapticFeedback.medium();

        try {
          onUpdateGoal(newGoal);

          analyticsService.logEvent('daily_goal_updated', {
            old_goal: currentGoal,
            new_goal: newGoal,
            source: 'settings_enhanced_selector',
          });

          // Auto-collapse after selection
          setTimeout(() => {
            setIsExpanded(false);
            setShowCustomInput(false);
            setCustomGoalInput('');
            setIsUpdating(false);
          }, 600);
        } catch (error) {
          logger.error(
            'Error updating goal:',
            error instanceof Error ? error : new Error(String(error))
          );
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
      setCustomGoalInput(showCustomInput ? '' : currentGoal.toString());
      hapticFeedback.light();
    }, [showCustomInput, isUpdating, currentGoal]);

    const handleCustomGoalSubmit = useCallback(() => {
      if (!customGoalValidation.isValid || isUpdating) {
        return;
      }

      const customGoal = parseInt(customGoalInput, 10);
      handleGoalSelect(customGoal);
    }, [customGoalValidation.isValid, customGoalInput, handleGoalSelect, isUpdating]);

    return (
      <View style={styles.container}>
        {/* Main Setting Card */}
        <View style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleToggleExpanded}
            activeOpacity={0.8}
            disabled={isUpdating}
            accessibilityLabel={`Günlük minnettarlık hedefi: ${currentGoalInfo.label}`}
            accessibilityRole="button"
            accessibilityHint="Dokunarak seçenekleri görüntüleyin"
          >
            <View style={styles.settingInfo}>
              <View
                style={[styles.iconContainer, { backgroundColor: currentGoalInfo.color + '20' }]}
              >
                <Icon name={currentGoalInfo.icon} size={22} color={currentGoalInfo.color} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Günlük Minnettarlık Hedefi</Text>
                <View style={styles.currentGoalContainer}>
                  <View
                    style={[styles.goalBadge, { backgroundColor: currentGoalInfo.color + '20' }]}
                  >
                    <Text style={[styles.goalBadgeText, { color: currentGoalInfo.color }]}>
                      {currentGoalInfo.label}
                    </Text>
                  </View>
                  <Text style={styles.settingDescription}>{currentGoalInfo.description}</Text>
                </View>
              </View>
            </View>
            <View style={styles.actionContainer}>
              {isUpdating ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Icon
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={isExpanded ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Expanded Goal Options */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            {/* Preset Goal Options */}
            <View style={styles.optionsGrid}>
              {GOAL_OPTIONS.map((option) => {
                const isSelected = option.value === currentGoal;
                const optionColor = theme.colors[option.colorKey];
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.goalOptionCard,
                      isSelected && styles.goalOptionCardSelected,
                      { borderColor: optionColor + '30' },
                    ]}
                    onPress={() => handleGoalSelect(option.value)}
                    activeOpacity={0.7}
                    disabled={isUpdating}
                    accessibilityLabel={`${option.label}: ${option.description}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[styles.goalOptionHeader, { backgroundColor: optionColor + '10' }]}
                    >
                      <Icon name={option.icon} size={24} color={optionColor} />
                      {isSelected && (
                        <View style={[styles.selectedBadge, { backgroundColor: optionColor }]}>
                          <Icon name="check" size={12} color="white" />
                        </View>
                      )}
                      {option.value === 3 && !isSelected && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Önerilen</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.goalOptionContent}>
                      <Text style={[styles.goalOptionLabel, isSelected && { color: optionColor }]}>
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.goalOptionDescription,
                          isSelected && { color: optionColor + 'AA' },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Goal Section */}
            <View style={styles.customGoalSection}>
              <TouchableOpacity
                style={[
                  styles.customGoalToggle,
                  showCustomInput && styles.customGoalToggleActive,
                  isCustomGoal && !showCustomInput && styles.customGoalToggleSelected,
                ]}
                onPress={handleCustomGoalToggle}
                activeOpacity={0.7}
                disabled={isUpdating}
                accessibilityLabel="Özel hedef belirle"
                accessibilityRole="button"
              >
                <View style={styles.customGoalHeader}>
                  <Icon
                    name="pencil-circle"
                    size={24}
                    color={
                      showCustomInput || isCustomGoal
                        ? theme.colors.tertiary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <View style={styles.customGoalTextContainer}>
                    <Text
                      style={[
                        styles.customGoalTitle,
                        (showCustomInput || isCustomGoal) && { color: theme.colors.tertiary },
                      ]}
                    >
                      Özel Hedef
                    </Text>
                    <Text
                      style={[
                        styles.customGoalSubtitle,
                        (showCustomInput || isCustomGoal) && {
                          color: theme.colors.tertiary + 'AA',
                        },
                      ]}
                    >
                      {isCustomGoal && !showCustomInput
                        ? `Mevcut: ${currentGoal} Minnet`
                        : `1-${MAX_CUSTOM_GOAL} arasında seçin`}
                    </Text>
                  </View>
                  <Icon
                    name={showCustomInput ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={
                      showCustomInput || isCustomGoal
                        ? theme.colors.tertiary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </View>
              </TouchableOpacity>

              {/* Custom Input Field */}
              {showCustomInput && (
                <View style={styles.customInputContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[
                        styles.customInput,
                        customGoalValidation.message ? styles.customInputError : undefined,
                      ]}
                      value={customGoalInput}
                      onChangeText={setCustomGoalInput}
                      placeholder={`1-${MAX_CUSTOM_GOAL} arası bir sayı`}
                      placeholderTextColor={theme.colors.onSurfaceVariant + '80'}
                      keyboardType="number-pad"
                      maxLength={2}
                      onSubmitEditing={handleCustomGoalSubmit}
                      editable={!isUpdating}
                      accessibilityLabel="Özel hedef sayısı"
                      accessibilityHint={`1 ile ${MAX_CUSTOM_GOAL} arasında bir sayı girin`}
                    />
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        customGoalValidation.isValid && styles.submitButtonEnabled,
                        (!customGoalValidation.isValid || isUpdating) &&
                          styles.submitButtonDisabled,
                      ]}
                      onPress={handleCustomGoalSubmit}
                      disabled={!customGoalValidation.isValid || isUpdating}
                      accessibilityLabel="Özel hedefi kaydet"
                      accessibilityRole="button"
                    >
                      <Icon
                        name="check"
                        size={18}
                        color={
                          customGoalValidation.isValid && !isUpdating
                            ? 'white'
                            : theme.colors.onSurfaceVariant
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Validation Message */}
                  {customGoalValidation.message && (
                    <View style={styles.validationContainer}>
                      <Icon
                        name={customGoalValidation.isValid ? 'check-circle' : 'alert-circle'}
                        size={14}
                        color={
                          customGoalValidation.isValid ? theme.colors.primary : theme.colors.error
                        }
                      />
                      <Text
                        style={[
                          styles.validationText,
                          {
                            color: customGoalValidation.isValid
                              ? theme.colors.primary
                              : theme.colors.error,
                          },
                        ]}
                      >
                        {customGoalValidation.message}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Info Footer */}
            <View style={styles.infoFooter}>
              <Icon name="information-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.infoText}>
                Günde en fazla {MAX_CUSTOM_GOAL} minnettarlık girişi yapabilirsiniz. Küçük
                hedeflerle başlayın!
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }
);

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sm,
    } as ViewStyle,

    // Main Setting Card
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.md,
      ...getPrimaryShadow.medium(theme),
    } as ViewStyle,

    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,

    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    } as ViewStyle,

    textContainer: {
      flex: 1,
    } as ViewStyle,

    settingTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
      letterSpacing: 0.1,
    } as TextStyle,

    currentGoalContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,

    goalBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      borderRadius: theme.borderRadius.sm,
    } as ViewStyle,

    goalBadgeText: {
      ...theme.typography.labelMedium,
      fontWeight: '600',
      fontSize: 12,
    } as TextStyle,

    settingDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    } as TextStyle,

    actionContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing.sm,
    } as ViewStyle,

    // Expanded Options
    expandedContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.xs,
      ...getPrimaryShadow.small(theme),
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
    } as ViewStyle,

    optionsGrid: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    } as ViewStyle,

    goalOptionCard: {
      flex: 1,
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      overflow: 'hidden',
    } as ViewStyle,

    goalOptionCardSelected: {
      backgroundColor: theme.colors.primaryContainer + '30',
      borderWidth: 2,
    } as ViewStyle,

    goalOptionHeader: {
      padding: theme.spacing.sm,
      alignItems: 'center',
      position: 'relative',
    } as ViewStyle,

    selectedBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    recommendedBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.xs,
    } as ViewStyle,

    recommendedText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSecondary,
      fontWeight: '600',
      fontSize: 8,
    } as TextStyle,

    goalOptionContent: {
      padding: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
      alignItems: 'center',
    } as ViewStyle,

    goalOptionLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 2,
    } as TextStyle,

    goalOptionDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontSize: 11,
    } as TextStyle,

    // Custom Goal Section
    customGoalSection: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '20',
      margin: theme.spacing.md,
      marginBottom: 0,
      paddingTop: theme.spacing.md,
    } as ViewStyle,

    customGoalToggle: {
      backgroundColor: theme.colors.surfaceVariant + '30',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
    } as ViewStyle,

    customGoalToggleActive: {
      backgroundColor: theme.colors.tertiaryContainer + '40',
      borderColor: theme.colors.tertiary + '50',
    } as ViewStyle,

    customGoalToggleSelected: {
      backgroundColor: theme.colors.tertiaryContainer + '30',
      borderColor: theme.colors.tertiary + '40',
    } as ViewStyle,

    customGoalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    } as ViewStyle,

    customGoalTextContainer: {
      flex: 1,
    } as ViewStyle,

    customGoalTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: 2,
    } as TextStyle,

    customGoalSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
    } as TextStyle,

    // Custom Input
    customInputContainer: {
      padding: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    } as ViewStyle,

    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,

    customInput: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.outline + '40',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
    } as TextStyle,

    customInputValid: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer + '20',
    } as TextStyle,

    customInputError: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.errorContainer + '20',
    } as TextStyle,

    submitButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    submitButtonEnabled: {
      backgroundColor: theme.colors.primary,
      ...getPrimaryShadow.small(theme),
    } as ViewStyle,

    submitButtonDisabled: {
      backgroundColor: theme.colors.surfaceVariant,
      opacity: 0.6,
    } as ViewStyle,

    validationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    } as ViewStyle,

    validationText: {
      ...theme.typography.bodySmall,
      fontSize: 12,
      fontWeight: '500',
    } as TextStyle,

    // Info Footer
    infoFooter: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surfaceVariant + '30',
      margin: theme.spacing.md,
      marginTop: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    } as ViewStyle,

    infoText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
      lineHeight: 18,
      fontSize: 12,
    } as TextStyle,
  });

DailyGoalSettings.displayName = 'DailyGoalSettings';

export default DailyGoalSettings;
