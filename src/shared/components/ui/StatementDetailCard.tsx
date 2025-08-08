import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  useReducedMotion,
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
    const { reducedMotion } = useReducedMotion();

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
      if (animateEntrance && !reducedMotion) {
        // Simple haptic feedback for card appearance instead of animation
        triggerHaptic('light');
      }
    }, [animateEntrance, triggerHaptic, reducedMotion]);

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

    // Enhanced sequence indicator - BEAUTIFUL modern design
    const renderSequenceIndicator = () => {
      if (!_showSequence) {
        return null;
      }

      const sequenceNumber = (_index ?? 0) + 1;

      return (
        <View style={styles.sequenceContainer}>
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceText}>{sequenceNumber}</Text>
          </View>
          <View style={styles.sequenceConnector} />
        </View>
      );
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
            disabled={!localStatement.trim() || !isDirty}
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
        {/* Built-in subtle gradient border for elegance */}
        <LinearGradient
          colors={[
            theme.colors.primary,
            theme.colors.secondary || theme.colors.primaryContainer,
            theme.colors.tertiary || theme.colors.primary,
            theme.colors.primary,
          ]}
          style={styles.gradientBorder}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
        />
        <View style={variantStyles.content}>
          {/* 🎯 ENHANCED CARD HEADER: Better visual hierarchy with proper overflow handling */}
          <View style={styles.cardHeader}>
            {/* Left side: Sequence indicator (if enabled) */}
            <View style={styles.headerLeft}>{renderSequenceIndicator()}</View>

            {/* Right side: Three dots menu - Made more prominent */}
            <View style={styles.headerRight}>
              <ThreeDotsMenu
                onEdit={onEdit}
                onDelete={handleDelete}
                isVisible={!isEditing}
                hapticFeedback={hapticFeedback}
              />
            </View>
          </View>

          {/* 🎨 ENHANCED STATEMENT CONTENT: Better spacing and typography with quotes */}
          <View style={styles.statementSection}>
            {isEditing && enableInlineEdit ? (
              <View style={styles.editingContainer}>
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
              </View>
            ) : (
              <View style={styles.readingContainer}>
                {_showQuotes && (
                  <View style={styles.quoteContainer}>
                    <Icon
                      name="format-quote-open"
                      size={18}
                      color={theme.colors.primary + '60'}
                      style={styles.openQuote}
                    />
                    <Text
                      style={[variantStyles.statement, styles.quotedText]}
                      numberOfLines={numberOfLines}
                    >
                      {localStatement}
                    </Text>
                    <Icon
                      name="format-quote-close"
                      size={18}
                      color={theme.colors.primary + '60'}
                      style={styles.closeQuote}
                    />
                  </View>
                )}
                {!_showQuotes && (
                  <Text
                    style={[variantStyles.statement, styles.plainText]}
                    numberOfLines={numberOfLines}
                  >
                    {localStatement}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* 🕒 COMPACT META INFORMATION: Clean and minimal presentation */}
          {!isEditing && date && (
            <View style={styles.metaSection}>
              <View style={styles.metaContent}>
                {isRecent && (
                  <View style={styles.recentBadge}>
                    <Text style={styles.recentBadgeText}>YENİ</Text>
                  </View>
                )}
                <View style={styles.dateContainer}>
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
            </View>
          )}

          {/* 🔄 ENHANCED LOADING INDICATOR */}
          {isLoading && (
            <View style={styles.loadingSection}>
              <View style={styles.loadingDot} />
            </View>
          )}

          {/* ⚡ ENHANCED EDITING ACTIONS */}
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
          onLongPress={handleLongPress}
          onPressIn={animations.animatePressIn}
          onPressOut={animations.animatePressOut}
          accessibilityLabel={accessibilityLabel || `Minnet: ${statement}`}
          accessibilityRole="button"
        >
          {CardContent}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity activeOpacity={1} onLongPress={handleLongPress} disabled={isEditing}>
        {CardContent}
      </TouchableOpacity>
    );
  }
);

