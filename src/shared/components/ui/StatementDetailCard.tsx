import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { AppTheme } from '@/themes/types';
import {
  createSharedStyles,
  formatStatementDate,
  InteractiveStatementCardProps,
  StatementCardWrapper,
  ThreeDotsMenu,
  useHapticFeedback,
  useResponsiveLayout,
  useStatementCardAnimations,
} from './StatementCardBase';

// 📖 ENTRY DETAIL SPECIFIC PROPS
interface StatementDetailCardProps extends InteractiveStatementCardProps {
  index: number;
  totalCount: number;
  variant?: 'detailed' | 'compact' | 'elegant';
  showQuotes?: boolean;
  showSequence?: boolean;
  numberOfLines?: number;
  animateEntrance?: boolean;
  onPress?: () => void;
  edgeToEdge?: boolean; // New prop for edge-to-edge layout
}

/**
 * 📖 StatementDetailCard - Optimized for Entry Detail Usage
 *
 * DESIGN FOCUS:
 * - Enhanced readability with superior typography hierarchy
 * - Context-aware actions for optimal detail viewing
 * - Beautiful card sequence indicators with progress
 * - Improved editing experience with smart interactions
 * - Better visual hierarchy for detailed reading
 * - Edge-to-edge layout adaptability
 * - Perfect for EntryDetailScreen component
 */
