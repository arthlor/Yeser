import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  LayoutAnimation,
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
import { AppTheme } from '@/themes/types';
import { semanticSpacing, semanticTypography, textColors, unifiedShadows } from '@/themes/utils';

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
  animateEntrance = true,
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
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Local state management
  const [localStatement, setLocalStatement] = useState(statement);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(animateEntrance ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(animateEntrance ? 0.95 : 1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const editingAnim = useRef(new Animated.Value(0)).current;
  const contextMenuAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Sync local statement with prop changes
  useEffect(() => {
    setLocalStatement(statement);
  }, [statement]);

  // Editing state animation
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.timing(editingAnim, {
      toValue: isEditing ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isEditing, editingAnim]);

  // Loading pulse animation
  useEffect(() => {
    if (isLoading) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isLoading, pulseAnim]);

  // Error shake animation
  useEffect(() => {
    if (hasError) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [hasError, shakeAnim]);

  // Entrance animation
  useEffect(() => {
    if (animateEntrance) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animateEntrance, fadeAnim, scaleAnim]);

  // Haptic feedback system
  const triggerHaptic = (
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
  ) => {
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
  };

  // Action handlers
  const handleEdit = () => {
    triggerHaptic('light');
    setShowContextMenu(false);
    onEdit?.();
  };

  const handleDelete = () => {
    triggerHaptic('warning');
    setShowContextMenu(false);

    if (confirmDelete) {
      Alert.alert('Minneti Sil', 'Bu minnet ifadesini silmek istediğinizden emin misiniz?', [
        {
          text: 'İptal',
          style: 'cancel',
          onPress: () => triggerHaptic('light'),
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('error');
            onDelete?.();
          },
        },
      ]);
    } else {
      triggerHaptic('error');
      onDelete?.();
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
      Alert.alert('Hata', 'Minnet kaydedilirken bir hata oluştu.');
    }
  };

  const handleCancel = () => {
    triggerHaptic('light');
    setLocalStatement(statement); // Reset to original
    setShowContextMenu(false);
    onCancel?.();
  };

  // Context menu toggle
  const toggleContextMenu = () => {
    triggerHaptic('light');
    const newShowState = !showContextMenu;
    setShowContextMenu(newShowState);

    Animated.spring(contextMenuAnim, {
      toValue: newShowState ? 1 : 0,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // Press animation handlers
  const handlePressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.98,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 300,
      friction: 20,
      useNativeDriver: true,
    }).start();
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

  // Render context menu
  const renderContextMenu = () => {
    if (!showContextMenu || isEditing) {
      return null;
    }

    const hasActions = onEdit || onDelete;
    if (!hasActions) {
      return null;
    }

    return (
      <>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.contextMenuBackdrop}
          onPress={() => setShowContextMenu(false)}
          activeOpacity={1}
        />

        {/* Context Menu */}
        <Animated.View
          style={[
            styles.contextMenu,
            {
              opacity: contextMenuAnim,
              transform: [
                {
                  scale: contextMenuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {onEdit && (
            <TouchableOpacity
              style={styles.contextMenuItem}
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <Icon name="pencil-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.contextMenuText, { color: theme.colors.primary }]}>Düzenle</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={[styles.contextMenuItem, styles.destructiveMenuItem]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Icon name="delete-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.contextMenuText, { color: theme.colors.error }]}>Sil</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </>
    );
  };

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
    <Animated.View
      style={[
        variantStyles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, Animated.multiply(pressAnim, pulseAnim)) },
            { translateX: shakeAnim },
          ],
        },
      ]}
    >
      <View style={variantStyles.content}>
        {/* Header with More Options Button */}
        {!isEditing && (onEdit || onDelete) && (
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity
              style={styles.moreOptionsButton}
              onPress={toggleContextMenu}
              activeOpacity={0.7}
              accessibilityLabel="Daha fazla seçenek"
              accessibilityRole="button"
            >
              <Icon name="dots-horizontal" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
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
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  transform: [
                    {
                      scale: pulseAnim,
                    },
                  ],
                },
              ]}
            />
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

      {/* Context Menu */}
      {renderContextMenu()}
    </Animated.View>
  );

  // Wrap with TouchableOpacity if onPress is provided
  if (onPress && !isEditing) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={accessibilityLabel || `Minnet: ${statement}`}
        accessibilityRole="button"
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

// Enhanced styles with cleaner design system
const createStyles = (theme: AppTheme) => {
  const spacing = semanticSpacing(theme);
  const typography = semanticTypography(theme);
  const colors = textColors(theme);
  const shadows = unifiedShadows(theme);

  return StyleSheet.create({
    // Default Variant - Distinct card with margins
    defaultContainer: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      marginHorizontal: spacing.contentGap,
      marginVertical: spacing.elementGap,
      overflow: 'hidden',
      ...shadows.card,
    } as ViewStyle,

    defaultContent: {
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.sectionGap,
    } as ViewStyle,

    defaultStatement: {
      ...typography.content.headline.small,
      fontFamily: 'Lora-Regular',
      color: colors.primary,
      fontStyle: 'italic',
      fontWeight: '500',
      lineHeight: 32,
      letterSpacing: 0.3,
      textAlign: 'left',
    } as TextStyle,

    // Highlighted Variant - Special emphasis with left border
    highlightedContainer: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant + '20',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      marginHorizontal: spacing.contentGap,
      marginVertical: spacing.elementGap,
      overflow: 'hidden',
      ...shadows.card,
    } as ViewStyle,

    highlightedContent: {
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.sectionGap,
    } as ViewStyle,

    highlightedStatement: {
      ...typography.content.headline.medium,
      fontFamily: 'Lora-Medium',
      color: colors.primary,
      fontStyle: 'italic',
      fontWeight: '600',
      lineHeight: 36,
      letterSpacing: 0.4,
      textAlign: 'center',
    } as TextStyle,

    // Minimal Variant - Compact design
    minimalContainer: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant + '25',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      marginHorizontal: spacing.contentGap,
      marginVertical: spacing.elementGap,
      overflow: 'hidden',
      ...shadows.subtle,
    } as ViewStyle,

    minimalContent: {
      paddingHorizontal: spacing.contentGap * 1.5,
      paddingVertical: spacing.contentGap,
    } as ViewStyle,

    minimalStatement: {
      ...typography.content.body.large,
      fontFamily: 'Lora-Regular',
      color: colors.primary,
      fontStyle: 'italic',
      fontWeight: '400',
      lineHeight: 24,
      letterSpacing: 0.2,
      textAlign: 'left',
    } as TextStyle,

    // Header row with more options button
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.elementGap,
      minHeight: 24,
    } as ViewStyle,

    headerSpacer: {
      flex: 1,
    } as ViewStyle,

    moreOptionsButton: {
      padding: spacing.elementGap,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: 'transparent',
    } as ViewStyle,

    // Quote Icon
    quoteIconContainer: {
      marginBottom: spacing.contentGap,
      alignSelf: 'flex-start',
    } as ViewStyle,

    quoteIcon: {
      opacity: 0.6,
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

    // Date Footer
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.contentGap,
      paddingTop: spacing.contentGap,
    } as ViewStyle,

    dateLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '20',
      marginRight: spacing.contentGap,
    } as ViewStyle,

    dateText: {
      fontFamily: 'Lora-Regular',
      fontSize: 12,
      fontWeight: '500',
      color: colors.secondary,
      fontStyle: 'italic',
      letterSpacing: 0.5,
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

    // Context Menu styles
    contextMenuBackdrop: {
      position: 'absolute',
      top: -1000,
      left: -1000,
      right: -1000,
      bottom: -1000,
      zIndex: 100,
    } as ViewStyle,

    contextMenu: {
      position: 'absolute',
      top: spacing.contentGap + 24,
      right: spacing.contentGap,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: spacing.elementGap,
      minWidth: 120,
      zIndex: 101,
      ...shadows.floating,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '30',
    } as ViewStyle,

    contextMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.contentGap,
      paddingVertical: spacing.elementGap + 2,
      borderRadius: theme.borderRadius.sm,
      gap: spacing.elementGap,
    } as ViewStyle,

    destructiveMenuItem: {
      marginTop: spacing.elementGap / 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
      paddingTop: spacing.elementGap + 2,
    } as ViewStyle,

    contextMenuText: {
      ...typography.button.primary,
      fontWeight: '500',
    } as TextStyle,

    // Editing Action Buttons
    editingActions: {
      flexDirection: 'row',
      gap: spacing.contentGap,
      marginTop: spacing.sectionGap,
      paddingTop: spacing.contentGap,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
    } as ViewStyle,

    editingButton: {
      flex: 1,
      paddingVertical: spacing.contentGap + 2,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    } as ViewStyle,

    cancelButton: {
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '30',
    } as ViewStyle,

    saveButton: {
      backgroundColor: theme.colors.primary,
      ...shadows.subtle,
    } as ViewStyle,

    editingButtonText: {
      ...typography.button.primary,
      fontWeight: '600',
    } as TextStyle,
  });
};

export default StatementCard;
