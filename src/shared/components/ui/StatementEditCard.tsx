import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { alpha } from '@/themes/utils';
import {
  formatStatementDate,
  InteractiveStatementCardProps,
  MoodChip,
  ThreeDotsMenu,
  useHapticFeedback,
  useReducedMotion,
  useStatementCardAnimations,
} from './StatementCardBase';
import type { MoodEmoji } from '@/types/mood.types';
import { useTranslation } from 'react-i18next';

// 📝 DAILY ENTRY SPECIFIC PROPS
interface StatementEditCardProps extends InteractiveStatementCardProps {
  variant?: 'primary' | 'secondary' | 'minimal';
  showQuotes?: boolean;
  numberOfLines?: number;
  animateEntrance?: boolean;
  onPress?: () => void;
  edgeToEdge?: boolean;
  moodEmoji?: MoodEmoji | null;
  onChangeMood?: (mood: MoodEmoji | null) => void;
  showSaveHint?: boolean;
}

/**
 * 📝 StatementEditCard - REDESIGNED for Modern Edge-to-Edge UI
 *
 * DESIGN FOCUS:
 * - Full-width edge-to-edge design maximizing screen real estate
 * - Modern iOS-inspired card sections with enhanced visual hierarchy
 * - Improved editing experience with floating input design
 * - Enhanced accessibility and touch targets
 * - Smooth micro-interactions and visual feedback
 * - Better content organization and readability
 */
