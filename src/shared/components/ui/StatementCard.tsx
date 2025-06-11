import React, { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { AppTheme } from '@/themes/types';
import {
  alpha,
  getBorderColor,
  getSurfaceColor,
  semanticSpacing,
  semanticTypography,
  textColors,
  unifiedShadows,
} from '@/themes/utils';
import { ThreeDotsMenu } from './StatementCardBase';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

// Simplified props interface focusing on core functionality
export interface StatementCardProps {
  statement: string;
  date?: string;
  onPress?: () => void;
  variant?: 'default' | 'highlighted' | 'minimal';
  showQuotes?: boolean;
  animateEntrance?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;

  // Interactive states
  isEditing?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
  hasError?: boolean;

  // Action handlers
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSave?: (newStatement: string) => Promise<void>;

  // Simplified interaction configuration
  enableInlineEdit?: boolean;
  confirmDelete?: boolean;
  maxLength?: number;

  // Accessibility & Feedback
  accessibilityLabel?: string;
  hapticFeedback?: boolean;
}

const StatementCard: React.FC<StatementCardProps> = ({
  statement,
  date,
  onPress,
  variant = 'default',
  showQuotes = true,
  animateEntrance: _animateEntrance = true,
  numberOfLines,
  style,

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

  // Simplified interaction configuration
  enableInlineEdit = false,
  confirmDelete = true,
  maxLength = 500,

  // Accessibility
  accessibilityLabel,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();
  const { showError } = useGlobalError();
  const { showWarning, showSuccess } = useToast();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Local state management
  const [localStatement, setLocalStatement] = useState(statement);

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all animations
  const animations = useCoordinatedAnimations();

  // Sync local statement with prop changes
  useEffect(() => {
    setLocalStatement(statement);
  }, [statement]);

  // Haptic feedback system
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
      if (!hapticFeedback || Platform.OS === 'web') {
        return;
      }

      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    },
    [hapticFeedback]
  );

  // **COORDINATED EDITING ANIMATION**: Simple editing state animation
  useEffect(() => {
    if (isEditing) {
      // Provide gentle haptic feedback for editing state
      triggerHaptic('light');
      animations.animateLayoutTransition(true, 1, { duration: 300 });
    } else {
      animations.animateLayoutTransition(false, 0, { duration: 300 });
    }
  }, [isEditing, animations, triggerHaptic]);

  // 🚀 TOAST INTEGRATION: Enhanced action handlers with toast confirmation system
  const handleDelete = () => {
    if (confirmDelete) {
      triggerHaptic('warning');
      // 🚀 TOAST INTEGRATION: Use toast warning with action button instead of Alert.alert
      showWarning('Bu minnet ifadesini silmek istediğinizden emin misiniz?', {
        duration: 6000, // Give user time to read and decide
        action: {
          label: 'Sil',
          onPress: () => {
            triggerHaptic('error');
            onDelete?.();
            showSuccess('Minnet ifadesi silindi');
          },
        },
      });
    } else {
      triggerHaptic('error');
      onDelete?.();
      showSuccess('Minnet ifadesi silindi');
    }
  };

  const handleSave = async () => {
    if (!localStatement.trim()) {
      triggerHaptic('warning');
      return;
    }

    triggerHaptic('medium');

    try {
      await onSave?.(localStatement.trim());
      triggerHaptic('success');
    } catch {
      triggerHaptic('error');
      // 🛡️ ERROR PROTECTION: Use global error system instead of Alert
      showError('Minnet kaydedilirken bir hata oluştu.');
    }
  };

  const handleCancel = () => {
    triggerHaptic('light');
    setLocalStatement(statement); // Reset to original
    onCancel?.();
  };

  // Enhanced variant styles with editing state
  const getVariantStyles = () => {
    const baseVariant = (() => {
      switch (variant) {
        case 'highlighted':
          return {
            container: styles.highlightedContainer,
            content: styles.highlightedContent,
            statement: styles.highlightedStatement,
          };
        case 'minimal':
          return {
            container: styles.minimalContainer,
            content: styles.minimalContent,
            statement: styles.minimalStatement,
          };
        default:
          return {
            container: styles.defaultContainer,
            content: styles.defaultContent,
            statement: styles.defaultStatement,
          };
      }
    })();

    // Apply interactive state modifications
    const containerOverrides: ViewStyle = {};

    if (isSelected) {
      containerOverrides.borderColor = theme.colors.outline + '60';
      containerOverrides.borderWidth = 2;
    }

    if (isEditing) {
      containerOverrides.backgroundColor = theme.colors.surfaceVariant;
    }

    if (hasError) {
      containerOverrides.borderColor = theme.colors.error;
      containerOverrides.borderWidth = 1;
    }

    return {
      container: [baseVariant.container, containerOverrides],
      content: baseVariant.content,
      statement: baseVariant.statement,
    };
  };

  const variantStyles = getVariantStyles();

  // Render editing action buttons
  const renderEditingActions = () => {
    if (!isEditing) {
      return null;
    }

    return (
      <View style={styles.editingActions}>
        <TouchableOpacity
          style={[styles.editingButton, styles.cancelButton]}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text style={[styles.editingButtonText, { color: theme.colors.onSurfaceVariant }]}>
            İptal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editingButton, styles.saveButton]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={[styles.editingButtonText, { color: theme.colors.onPrimary }]}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Main card content
  const CardContent = (
    <Animated.View style={[variantStyles.container, style]}>
      <View style={variantStyles.content}>
        {/* Three Dots Menu - Only show if actions are available */}
        {(onEdit || onDelete) && (
          <View style={styles.headerSection}>
            <View style={styles.headerSpacer} />
            <ThreeDotsMenu
              onEdit={onEdit}
              onDelete={handleDelete}
              isVisible={!isEditing}
              hapticFeedback={hapticFeedback}
            />
          </View>
        )}

        {/* Quote Icon - Hidden during editing */}
        {showQuotes && !isEditing && (
          <View style={styles.quoteIconContainer}>
            <Icon
              name="format-quote-open"
              size={24}
              color={theme.colors.primary + '40'}
              style={styles.quoteIcon}
            />
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <Animated.View style={[styles.loadingDot]} />
          </View>
        )}

        {/* Statement Text or Input */}
        <View style={styles.statementContainer}>
          {isEditing && enableInlineEdit ? (
            <TextInput
              style={[variantStyles.statement, styles.statementInput]}
              value={localStatement}
              onChangeText={setLocalStatement}
              multiline
              maxLength={maxLength}
              placeholder="Minnetinizi yazın..."
              placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
              autoFocus
              selectionColor={theme.colors.primary}
            />
          ) : (
            <Text style={variantStyles.statement} numberOfLines={numberOfLines}>
              {localStatement}
            </Text>
          )}

          {/* Character count for editing */}
          {isEditing && enableInlineEdit && (
            <Text style={styles.characterCount}>
              {localStatement.length}/{maxLength}
            </Text>
          )}
        </View>

        {/* Date Footer - Hidden during editing */}
        {date && !isEditing && (
          <View style={styles.dateContainer}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{date}</Text>
          </View>
        )}

        {/* Editing Action Buttons */}
        {renderEditingActions()}
      </View>
    </Animated.View>
  );

  // Wrap with TouchableOpacity if onPress is provided
  if (onPress && !isEditing) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel || `Minnet: ${statement}`}
        accessibilityRole="button"
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

// Enhanced styles with elevated design system
const createStyles = (theme: AppTheme) => {
  const spacing = semanticSpacing(theme);
  const typography = semanticTypography(theme);
  const colors = textColors(theme);
  const shadows = unifiedShadows(theme);

  return StyleSheet.create({
    // Default Variant - Enhanced card with elegant shadows and typography
    defaultContainer: {
      borderRadius: theme.borderRadius.xl,
      backgroundColor: getSurfaceColor(theme, 'elevated'),
      borderWidth: 0,
      marginHorizontal: spacing.contentGap,
      marginVertical: spacing.sectionGap,
      overflow: 'visible',
      ...shadows.card,
      // Enhanced shadow for more depth
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    } as ViewStyle,

    defaultContent: {
      paddingHorizontal: spacing.cardPadding + 4,
      paddingVertical: spacing.sectionGap + 2,
      position: 'relative',
      overflow: 'visible',
    } as ViewStyle,

    defaultStatement: {
      fontFamily: 'Lora-Medium',
      fontSize: 18,
      fontWeight: '500',
      color: colors.primary,
      fontStyle: 'italic',
      lineHeight: 28,
      letterSpacing: 0.4,
      textAlign: 'left',
      marginBottom: 4,
    } as TextStyle,

    // Highlighted Variant - Premium card with gradient-like effect
    highlightedContainer: {
      borderRadius: theme.borderRadius.xl,
      backgroundColor: alpha(theme.colors.primaryContainer, 0.08),
      borderWidth: 0,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      marginHorizontal: spacing.contentGap,
      marginVertical: spacing.sectionGap,
      overflow: 'visible',
      ...shadows.floating,
      // Enhanced shadow for premium feel
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    } as ViewStyle,

    highlightedContent: {
      paddingHorizontal: spacing.cardPadding + 6,
      paddingVertical: spacing.sectionGap + 4,
      position: 'relative',
      overflow: 'visible',
    } as ViewStyle,

    highlightedStatement: {
      fontFamily: 'Lora-SemiBold',
      fontSize: 20,
      fontWeight: '600',
      color: colors.primary,
      fontStyle: 'italic',
      lineHeight: 32,
      letterSpacing: 0.5,
      textAlign: 'center',
      marginBottom: 6,
      // Enhanced text shadow for depth
      textShadowColor: alpha(theme.colors.shadow, 0.1),
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    } as TextStyle,

    // Minimal Variant - Clean, modern design with subtle borders
    minimalContainer: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: getBorderColor(theme, 'light'),
      marginHorizontal: spacing.contentGap,
      marginVertical: spacing.elementGap,
      overflow: 'visible',
      ...shadows.subtle,
      // Refined minimal shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    } as ViewStyle,

    minimalContent: {
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.contentGap + 2,
    } as ViewStyle,

    minimalStatement: {
      fontFamily: 'Lora-Regular',
      fontSize: 16,
      fontWeight: '400',
      color: colors.secondary,
      fontStyle: 'italic',
      lineHeight: 24,
      letterSpacing: 0.2,
      textAlign: 'left',
    } as TextStyle,

    // Enhanced header with more options button
    headerSection: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      marginBottom: spacing.elementGap,
      minHeight: 48, // Ensure adequate space for menu button
      overflow: 'visible', // Allow menu to overflow
      zIndex: 100, // Ensure proper stacking
    } as ViewStyle,

    headerSpacer: {
      flex: 1,
    } as ViewStyle,

    // Quote Icon - Enhanced with better positioning and styling
    quoteIconContainer: {
      position: 'absolute',
      top: -4,
      left: -2,
      zIndex: 1,
    } as ViewStyle,

    quoteIcon: {
      opacity: 0.3,
      transform: [{ scale: 1.2 }],
    },

    // Statement Container
    statementContainer: {
      flex: 1,
    } as ViewStyle,

    // Statement input for inline editing
    statementInput: {
      fontFamily: 'Lora-Regular',
      color: colors.primary,
      textAlignVertical: 'top',
      minHeight: 80,
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.sm,
      padding: spacing.contentGap,
      backgroundColor: theme.colors.surface,
    } as TextStyle,

    // Character count
    characterCount: {
      ...typography.navigation.menuItem,
      color: colors.secondary,
      textAlign: 'right',
      marginTop: spacing.elementGap,
    } as TextStyle,

    // Date Footer - Enhanced with better visual hierarchy
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: spacing.sectionGap,
      paddingTop: spacing.contentGap,
      borderTopWidth: 1,
      borderTopColor: getBorderColor(theme, 'light'),
    } as ViewStyle,

    dateLine: {
      flex: 1,
      height: 1,
      backgroundColor: alpha(theme.colors.outline, 0.2),
      marginRight: spacing.contentGap,
    } as ViewStyle,

    dateText: {
      fontFamily: 'Lora-Medium',
      fontSize: 11,
      fontWeight: '600',
      color: alpha(colors.secondary, 0.8),
      fontStyle: 'italic',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      paddingHorizontal: spacing.elementGap,
      paddingVertical: 2,
      backgroundColor: alpha(theme.colors.surfaceVariant, 0.3),
      borderRadius: theme.borderRadius.xs,
    } as TextStyle,

    // Loading indicator
    loadingIndicator: {
      position: 'absolute',
      top: spacing.contentGap,
      right: spacing.contentGap,
      zIndex: 2,
    } as ViewStyle,

    loadingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.primary + '60',
    } as ViewStyle,

    // Editing Action Buttons - Enhanced with better visual hierarchy
    editingActions: {
      flexDirection: 'row',
      gap: spacing.contentGap,
      marginTop: spacing.sectionGap,
      paddingTop: spacing.sectionGap,
      borderTopWidth: 1,
      borderTopColor: getBorderColor(theme, 'light'),
    } as ViewStyle,

    editingButton: {
      flex: 1,
      paddingVertical: spacing.contentGap + 2,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 42,
      ...shadows.subtle,
    } as ViewStyle,

    cancelButton: {
      backgroundColor: getSurfaceColor(theme, 'container'),
      borderWidth: 1,
      borderColor: getBorderColor(theme, 'medium'),
    } as ViewStyle,

    saveButton: {
      backgroundColor: theme.colors.primary,
      ...shadows.card,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    } as ViewStyle,

    editingButtonText: {
      fontFamily: 'Lora-SemiBold',
      fontSize: 15,
      fontWeight: '600',
      letterSpacing: 0.2,
    } as TextStyle,
  });
};

export default StatementCard;