// 🎨 ENHANCED STYLES FOR DETAIL CARD
const createStyles = (theme: AppTheme, sharedStyles: ReturnType<typeof createSharedStyles>) =>
  StyleSheet.create({
    gradientBorder: {
      position: 'absolute',
      top: -1,
      left: -1,
      right: -1,
      bottom: -1,
      borderRadius: theme.borderRadius.md + 1,
      opacity: 0.32,
    } as ViewStyle,
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

    // Elegant Variant - COMPACT and minimalist with polished aesthetics
    elegantContainer: {
      ...sharedStyles.getContainerStyle('minimal'),
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: 0,
      marginBottom: theme.spacing.sm,
      overflow: 'visible', // CRITICAL: Allow menu to overflow
      // Subtle shadow for depth
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    } as ViewStyle,

    elegantContent: {
      paddingHorizontal: sharedStyles.layout.getAdaptivePadding('md'),
      paddingVertical: sharedStyles.layout.getAdaptivePadding('sm'),
      overflow: 'visible', // CRITICAL: Allow menu to overflow
      position: 'relative',
    } as ViewStyle,

    elegantStatement: {
      ...sharedStyles.typography.statement.primary,
      fontSize: sharedStyles.layout.isCompact ? 17 : 18,
      fontWeight: '500',
      color: theme.colors.onSurface,
      fontStyle: 'normal',
      textAlign: 'left',
      lineHeight: sharedStyles.layout.isCompact ? 26 : 28,
      marginBottom: sharedStyles.spacing.elementGap,
      letterSpacing: 0.3,
      fontFamily: 'Lora-Medium',
      // Enhanced text attractiveness
      textShadowColor: theme.colors.shadow + '08',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    // Old header styles removed - using enhanced cardHeader below

    // Enhanced Sequence Indicator - COMPACT and minimalist design
    sequenceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    sequenceBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      // Minimal shadow
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    } as ViewStyle,

    sequenceText: {
      fontFamily: 'Lora-SemiBold',
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onPrimary,
      letterSpacing: 0.2,
    },

    // 💭 COMPACT STATEMENT SECTION: Clean content area
    statementSection: {
      flex: 1,
      marginBottom: 0,
    } as ViewStyle,

    // 📝 COMPACT EDITING: Clean input design
    editingContainer: {
      flex: 1,
    } as ViewStyle,

    statementInput: {
      borderWidth: 1,
      borderColor: theme.colors.outline + '40',
      borderRadius: theme.borderRadius.sm,
      padding: sharedStyles.spacing.elementGap,
      minHeight: 60,
      maxHeight: 120,
      backgroundColor: theme.colors.surface,
      // Simple shadow
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    } as ViewStyle,

    characterCounter: {
      alignSelf: 'flex-end',
      marginTop: sharedStyles.spacing.elementGap / 2,
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      opacity: 0.6,
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

    // Old meta container styles removed - using enhanced metaSection below

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

    // Old loading indicator removed - using enhanced loadingSection below

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

    // 🎯 ENHANCED CARD HEADER: Better visual hierarchy with proper overflow handling
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: sharedStyles.spacing.elementGap,
      minHeight: 44, // Adequate space for menu button
      overflow: 'visible', // CRITICAL: Allow menu to overflow
      zIndex: 100,
      position: 'relative',
      paddingRight: 4, // Extra padding for menu button
    } as ViewStyle,

    headerLeft: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      flex: 1,
      overflow: 'visible',
      zIndex: 100,
    } as ViewStyle,

    headerRight: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      overflow: 'visible', // CRITICAL: Allow menu to overflow
      zIndex: 100,
      position: 'relative',
      minWidth: 44, // Ensure adequate space
      justifyContent: 'flex-end',
    } as ViewStyle,

    // 🎨 ENHANCED STATEMENT CONTENT: Better spacing and typography
    readingContainer: {
      flex: 1,
      paddingTop: sharedStyles.spacing.elementGap,
    } as ViewStyle,

    // 🕒 COMPACT META INFORMATION: Clean and minimal presentation
    metaSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: sharedStyles.spacing.elementGap,
      paddingTop: sharedStyles.spacing.elementGap / 2,
      paddingHorizontal: 0,
      backgroundColor: theme.colors.surface + '00', // Transparent using theme
      borderRadius: 0,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '15',
    } as ViewStyle,

    metaContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap / 2,
    } as ViewStyle,

    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sharedStyles.spacing.elementGap,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: sharedStyles.spacing.contentGap,
      paddingVertical: sharedStyles.spacing.elementGap / 2,
      borderRadius: theme.borderRadius.xs,
      borderWidth: 1,
      borderColor: theme.colors.outline + '10',
    } as ViewStyle,

    // 🔄 ENHANCED LOADING INDICATOR
    loadingSection: {
      position: 'absolute',
      top: sharedStyles.spacing.contentGap,
      right: sharedStyles.spacing.contentGap,
      zIndex: 2,
    } as ViewStyle,

    // Enhanced quote container styles - COMPACT and clean design
    quoteContainer: {
      position: 'relative',
      paddingHorizontal: sharedStyles.spacing.elementGap,
      paddingVertical: sharedStyles.spacing.elementGap / 2,
      backgroundColor: theme.colors.surface + '00', // Transparent using theme
      borderRadius: 0,
      marginVertical: 0,
    } as ViewStyle,

    openQuote: {
      position: 'absolute',
      top: -2,
      left: -2,
      zIndex: 1,
      opacity: 0.5,
    } as ViewStyle,

    closeQuote: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      zIndex: 1,
      opacity: 0.5,
    } as ViewStyle,

    // Enhanced text styles for better attractiveness
    quotedText: {
      fontStyle: 'italic',
      color: theme.colors.onSurface,
      fontSize: sharedStyles.layout.isCompact ? 17 : 18,
      fontWeight: '500',
      lineHeight: sharedStyles.layout.isCompact ? 26 : 28,
      letterSpacing: 0.4,
      fontFamily: 'Lora-MediumItalic',
      textAlign: 'left',
      paddingHorizontal: 12,
    },

    plainText: {
      color: theme.colors.onSurface,
      fontSize: sharedStyles.layout.isCompact ? 17 : 18,
      fontWeight: '500',
      lineHeight: sharedStyles.layout.isCompact ? 26 : 28,
      letterSpacing: 0.3,
      fontFamily: 'Lora-Medium',
      textAlign: 'left',
    },

    // New sequence connector style
    sequenceConnector: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.outline + '20',
    } as ViewStyle,
  });

StatementDetailCard.displayName = 'StatementDetailCard';

export default StatementDetailCard;