const StatementEditCardComponent: React.FC<StatementEditCardProps> = ({
  statement,
  date,
  variant: _variant = 'primary',
  showQuotes = true,
  numberOfLines,
  animateEntrance = true,
  onPress,
  style,
  accessibilityLabel,
  hapticFeedback = true,

  // Interactive states
  isEditing = false,
  isSelected: _isSelected = false,
  isLoading = false,
  hasError = false,

  // Action handlers
  onEdit,
  onDelete,
  onCancel,
  onSave,

  // Configuration
  enableInlineEdit = true,
  confirmDelete: _confirmDelete = true,
  maxLength = 500,
  edgeToEdge: _edgeToEdge = true, // Default to true for new design
  moodEmoji,
  onChangeMood: _onChangeMood,
  showSaveHint,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Gradients removed for a cleaner, more subtle card

  const animations = useStatementCardAnimations();
  const { triggerHaptic } = useHapticFeedback(hapticFeedback);
  const { reducedMotion } = useReducedMotion();

  // Local state for editing
  const [localStatement, setLocalStatement] = useState(statement);
  const textInputRef = useRef<TextInput>(null);

  // Cleanup ref on unmount
  useEffect(() => {
    const textInput = textInputRef.current;
    return () => {
      if (textInput) {
        // No explicit cleanup needed for the ref itself
      }
    };
  }, []);

  // Sync local statement with prop changes
  useEffect(() => {
    setLocalStatement(statement);
  }, [statement]);

  // Simple error feedback
  useEffect(() => {
    if (hasError) {
      triggerHaptic('error');
    }
  }, [hasError, triggerHaptic]);

  // Simple entrance feedback
  useEffect(() => {
    if (animateEntrance && !reducedMotion) {
      triggerHaptic('light');
    }
  }, [animateEntrance, triggerHaptic, reducedMotion]);

  // Enhanced date formatting
  const { relativeTime, isRecent } = formatStatementDate(date);

  // Character count and warnings
  const { characterCount, isNearLimit, isOverLimit } = useMemo(() => {
    const count = localStatement.length;
    return {
      characterCount: count,
      isNearLimit: count >= maxLength * 0.85,
      isOverLimit: count > maxLength,
    };
  }, [localStatement, maxLength]);

  // Enhanced action handlers
  const handleSave = useCallback(async () => {
    if (!localStatement.trim() || isOverLimit) {
      triggerHaptic('warning');
      return;
    }

    try {
      triggerHaptic('medium');
      await onSave?.(localStatement.trim());
      triggerHaptic('success');
    } catch {
      triggerHaptic('error');
    }
  }, [localStatement, isOverLimit, onSave, triggerHaptic]);

  const handleCancel = useCallback(() => {
    triggerHaptic('light');
    setLocalStatement(statement);
    onCancel?.();
  }, [statement, onCancel, triggerHaptic]);

  const handleStatementChange = useCallback((text: string) => {
    setLocalStatement(text);
  }, []);

  const handlePress = useCallback(() => {
    if (onPress && !isEditing) {
      triggerHaptic('selection');
      onPress();
    }
  }, [onPress, isEditing, triggerHaptic]);

  const isDirty = useMemo(
    () => localStatement.trim() !== (statement ?? '').trim(),
    [localStatement, statement]
  );

  const handleLongPress = useCallback(async () => {
    try {
      await Share.share({ message: localStatement });
      triggerHaptic('success');
    } catch {
      // ignore
    }
  }, [localStatement, triggerHaptic]);

  // Enhanced placeholder text
  const placeholderText = useMemo(() => t('shared.statement.edit.placeholder'), [t]);

  // Main card content with new edge-to-edge design
  const CardContent = (
    <View style={[styles.edgeToEdgeContainer, style]}>
      <View style={styles.subtleCardBorder} pointerEvents="none" />
      {/* Inner container with left accent bar */}
      <View style={styles.innerGlowContainer} pointerEvents="box-none">
        <View style={styles.leftAccent} pointerEvents="none" />
        {/* MODERN CARD HEADER - Edge-to-edge with enhanced visual hierarchy */}
        <View style={styles.cardHeader} pointerEvents="box-none">
          <View style={styles.headerContent}>
            {/* Statement number or icon */}
            <View style={styles.headerLeft}>
              {showQuotes && !isEditing && (
                <View style={styles.quoteIconContainer}>
                  <Icon name="format-quote-open" size={16} color={theme.colors.primary + '60'} />
                </View>
              )}
              {isEditing && (
                <View style={styles.editingIconContainer}>
                  <Icon name="pencil" size={14} color={theme.colors.primary} />
                </View>
              )}
            </View>

            {/* Actions menu */}
            {(onEdit || onDelete) && (
              <View style={styles.headerRight} pointerEvents="box-none">
                <ThreeDotsMenu
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isVisible={!isEditing}
                  hapticFeedback={hapticFeedback}
                />
              </View>
            )}
          </View>
        </View>

        {/* MODERN CONTENT SECTION - Enhanced padding and layout */}
        <View style={styles.contentSection}>
          {isEditing && enableInlineEdit ? (
            /* ENHANCED EDITING INTERFACE */
            <View style={styles.editingInterface}>
              <View style={styles.inputContainer}>
                <TextInput
                  ref={textInputRef}
                  style={[
                    styles.modernTextInput,
                    hasError && styles.errorInput,
                    isOverLimit && styles.overLimitInput,
                  ]}
                  value={localStatement}
                  onChangeText={handleStatementChange}
                  multiline
                  maxLength={maxLength}
                  placeholder={placeholderText}
                  placeholderTextColor={theme.colors.onSurfaceVariant + '50'}
                  autoFocus
                  selectionColor={theme.colors.primary}
                  textAlignVertical="top"
                  scrollEnabled={true}
                  accessibilityLabel={accessibilityLabel || t('shared.statement.edit.a11yLabel')}
                  accessibilityHint={t('shared.statement.edit.a11yHint')}
                />

                {/* Floating character counter */}
                <View style={styles.floatingCounter}>
                  <Text
                    style={[
                      styles.characterCountText,
                      isNearLimit && !isOverLimit && styles.warningCountText,
                      isOverLimit && styles.errorCountText,
                    ]}
                  >
                    {characterCount}/{maxLength}
                  </Text>
                </View>
              </View>

              {/* Input status indicators */}
              {(isNearLimit || isOverLimit) && (
                <View style={styles.inputStatusContainer}>
                  <Icon
                    name={isOverLimit ? 'alert-circle' : 'alert-outline'}
                    size={16}
                    color={isOverLimit ? theme.colors.error : theme.colors.tertiary}
                  />
                  <Text style={[styles.statusText, isOverLimit && styles.errorStatusText]}>
                    {isOverLimit
                      ? t('shared.statement.nearLimit')
                      : t('shared.statement.edit.remaining', { count: maxLength - characterCount })}
                  </Text>
                </View>
              )}

              {/* Modern action buttons */}
              <View style={styles.modernActionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                  accessibilityLabel={t('common.cancel')}
                >
                  <Icon name="close" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!localStatement.trim() || isOverLimit || !isDirty) &&
                      styles.disabledSaveButton,
                  ]}
                  onPress={handleSave}
                  activeOpacity={0.7}
                  disabled={!localStatement.trim() || isOverLimit || !isDirty}
                  accessibilityLabel={t('shared.statement.save') || 'Save'}
                >
                  <Icon name="check" size={14} color={theme.colors.onPrimary} />
                  <Text style={styles.saveButtonText}>{t('shared.statement.save') || 'Save'}</Text>
                </TouchableOpacity>
              </View>
              {showSaveHint && (
                <Text style={styles.saveHintText}>{t('gratitude.actions.saveHint')}</Text>
              )}
            </View>
          ) : (
            /* ENHANCED READING INTERFACE */
            <View style={styles.readingInterface}>
              <Text style={styles.modernStatementText} numberOfLines={numberOfLines}>
                {localStatement}
              </Text>
            </View>
          )}
        </View>

        {/* Mood editing available only during edit mode */}
        {isEditing && (
          <View style={styles.moodEditRow}>
            <MoodChip moodEmoji={moodEmoji ?? null} onChangeMood={_onChangeMood} />
          </View>
        )}

        {/* Removed social reaction row; only show Mood: in footer */}

        {/* MODERN FOOTER SECTION - Date and metadata */}
        {date && !isEditing && (
          <View style={styles.cardFooter}>
            <View style={styles.footerContent}>
              <View style={styles.dateSection}>
                <Icon
                  name={isRecent ? 'clock-outline' : 'calendar'}
                  size={14}
                  color={theme.colors.onSurfaceVariant + (isRecent ? '90' : '60')}
                />
                <Text style={[styles.dateText, isRecent && styles.recentDateText]}>
                  {relativeTime}
                </Text>
              </View>

              {/* Mood display only (no change) when not editing */}
              {moodEmoji ? (
                <View style={styles.moodInlineContainer}>
                  <Text style={styles.moodInlineLabel}>{t('Mood', 'Mood')}:</Text>
                  <Text style={styles.moodInlineEmoji}>{moodEmoji}</Text>
                </View>
              ) : null}

              {isRecent && (
                <View style={styles.recentBadge}>
                  <Text style={styles.recentBadgeText}>{t('shared.ui.badges.new')}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingIndicator} />
          </View>
        )}
      </View>
    </View>
  );

  // Enhanced TouchableOpacity wrapper
  if (onPress && !isEditing) {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={animations.animatePressIn}
        onPressOut={animations.animatePressOut}
        accessibilityLabel={
          accessibilityLabel || t('shared.statement.a11y.memoryLabel', { text: statement })
        }
        accessibilityRole="button"
        style={styles.touchableContainer}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onLongPress={handleLongPress}
      style={styles.touchableContainer}
    >
      {CardContent}
    </TouchableOpacity>
  );
};