const StatementDetailCard: React.FC<StatementDetailCardProps> = React.memo(
  ({
    statement,
    date,
    index: _index,
    variant = 'detailed',
    showQuotes: _showQuotes = true,
    showSequence: _showSequence = true,
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
    confirmDelete = true,
    maxLength = 500,
    edgeToEdge = false,
  }) => {
    const { theme } = useTheme();
    const { showError } = useGlobalError();
    const { showWarning, showSuccess } = useToast();
    const layout = useResponsiveLayout();
    const sharedStyles = createSharedStyles(theme, layout);
    const styles = useMemo(() => createStyles(theme, sharedStyles), [theme, sharedStyles]);

    const animations = useStatementCardAnimations();
    const { triggerHaptic } = useHapticFeedback(hapticFeedback);

    // Local state for editing
    const [localStatement, setLocalStatement] = useState(statement);

    // Sync local statement with prop changes
    useEffect(() => {
      setLocalStatement(statement);
    }, [statement]);

    // **SIMPLIFIED ERROR FEEDBACK**: Remove complex error animation
    // Following minimal animation philosophy - errors handled via toast system
    useEffect(() => {
      if (hasError) {
        // Simple haptic feedback instead of animation
        triggerHaptic('error');
      }
    }, [hasError, triggerHaptic]);

    // **SIMPLIFIED ENTRANCE**: Remove complex entrance animation with stagger
    // Following minimal animation philosophy - cards appear naturally
    useEffect(() => {
      if (animateEntrance) {
        // Simple haptic feedback for card appearance instead of animation
        triggerHaptic('light');
      }
    }, [animateEntrance, triggerHaptic]);

    // Enhanced date formatting
    const { relativeTime, isRecent } = formatStatementDate(date);

    // Action handlers with enhanced haptic feedback
    const handleDelete = () => {
      triggerHaptic('warning');

      if (confirmDelete) {
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

    const handlePress = () => {
      if (onPress && !isEditing) {
        triggerHaptic('selection');
        onPress();
      }
    };

    // Get variant-specific styles with enhanced design
    const getVariantStyles = () => {
      switch (variant) {
        case 'detailed':
          return {
            container: styles.detailedContainer,
            content: styles.detailedContent,
            statement: styles.detailedStatement,
          };
        case 'compact':
          return {
            container: styles.compactContainer,
            content: styles.compactContent,
            statement: styles.compactStatement,
          };
        case 'elegant':
        default:
          return {
            container: styles.elegantContainer,
            content: styles.elegantContent,
            statement: styles.elegantStatement,
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
        containerOverrides.transform = [{ scale: 1.01 }];
      }

      if (hasError) {
        containerOverrides.borderColor = theme.colors.error;
        containerOverrides.borderWidth = 1;
      }

      return containerOverrides;
    };

    const interactiveStyles = getInteractiveStyles();

    // Enhanced sequence indicator - REMOVED per user request
    const renderSequenceIndicator = () => {
      return null;
    };

    // Enhanced editing action buttons - MINIMAL DESIGN
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
            <Icon name="close" size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.editingButtonText, { color: theme.colors.onSurfaceVariant }]}>
              İptal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editingButton, styles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!localStatement.trim()}
          >
            <Icon name="check" size={14} color={theme.colors.onPrimary} />
            <Text style={[styles.editingButtonText, { color: theme.colors.onPrimary }]}>
              Kaydet
            </Text>
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
          {/* Enhanced header with sequence and three dots menu */}
          <View style={styles.headerSection}>
            {renderSequenceIndicator()}

            <View style={styles.headerRight}>
              <ThreeDotsMenu
                onEdit={onEdit}
                onDelete={handleDelete}
                isVisible={!isEditing}
                hapticFeedback={hapticFeedback}
              />
            </View>
          </View>

          {/* Enhanced statement content */}
          <View style={styles.statementContainer}>
            {isEditing && enableInlineEdit ? (
              <>
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
                  textAlignVertical="top"
                />
                <View style={styles.inputFooter}>
                  <Text style={styles.characterCount}>
                    {localStatement.length}/{maxLength}
                  </Text>
                  {localStatement.length > maxLength * 0.9 && (
                    <Text style={styles.warningText}>Yakında limit</Text>
                  )}
                </View>
              </>
            ) : (
              <Text style={variantStyles.statement} numberOfLines={numberOfLines}>
                {localStatement}
              </Text>
            )}
          </View>

          {/* Enhanced meta information */}
          {!isEditing && date && (
            <View style={styles.metaContainer}>
              <View style={styles.metaLeft}>
                {isRecent && (
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>YENİ</Text>
                  </View>
                )}
              </View>
              <View style={styles.metaRight}>
                <Icon
                  name={isRecent ? 'clock-outline' : 'calendar'}
                  size={12}
                  color={theme.colors.onSurfaceVariant + (isRecent ? '90' : '70')}
                />
                <Text style={[styles.dateText, isRecent && styles.recentDate]}>
                  {relativeTime}
                </Text>
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
          onPress={handlePress}
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
  }
);

// 🎨 ENHANCED STYLES FOR DETAIL CARD
const createStyles = (theme: AppTheme, sharedStyles: ReturnType<typeof createSharedStyles>) =>
  StyleSheet.create({
    // Detailed Variant - Enhanced readability and context
    detailedContainer: {
      ...sharedStyles.getContainerStyle('elevated'),
      backgroundColor: theme.colors.surface,
      marginHorizontal: 0, // Edge-to-edge for detail view
      borderWidth: 1,
      borderColor: theme.colors.outline + '30',
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      overflow: 'visible', // CRITICAL: Allow menu to overflow
    } as ViewStyle,

    detailedContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
      position: 'relative',
      overflow: 'visible', // CRITICAL: Allow menu to overflow
    } as ViewStyle,

    detailedStatement: {
      ...sharedStyles.typography.statement.primary,
      fontSize: sharedStyles.layout.isCompact ? 17 : 18,
      fontWeight: '600',
      color: sharedStyles.colors.primary,
      fontStyle: 'italic',
      textAlign: 'left',
      lineHeight: sharedStyles.layout.isCompact ? 24 : 26,
      marginBottom: sharedStyles.spacing.elementGap,
      textShadowColor: theme.colors.shadow + '05',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },

    // Compact Variant - Enhanced efficient space usage
    compactContainer: {
      ...sharedStyles.getContainerStyle('minimal'),
      marginHorizontal: 0,
      borderWidth: 1,
      borderColor: theme.colors.outline + '25',
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
      overflow: 'visible', // CRITICAL: Allow menu to overflow
    } as ViewStyle,

    compactContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
      overflow: 'visible', // CRITICAL: Allow menu to overflow
    } as ViewStyle,

    compactStatement: {
      ...sharedStyles.typography.statement.secondary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
      textAlign: 'left',
    },

    // Elegant Variant - Enhanced refined presentation
    elegantContainer: {
      ...sharedStyles.getContainerStyle('minimal'),
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline + '25',
      borderLeftWidth: sharedStyles.layout.isCompact ? 3 : 4,
      borderLeftColor: theme.colors.primary + '50',
      borderRadius: theme.borderRadius.md,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      overflow: 'visible', // CRITICAL: Allow menu to overflow
    } as ViewStyle,

    elegantContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('lg'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('md'),
      overflow: 'visible', // CRITICAL: Allow menu to overflow
    } as ViewStyle,

    elegantStatement: {
      ...sharedStyles.typography.statement.secondary,
      fontSize: sharedStyles.layout.isCompact ? 16 : 17,
      color: sharedStyles.colors.primary,
      fontStyle: 'italic',
      textAlign: 'left',
      marginBottom: sharedStyles.spacing.elementGap,
    },

    // Enhanced Header Section
    headerSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: sharedStyles.spacing.elementGap,
      minHeight: 48, // Ensure adequate space for menu button
      overflow: 'visible', // Allow menu to overflow
      zIndex: 100, // Ensure proper stacking
    } as ViewStyle,

    headerRight: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      overflow: 'visible', // Allow menu to overflow
      zIndex: 100, // Ensure proper stacking
    } as ViewStyle,

    // Enhanced Sequence Indicator
    sequenceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,

    sequenceBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      ...sharedStyles.shadows.subtle,
    } as ViewStyle,

    sequenceText: {
      fontFamily: 'Lora-Bold',
      fontSize: 11,
      fontWeight: '800',
      color: theme.colors.onPrimaryContainer,
    },

    // Enhanced Statement Container
    statementContainer: {
      flex: 1,
      paddingTop: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    statementInput: {
      color: sharedStyles.colors.primary,
      minHeight: sharedStyles.layout.isCompact ? 100 : 110,
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

    characterCount: {
      ...sharedStyles.typography.metadata.secondary,
      color: sharedStyles.colors.secondary,
    },

    warningText: {
      ...sharedStyles.typography.metadata.secondary,
      color: theme.colors.error,
      fontWeight: '600',
    },

    // Enhanced Meta Container
    metaContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: sharedStyles.spacing.elementGap,
      paddingTop: sharedStyles.spacing.elementGap,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '15',
    } as ViewStyle,

    metaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    metaRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap / 2,
    } as ViewStyle,

    metaText: {
      ...sharedStyles.typography.metadata.primary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
    },

    dateText: {
      ...sharedStyles.typography.metadata.primary,
      color: sharedStyles.colors.secondary,
      fontStyle: 'italic',
    },

    recentDate: {
      color: theme.colors.primary,
      fontWeight: '700',
    },

    recentBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: sharedStyles.spacing.elementGap,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.xs,
      marginLeft: sharedStyles.spacing.elementGap / 2,
    } as ViewStyle,

    recentBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.onPrimary,
      letterSpacing: 0.5,
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

    // Enhanced Editing Actions
    editingActions: {
      flexDirection: 'row',
      gap: sharedStyles.spacing.contentGap,
      marginTop: sharedStyles.spacing.contentGap,
      paddingTop: sharedStyles.spacing.contentGap,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
    } as ViewStyle,

    editingButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
      borderRadius: theme.borderRadius.md,
      minHeight: 40,
      gap: sharedStyles.spacing.elementGap - 2,
      ...sharedStyles.shadows.subtle,
    } as ViewStyle,

    cancelButton: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '40',
    } as ViewStyle,

    saveButton: {
      backgroundColor: theme.colors.primary,
      ...sharedStyles.shadows.elevated,
    } as ViewStyle,

    editingButtonText: {
      fontFamily: 'Lora-SemiBold',
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
  });

StatementDetailCard.displayName = 'StatementDetailCard';

export default StatementDetailCard;
