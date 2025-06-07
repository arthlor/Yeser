import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { alpha } from '@/themes/utils';
import {
  createSharedStyles,
  formatStatementDate,
  InteractiveStatementCardProps,
  StatementCardWrapper,
  useHapticFeedback,
  useResponsiveLayout,
  useStatementCardAnimations,
} from './StatementCardBase';

// 📝 DAILY ENTRY SPECIFIC PROPS
interface StatementEditCardProps extends InteractiveStatementCardProps {
  variant?: 'primary' | 'secondary' | 'minimal';
  showQuotes?: boolean;
  numberOfLines?: number;
  animateEntrance?: boolean;
  onPress?: () => void;
  edgeToEdge?: boolean; // New prop for edge-to-edge layout
}

/**
 * 📝 StatementEditCard - Optimized for Daily Entry Usage
 *
 * DESIGN FOCUS:
 * - Enhanced editing capabilities with better UX
 * - Cleaner action button layout with improved accessibility
 * - Better inline editing experience with smart focus
 * - Streamlined interaction workflow with haptic feedback
 * - Optimized for creating and editing gratitude statements
 * - Edge-to-edge layout adaptability
 * - Perfect for DailyEntryScreen component
 */
const StatementEditCardComponent: React.FC<StatementEditCardProps> = ({
  statement,
  date,
  variant = 'primary',
  showQuotes: _showQuotes = true,
  numberOfLines,
  animateEntrance = true,
  onPress,
  style,
  accessibilityLabel,
  hapticFeedback = true,

  // Interactive states
  isEditing = false,
  isSelected = false,
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
  edgeToEdge = false,
}) => {
  const { theme } = useTheme();
  const layout = useResponsiveLayout();

  // OPTIMIZED: Memoize shared styles to prevent recreation on every render
  const sharedStyles = useMemo(() => createSharedStyles(theme, layout), [theme, layout]);
  const styles = useMemo(() => createStyles(theme, sharedStyles), [theme, sharedStyles]);

  const animations = useStatementCardAnimations();
  const { triggerHaptic } = useHapticFeedback(hapticFeedback);

  // Local state for editing
  const [localStatement, setLocalStatement] = useState(statement);
  const textInputRef = useRef<TextInput>(null);

  // Sync local statement with prop changes
  useEffect(() => {
    setLocalStatement(statement);
  }, [statement]);

  // Error animation
  useEffect(() => {
    if (hasError) {
      animations.animateError();
    }
  }, [hasError, animations]);

  // Entrance animation
  useEffect(() => {
    if (animateEntrance) {
      animations.animateEntrance();
    }
  }, [animateEntrance, animations]);

  // Enhanced date formatting
  const { relativeTime, isRecent } = formatStatementDate(date);

  // Character count and warnings - MEMOIZED
  const { characterCount, isNearLimit, isOverLimit } = useMemo(() => {
    const count = localStatement.length;
    return {
      characterCount: count,
      isNearLimit: count >= maxLength * 0.9,
      isOverLimit: count > maxLength,
    };
  }, [localStatement, maxLength]);

  // Enhanced action handlers with haptic feedback - MEMOIZED
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

  // Enhanced placeholder text - MEMOIZED
  const placeholderText = useMemo(
    () =>
      'Bugün hangi güzellik için minnettarsın? Küçük bir anlık mutluluk, sıcak bir kahve, sevdiklerinin gülümsemesi...',
    []
  );

  // Input style with error state - MEMOIZED
  const inputStyle = useMemo(
    () => [styles.textInput, hasError && styles.errorInput, isOverLimit && styles.overLimitInput],
    [styles.textInput, styles.errorInput, styles.overLimitInput, hasError, isOverLimit]
  );

  // Get variant-specific styles with enhanced design
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: styles.primaryContainer,
          content: styles.primaryContent,
          statement: styles.primaryStatement,
        };
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          content: styles.secondaryContent,
          statement: styles.secondaryStatement,
        };
      case 'minimal':
      default:
        return {
          container: styles.minimalContainer,
          content: styles.minimalContent,
          statement: styles.minimalStatement,
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Apply interactive state modifications
  const getInteractiveStyles = () => {
    const containerOverrides: ViewStyle = {};

    if (isSelected) {
      containerOverrides.borderColor = theme.colors.outline + '60';
      containerOverrides.borderWidth = 2;
    }

    if (isEditing) {
      containerOverrides.backgroundColor = theme.colors.surfaceVariant;
      containerOverrides.transform = [{ scale: 1.02 }];
    }

    if (hasError) {
      containerOverrides.borderColor = theme.colors.error;
      containerOverrides.borderWidth = 1;
    }

    return containerOverrides;
  };

  const interactiveStyles = getInteractiveStyles();

  // Enhanced editing action buttons
  const renderEditingActions = () => {
    if (!isEditing) {
      return null;
    }

    return (
      <View style={styles.editingActions}>
        <TouchableOpacity
          style={[styles.compactButton, styles.cancelButton]}
          onPress={handleCancel}
          activeOpacity={0.8}
          accessibilityLabel="İptal"
        >
          <Icon name="close" size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.compactButton,
            styles.saveButton,
            (!localStatement.trim() || isOverLimit) && styles.disabledButton,
          ]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={!localStatement.trim() || isOverLimit}
          accessibilityLabel="Kaydet"
        >
          <Icon name="check" size={18} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      </View>
    );
  };

  const CardContent = (
    <StatementCardWrapper
      animations={animations}
      style={
        style
          ? [variantStyles.container, interactiveStyles, style]
          : [variantStyles.container, interactiveStyles]
      }
      edgeToEdge={edgeToEdge}
    >
      <View style={variantStyles.content}>
        {/* Floating action buttons */}
        {!isEditing && (onEdit || onDelete) && (
          <View style={styles.actionButtons} pointerEvents="box-none">
            {onEdit && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
                activeOpacity={0.6}
                accessibilityLabel="Düzenle"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="pencil-outline" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={onDelete}
                activeOpacity={0.6}
                accessibilityLabel="Sil"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="delete-outline" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Enhanced statement content */}
        <View style={styles.statementContainer}>
          {isEditing && enableInlineEdit ? (
            <>
              <TextInput
                ref={textInputRef}
                style={inputStyle}
                value={localStatement}
                onChangeText={handleStatementChange}
                multiline
                maxLength={maxLength}
                placeholder={placeholderText}
                placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
                autoFocus
                selectionColor={theme.colors.primary}
                textAlignVertical="top"
                scrollEnabled={true}
                accessibilityLabel={accessibilityLabel || 'Minnet girişi'}
                accessibilityHint="Bugünkü minnettarlığınızı yazın"
              />
              <View style={styles.inputFooter}>
                <View style={styles.inputFooterLeft}>
                  {isNearLimit && !isOverLimit && (
                    <View style={styles.warningContainer}>
                      <Icon name="alert-circle-outline" size={16} color={theme.colors.tertiary} />
                      <Text style={styles.warningText}>
                        {maxLength - characterCount} karakter kaldı
                      </Text>
                    </View>
                  )}
                  {isOverLimit && (
                    <View style={styles.errorContainer}>
                      <Icon name="alert-circle" size={16} color={theme.colors.error} />
                      <Text style={styles.errorText}>
                        {characterCount - maxLength} karakter fazla
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.characterCount,
                    isNearLimit && !isOverLimit && styles.warningCount,
                    isOverLimit && styles.errorCount,
                  ]}
                >
                  {characterCount}/{maxLength}
                </Text>
              </View>
            </>
          ) : (
            <Text style={variantStyles.statement} numberOfLines={numberOfLines}>
              {localStatement}
            </Text>
          )}
        </View>

        {/* Enhanced date footer */}
        {date && !isEditing && (
          <View style={styles.dateContainer}>
            <View style={styles.dateLine} />
            <View style={styles.dateSection}>
              <Icon
                name={isRecent ? 'clock-outline' : 'calendar'}
                size={12}
                color={theme.colors.onSurfaceVariant + (isRecent ? '90' : '70')}
              />
              <Text style={[styles.dateText, isRecent && styles.recentDate]}>{relativeTime}</Text>
            </View>
          </View>
        )}

        {/* Enhanced loading indicator */}
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <View style={styles.loadingDot} />
          </View>
        )}

        {/* Enhanced editing actions */}
        {renderEditingActions()}
      </View>
    </StatementCardWrapper>
  );

  // Enhanced TouchableOpacity wrapper
  if (onPress && !isEditing) {
    return (
      <TouchableOpacity
        activeOpacity={0.94}
        onPress={onPress}
        onPressIn={animations.animatePressIn}
        onPressOut={animations.animatePressOut}
        accessibilityLabel={accessibilityLabel || `Minnet: ${statement}`}
        accessibilityRole="button"
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const StatementEditCard = React.memo(StatementEditCardComponent);
StatementEditCard.displayName = 'StatementEditCard';

// 🎨 ENHANCED STYLES FOR EDIT CARD
const createStyles = (theme: AppTheme, sharedStyles: ReturnType<typeof createSharedStyles>) =>
  StyleSheet.create({
    // Primary Variant - Enhanced prominence for main editing
    primaryContainer: {
      ...sharedStyles.getContainerStyle('elevated'),
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
    } as ViewStyle,

    primaryContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
      position: 'relative',
    } as ViewStyle,

    primaryStatement: {
      ...sharedStyles.typography.statement.primary,
      color: sharedStyles.colors.primary,
      fontStyle: 'italic',
      textAlign: 'left',
      marginBottom: 4,
    },

    // Secondary Variant - Enhanced subtle for supporting statements
    secondaryContainer: {
      ...sharedStyles.getContainerStyle('minimal'),
      borderWidth: 1,
      borderColor: theme.colors.outline + '25',
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    } as ViewStyle,

    secondaryContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
    } as ViewStyle,

    secondaryStatement: {
      ...sharedStyles.typography.statement.secondary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
      textAlign: 'left',
    },

    // Minimal Variant - Enhanced clean and simple
    minimalContainer: {
      ...sharedStyles.getContainerStyle('minimal'),
      borderWidth: 1,
      borderColor: theme.colors.outline + '25',
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    } as ViewStyle,

    minimalContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
    } as ViewStyle,

    minimalStatement: {
      ...sharedStyles.typography.statement.tertiary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
      textAlign: 'left',
    },

    // Floating action buttons
    actionButtons: {
      position: 'absolute',
      top: sharedStyles.spacing.contentGap,
      right: sharedStyles.spacing.contentGap,
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap,
      zIndex: 10,
      elevation: 5, // Android elevation for proper layering
    } as ViewStyle,

    actionButton: {
      width: 40, // Slightly larger for better touch
      height: 40,
      borderRadius: theme.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      ...sharedStyles.shadows.subtle,
    } as ViewStyle,

    editButton: {
      backgroundColor: theme.colors.primaryContainer,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    } as ViewStyle,

    deleteButton: {
      backgroundColor: theme.colors.errorContainer,
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    } as ViewStyle,

    // Enhanced Statement Container
    statementContainer: {
      flex: 1,
      paddingTop: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    textInput: {
      color: sharedStyles.colors.primary,
      minHeight: sharedStyles.layout.isCompact ? 90 : 100,
      borderWidth: 1,
      borderColor: theme.colors.outline + '40',
      borderRadius: theme.borderRadius.lg,
      padding: sharedStyles.layout.getAdaptivePadding('md'),
      backgroundColor: theme.colors.surface,
      fontFamily: 'Lora-Regular',
      fontSize: sharedStyles.layout.isCompact ? 16 : 17,
      lineHeight: sharedStyles.layout.isCompact ? 24 : 26,
      ...sharedStyles.shadows.subtle,
    },

    inputFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    inputFooterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    warningText: {
      ...sharedStyles.typography.metadata.secondary,
      color: theme.colors.tertiary,
      fontWeight: '600',
    },

    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    errorText: {
      ...sharedStyles.typography.metadata.secondary,
      color: theme.colors.error,
      fontWeight: '600',
    },

    characterCount: {
      ...sharedStyles.typography.metadata.secondary,
      color: sharedStyles.colors.secondary,
    },

    warningCount: {
      color: theme.colors.tertiary,
      fontWeight: '600',
    },

    errorCount: {
      color: theme.colors.error,
      fontWeight: '600',
    },

    // Enhanced Date Container
    dateContainer: {
      marginTop: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    dateLine: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginBottom: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    dateSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    dateText: {
      ...sharedStyles.typography.metadata.primary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
    },

    recentDate: {
      color: theme.colors.primary,
      fontWeight: '700',
    },

    // Enhanced Loading Indicator
    loadingIndicator: {
      position: 'absolute',
      top: sharedStyles.spacing.contentGap,
      right: sharedStyles.spacing.contentGap,
      zIndex: 2,
    } as ViewStyle,

    loadingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary + '70',
    } as ViewStyle,

    // Compact Editing Actions
    editingActions: {
      flexDirection: 'row',
      gap: sharedStyles.spacing.contentGap,
      marginTop: sharedStyles.spacing.contentGap,
      paddingTop: sharedStyles.spacing.contentGap,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
      justifyContent: 'center',
    } as ViewStyle,

    editingButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
      borderRadius: theme.borderRadius.lg,
      minHeight: 44,
      gap: sharedStyles.spacing.elementGap,
      ...sharedStyles.shadows.subtle,
    } as ViewStyle,

    cancelButton: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 1,
      borderColor: theme.colors.outline + '40',
    } as ViewStyle,

    saveButton: {
      backgroundColor: theme.colors.primary,
      ...sharedStyles.shadows.elevated,
    } as ViewStyle,

    editingButtonText: {
      fontFamily: 'Lora-SemiBold',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    errorInput: {
      borderColor: theme.colors.error,
      borderWidth: 2,
      backgroundColor: alpha(theme.colors.error, 0.05),
    } as ViewStyle,

    overLimitInput: {
      borderColor: theme.colors.error,
      borderWidth: 2,
      backgroundColor: alpha(theme.colors.error, 0.08),
    } as ViewStyle,

    // Compact editing buttons
    compactButton: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      ...sharedStyles.shadows.subtle,
    } as ViewStyle,

    disabledButton: {
      opacity: 0.5,
    } as ViewStyle,
  });

export default StatementEditCard;