const StatementEditCard = React.memo(StatementEditCardComponent);
StatementEditCard.displayName = 'StatementEditCard';

// 🎨 MODERN EDGE-TO-EDGE STYLES
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // MAIN CONTAINER - Enhanced edge-to-edge design
    touchableContainer: {
      marginBottom: 2, // Better visual separation between cards
    } as ViewStyle,

    edgeToEdgeContainer: {
      // Clean background to sit on top of gradient border
      backgroundColor: theme.colors.surface,
      // Position on top of gradient border
      position: 'relative',
      zIndex: 1,
      // Remove border to let gradient show through
      borderRadius: theme.borderRadius.md, // Reduced from lg
      overflow: 'hidden',
      minHeight: 70, // Reduced from 90
      // Small margin for breathing room
      marginHorizontal: 2,
      marginVertical: 1,
    } as ViewStyle,

    // Inner glow container - creates subtle depth without complexity
    innerGlowContainer: {
      flex: 1,
      // Reduced alpha to avoid bright surfaces
      backgroundColor: alpha(theme.colors.surface, 0.85),
      // No additional borders to avoid overlap
      borderRadius: theme.borderRadius.md - 1, // Reduced
      overflow: 'hidden',
    } as ViewStyle,
    leftAccent: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 3,
      backgroundColor: alpha(theme.colors.primary, 0.9),
    } as ViewStyle,

    subtleCardBorder: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: theme.borderRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: alpha(theme.colors.outline, 0.12),
    } as ViewStyle,

    // MODERN CARD HEADER - Clean and minimal
    cardHeader: {
      // Reduced alpha for less brightness
      backgroundColor: alpha(theme.colors.surface, 0.9),
      paddingHorizontal: theme.spacing.md, // Reduced from lg
      paddingTop: theme.spacing.sm, // Reduced from md
      paddingBottom: theme.spacing.xs, // Reduced from sm
      // Single clean divider
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: alpha(theme.colors.outline, 0.08),
    } as ViewStyle,

    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 24, // Reduced from 32
    } as ViewStyle,

    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,

    headerRight: {
      overflow: 'visible',
      zIndex: 1000,
    } as ViewStyle,

    quoteIconContainer: {
      width: 32, // Reduced from 36
      height: 32, // Reduced from 36
      borderRadius: 16, // Reduced from 18
      // Subtle container with theme color
      backgroundColor: alpha(theme.colors.primaryContainer, 0.5),
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    editingIconContainer: {
      width: 28, // Reduced from 32
      height: 28, // Reduced from 32
      borderRadius: 14, // Reduced from 16
      backgroundColor: alpha(theme.colors.primary, 0.1),
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    // CONTENT SECTION - Clean and spacious
    contentSection: {
      // Consistent background
      backgroundColor: alpha(theme.colors.surface, 0),
      paddingHorizontal: theme.spacing.md, // Reduced from lg
      paddingTop: theme.spacing.sm, // Reduced from md
      paddingBottom: theme.spacing.md, // Reduced from lg
      minHeight: 50, // Reduced from 60
    } as ViewStyle,

    moodEditRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    } as ViewStyle,

    // ENHANCED EDITING INTERFACE
    editingInterface: {
      gap: theme.spacing.md,
    } as ViewStyle,

    inputContainer: {
      position: 'relative',
    } as ViewStyle,

    modernTextInput: {
      fontFamily: 'Lora-Regular',
      fontSize: 16, // Reduced from 18
      lineHeight: 24, // Reduced from 28
      color: theme.colors.onSurface,
      // Clean single border
      backgroundColor: alpha(theme.colors.surface, 0.5),
      borderWidth: 1.5,
      borderColor: alpha(theme.colors.outline, 0.2),
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md, // Reduced from lg
      paddingVertical: theme.spacing.sm, // Reduced from md
      paddingBottom: theme.spacing.md + 8, // Extra space for counter
      minHeight: 100, // Reduced from 120
      maxHeight: 180, // Reduced from 200
      textAlignVertical: 'top',
    } as ViewStyle,

    errorInput: {
      borderColor: theme.colors.error,
      backgroundColor: alpha(theme.colors.error, 0.04),
    } as ViewStyle,

    overLimitInput: {
      borderColor: theme.colors.error,
      borderWidth: 2,
      backgroundColor: alpha(theme.colors.error, 0.08),
    } as ViewStyle,

    floatingCounter: {
      position: 'absolute',
      bottom: theme.spacing.sm,
      right: theme.spacing.md,
      backgroundColor: alpha(theme.colors.surface, 0.8), // Reduced from 0.9
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
    } as ViewStyle,

    characterCountText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.2,
    } as ViewStyle,

    warningCountText: {
      color: theme.colors.tertiary,
      fontWeight: '700',
    } as ViewStyle,

    errorCountText: {
      color: theme.colors.error,
      fontWeight: '800',
    } as ViewStyle,

    inputStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    } as ViewStyle,

    statusText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.tertiary,
    } as ViewStyle,

    errorStatusText: {
      color: theme.colors.error,
      fontWeight: '600',
    } as ViewStyle,

    // MODERN ACTION BUTTONS - More compact design
    modernActionButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm, // Reduced from lg
      paddingTop: theme.spacing.sm, // Reduced from lg
      marginTop: theme.spacing.sm, // Reduced from md
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: alpha(theme.colors.outline, 0.08),
    } as ViewStyle,

    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs, // Reduced from sm
      paddingVertical: theme.spacing.sm, // Reduced from lg
      paddingHorizontal: theme.spacing.md,
      backgroundColor: alpha(theme.colors.surfaceVariant, 0.5),
      borderRadius: theme.borderRadius.sm, // Reduced from md
      borderWidth: 1,
      borderColor: alpha(theme.colors.outline, 0.15),
    } as ViewStyle,

    cancelButtonText: {
      fontSize: 14, // Reduced from 17
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'Lora-SemiBold',
      letterSpacing: 0.3,
    } as ViewStyle,

    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs, // Reduced from sm
      paddingVertical: theme.spacing.sm, // Reduced from lg
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm, // Reduced from md
    } as ViewStyle,

    disabledSaveButton: {
      backgroundColor: alpha(theme.colors.outline, 0.3),
      shadowOpacity: 0,
      elevation: 0,
    } as ViewStyle,

    saveButtonText: {
      fontSize: 14, // Reduced from 17
      fontWeight: '700',
      color: theme.colors.onPrimary,
      fontFamily: 'Lora-SemiBold',
      letterSpacing: 0.3,
    } as ViewStyle,

    // ENHANCED READING INTERFACE
    readingInterface: {
      paddingVertical: theme.spacing.md,
    } as ViewStyle,

    modernStatementText: {
      fontFamily: 'Lora-Medium',
      fontSize: 17, // Reduced from 19
      lineHeight: 26, // Reduced from 30
      color: theme.colors.onSurface,
      fontWeight: '500',
      letterSpacing: 0.2,
      textAlign: 'left',
      marginHorizontal: 2, // Subtle indent for better readability
    } as ViewStyle,

    // MODERN FOOTER SECTION
    cardFooter: {
      // Very subtle background
      backgroundColor: alpha(theme.colors.surfaceVariant, 0.2),
      paddingHorizontal: theme.spacing.md, // Reduced from lg
      paddingVertical: theme.spacing.xs, // Reduced from sm
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: alpha(theme.colors.outline, 0.06),
    } as ViewStyle,

    footerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    } as ViewStyle,

    dateSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    } as ViewStyle,

    dateText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'Lora-Medium',
      letterSpacing: 0.2,
    } as ViewStyle,

    recentDateText: {
      color: theme.colors.primary,
      fontWeight: '700',
    } as ViewStyle,

    recentBadge: {
      backgroundColor: alpha(theme.colors.primary, 0.1),
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.xs,
      borderWidth: 1,
      borderColor: alpha(theme.colors.primary, 0.2),
    } as ViewStyle,

    recentBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.primary,
      letterSpacing: 0.5,
    } as ViewStyle,

    // LOADING OVERLAY
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: alpha(theme.colors.surface, 0.7), // Reduced from 0.8
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    loadingIndicator: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: alpha(theme.colors.primary, 0.3),
    } as ViewStyle,

    // Inline mood next to date label
    moodInlineContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    } as ViewStyle,
    moodInlineLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    } as ViewStyle,
    moodInlineEmoji: {
      fontSize: 14,
    } as ViewStyle,

    saveHintText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: theme.spacing.sm,
    },
  });

export default StatementEditCard;
