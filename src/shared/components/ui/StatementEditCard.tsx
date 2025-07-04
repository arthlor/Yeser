import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { alpha } from '@/themes/utils';
import {
  formatStatementDate,
  InteractiveStatementCardProps,
  ThreeDotsMenu,
  useHapticFeedback,
  useStatementCardAnimations,
} from './StatementCardBase';

// 📝 DAILY ENTRY SPECIFIC PROPS
interface StatementEditCardProps extends InteractiveStatementCardProps {
  variant?: 'primary' | 'secondary' | 'minimal';
  showQuotes?: boolean;
  numberOfLines?: number;
  animateEntrance?: boolean;
  onPress?: () => void;
  edgeToEdge?: boolean;
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
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() => createStyles(theme, isEditing), [theme, isEditing]);

  const animations = useStatementCardAnimations();
  const { triggerHaptic } = useHapticFeedback(hapticFeedback);

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
    if (animateEntrance) {
      triggerHaptic('light');
    }
  }, [animateEntrance, triggerHaptic]);

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

  // Enhanced placeholder text
  const placeholderText = useMemo(() => 'Bugün hangi güzellik için minnettarsın? 🌟', []);

  // Main card content with new edge-to-edge design
  const CardContent = (
    <View style={[styles.edgeToEdgeContainer, style]}>
      {/* MODERN CARD HEADER - Edge-to-edge with enhanced visual hierarchy */}
      <View style={styles.cardHeader}>
        <View style={styles.headerContent}>
          {/* Statement number or icon */}
          <View style={styles.headerLeft}>
            {showQuotes && !isEditing && (
              <View style={styles.quoteIconContainer}>
                <Icon name="format-quote-open" size={20} color={theme.colors.primary + '60'} />
              </View>
            )}
            {isEditing && (
              <View style={styles.editingIconContainer}>
                <Icon name="pencil" size={18} color={theme.colors.primary} />
              </View>
            )}
          </View>

          {/* Three dots menu with enhanced positioning */}
          <View style={styles.headerRight}>
            <ThreeDotsMenu
              onEdit={onEdit}
              onDelete={onDelete}
              isVisible={!isEditing}
              hapticFeedback={hapticFeedback}
            />
          </View>
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
                accessibilityLabel={accessibilityLabel || 'Minnet girişi'}
                accessibilityHint="Bugünkü minnettarlığınızı yazın"
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
                    ? `${characterCount - maxLength} karakter fazla`
                    : `${maxLength - characterCount} karakter kaldı`}
                </Text>
              </View>
            )}

            {/* Modern action buttons */}
            <View style={styles.modernActionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
                accessibilityLabel="İptal"
              >
                <Icon name="close" size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!localStatement.trim() || isOverLimit) && styles.disabledSaveButton,
                ]}
                onPress={handleSave}
                activeOpacity={0.7}
                disabled={!localStatement.trim() || isOverLimit}
                accessibilityLabel="Kaydet"
              >
                <Icon name="check" size={18} color={theme.colors.onPrimary} />
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
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

            {isRecent && (
              <View style={styles.recentBadge}>
                <Text style={styles.recentBadgeText}>YENİ</Text>
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
  );

  // Enhanced TouchableOpacity wrapper
  if (onPress && !isEditing) {
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        onPressIn={animations.animatePressIn}
        onPressOut={animations.animatePressOut}
        accessibilityLabel={accessibilityLabel || `Minnet: ${statement}`}
        accessibilityRole="button"
        style={styles.touchableContainer}
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const StatementEditCard = React.memo(StatementEditCardComponent);
StatementEditCard.displayName = 'StatementEditCard';

// 🎨 MODERN EDGE-TO-EDGE STYLES
const createStyles = (theme: AppTheme, isEditing: boolean) =>
  StyleSheet.create({
    // MAIN CONTAINER - True edge-to-edge design
    touchableContainer: {
      marginBottom: 1, // Minimal separation between cards
    } as ViewStyle,

    edgeToEdgeContainer: {
      backgroundColor: theme.colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
      overflow: 'visible',
      minHeight: 80,
    } as ViewStyle,

    // MODERN CARD HEADER - Enhanced visual hierarchy
    cardHeader: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: isEditing ? StyleSheet.hairlineWidth : 0,
      borderBottomColor: theme.colors.outline + '10',
    } as ViewStyle,

    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 32,
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
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primaryContainer + '30',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    editingIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    // CONTENT SECTION - Enhanced padding and layout
    contentSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      minHeight: 60,
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
      fontSize: 17,
      lineHeight: 26,
      color: theme.colors.onSurface,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingBottom: theme.spacing.lg + 8, // Extra space for counter
      minHeight: 120,
      maxHeight: 200,
      textAlignVertical: 'top',
      // Enhanced shadow
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    } as ViewStyle,

    errorInput: {
      borderColor: theme.colors.error,
      backgroundColor: alpha(theme.colors.error, 0.03),
    } as ViewStyle,

    overLimitInput: {
      borderColor: theme.colors.error,
      borderWidth: 2,
      backgroundColor: alpha(theme.colors.error, 0.06),
    } as ViewStyle,

    floatingCounter: {
      position: 'absolute',
      bottom: theme.spacing.sm,
      right: theme.spacing.md,
      backgroundColor: alpha(theme.colors.surface, 0.9),
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
    } as ViewStyle,

    characterCountText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
    } as ViewStyle,

    warningCountText: {
      color: theme.colors.tertiary,
      fontWeight: '600',
    } as ViewStyle,

    errorCountText: {
      color: theme.colors.error,
      fontWeight: '700',
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

    // MODERN ACTION BUTTONS
    modernActionButtons: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    } as ViewStyle,

    cancelButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '40',
    } as ViewStyle,

    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'Lora-SemiBold',
    } as ViewStyle,

    saveButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      // Enhanced shadow for primary action
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    } as ViewStyle,

    disabledSaveButton: {
      backgroundColor: theme.colors.outline + '40',
      shadowOpacity: 0,
      elevation: 0,
    } as ViewStyle,

    saveButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onPrimary,
      fontFamily: 'Lora-SemiBold',
    } as ViewStyle,

    // ENHANCED READING INTERFACE
    readingInterface: {
      paddingVertical: theme.spacing.sm,
    } as ViewStyle,

    modernStatementText: {
      fontFamily: 'Lora-Medium',
      fontSize: 18,
      lineHeight: 28,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      letterSpacing: 0.3,
      textAlign: 'left',
    } as ViewStyle,

    // MODERN FOOTER SECTION
    cardFooter: {
      backgroundColor: alpha(theme.colors.surfaceVariant, 0.3),
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '10',
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
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'Lora-Medium',
    } as ViewStyle,

    recentDateText: {
      color: theme.colors.primary,
      fontWeight: '600',
    } as ViewStyle,

    recentBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.xs,
    } as ViewStyle,

    recentBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.onPrimary,
      letterSpacing: 0.5,
    } as ViewStyle,

    // LOADING OVERLAY
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: alpha(theme.colors.surface, 0.8),
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    loadingIndicator: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '40',
    } as ViewStyle,
  });

export default StatementEditCard;
