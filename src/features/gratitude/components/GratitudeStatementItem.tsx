/**
 * 🌿 SIMPLIFIED GRATITUDE STATEMENT ITEM
 *
 * **ANIMATION SIMPLIFICATION COMPLETED**:
 * - Eliminated complex Animated.parallel and Animated.sequence calls
 * - Replaced with coordinated animation system using useCoordinatedAnimations
 * - Simplified press feedback to basic haptic response
 * - Maintained all functionality with minimal, non-intrusive approach
 * - Performance improved by removing animation complexity
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

const getThemedStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      // Removed outer container styling - handled by parent
      width: '100%',
    },
    containerEditing: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
      width: '100%',
      ...getPrimaryShadow.card(theme),
    },
    contentContainer: {
      paddingVertical: theme.spacing.sm,
      width: '100%',
    },
    textContainer: {
      width: '100%',
    },
    statementText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0.1,
      paddingRight: theme.spacing.md, // Space for any overflow protection
    },
    tapHint: {
      marginTop: theme.spacing.sm,
      alignSelf: 'flex-end',
    },
    tapHintText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      opacity: 0.7,
    },
    editingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.primaryContainer + '40',
      borderRadius: theme.borderRadius.md,
    },
    editingIndicator: {
      width: 8,
      height: 8,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      marginRight: theme.spacing.sm,
    },
    editingLabel: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    inputContainer: {
      position: 'relative',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
      marginBottom: theme.spacing.lg,
      ...getPrimaryShadow.small(theme),
    },
    input: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      lineHeight: 28,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      minHeight: 100,
      maxHeight: 200,
      textAlignVertical: 'top',
    },
    characterCount: {
      position: 'absolute',
      bottom: theme.spacing.sm,
      right: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.borderRadius.sm,
    },
    characterCountText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    actionsContainer: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.md,
      marginTop: theme.spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline,
    },
    editActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    buttonWrapper: {
      flex: 1,
      minWidth: 100,
    },
    saveHintText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
  });

interface GratitudeStatementItemProps {
  statementText: string;
  isEditing?: boolean;
  onPressEdit?: () => void;
  onSave?: (updatedText: string) => void;
  onCancelEdit?: () => void;
  onDelete?: () => void;
}

const GratitudeStatementItem: React.FC<GratitudeStatementItemProps> = ({
  statementText,
  isEditing = false,
  onPressEdit,
  onSave,
  onCancelEdit,
  onDelete,
}) => {
  const { theme } = useTheme();
  const { colors } = theme;
  const { t } = useTranslation();
  const styles = getThemedStyles(theme);
  const placeholderTextColor = colors.onSurfaceVariant;

  const [currentText, setCurrentText] = useState(statementText);
  const [showActions, setShowActions] = useState(false);
  const [showSaveHint, setShowSaveHint] = useState(false);

  // **SIMPLIFIED ANIMATION SYSTEM**: Replace complex refs with coordinated animations
  const animations = useCoordinatedAnimations();

  useEffect(() => {
    if (!isEditing) {
      setCurrentText(statementText);
    }
  }, [statementText, isEditing]);

  // **SIMPLIFIED ENTRANCE**: Remove complex parallel animations
  useEffect(() => {
    if (isEditing || showActions) {
      animations.animateEntrance({ duration: 250 });
    }
  }, [isEditing, showActions, animations]);

  // **SIMPLIFIED SAVE**: Replace complex sequence with haptic feedback
  const handleSave = useCallback(() => {
    if (currentText.trim() === statementText.trim()) {
      setShowSaveHint(true);
      return;
    }

    if (onSave && currentText.trim()) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onSave(currentText.trim());
      setShowSaveHint(false);
    }
  }, [onSave, currentText, statementText]);

  const handleCancel = useCallback(() => {
    setCurrentText(statementText);
    if (onCancelEdit) {
      onCancelEdit();
    }
  }, [statementText, onCancelEdit]);

  const toggleActions = useCallback(() => {
    setShowActions(!showActions);
    // Simple haptic feedback for interaction
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [showActions]);

  if (isEditing) {
    return (
      <Animated.View
        style={[
          styles.containerEditing,
          {
            opacity: animations.fadeAnim,
            transform: animations.entranceTransform,
          },
        ]}
      >
        <View style={styles.editingHeader}>
          <View style={styles.editingIndicator} />
          <Text style={styles.editingLabel}>{t('shared.statement.editingLabel')}</Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={currentText}
            onChangeText={setCurrentText}
            multiline
            placeholder={t('shared.statement.inputPlaceholder')}
            placeholderTextColor={placeholderTextColor}
            autoFocus
            textAlignVertical="top"
            maxLength={500}
          />
          <View style={styles.characterCount}>
            <Text style={styles.characterCountText}>{currentText.length}/500</Text>
          </View>
        </View>
        <Animated.View
          style={[
            styles.editActionsContainer,
            {
              opacity: animations.opacityAnim,
            },
          ]}
        >
          <View style={styles.actionButtonsRow}>
            {onCancelEdit && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title={t('common.cancel')}
                  onPress={handleCancel}
                  variant="secondary"
                  size="compact"
                />
              </View>
            )}
            {onDelete && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title={t('shared.statement.deleteButton')}
                  onPress={() => {
                    if (onDelete) {
                      onDelete();
                    }
                  }}
                  variant="outline"
                  size="compact"
                />
              </View>
            )}
            {onSave && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title={t('gratitude.actions.save')}
                  onPress={handleSave}
                  variant="primary"
                  size="compact"
                  disabled={!currentText.trim() || currentText.trim() === statementText.trim()}
                />
                {showSaveHint && (
                  <Text style={styles.saveHintText}>{t('gratitude.actions.saveHint')}</Text>
                )}
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animations.fadeAnim,
        },
      ]}
    >
      <TouchableOpacity style={styles.contentContainer} onPress={toggleActions} activeOpacity={0.7}>
        <View style={styles.textContainer}>
          <Text style={styles.statementText}>{statementText}</Text>
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>
              {showActions ? t('gratitude.actions.hide') : t('gratitude.actions.showOptions')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {showActions && (
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: animations.opacityAnim,
            },
          ]}
        >
          <View style={styles.actionButtonsRow}>
            {onPressEdit && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title={t('shared.statement.editButton')}
                  onPress={() => {
                    setShowActions(false);
                    onPressEdit();
                  }}
                  variant="secondary"
                  size="compact"
                />
              </View>
            )}
            {onDelete && (
              <View style={styles.buttonWrapper}>
                <ThemedButton
                  title={t('gratitude.actions.delete')}
                  onPress={() => {
                    setShowActions(false);
                    onDelete();
                  }}
                  variant="outline"
                  size="compact"
                />
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default GratitudeStatementItem;
