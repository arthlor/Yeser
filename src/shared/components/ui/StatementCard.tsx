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
import {
  State as GestureState,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { semanticSpacing, semanticTypography, textColors, unifiedShadows } from '@/themes/utils';

// Enhanced props interface with comprehensive interaction support
export interface StatementCardProps {
  statement: string;
  date?: string;
  onPress?: () => void;
  variant?: 'default' | 'highlighted' | 'minimal';
  showQuotes?: boolean;
  animateEntrance?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  
  // ✨ NEW: Interactive States
  isEditing?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  
  // ✨ NEW: Action Handlers
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSave?: (newStatement: string) => Promise<void>;
  
  // ✨ NEW: Interaction Configuration
  enableSwipeActions?: boolean;
  enableLongPress?: boolean;
  enableInlineEdit?: boolean;
  enableQuickActions?: boolean;
  
  // ✨ NEW: Visual Enhancement Options
  showActionOverlay?: boolean;
  actionPosition?: 'top-right' | 'bottom' | 'center';
  confirmDelete?: boolean;
  maxLength?: number;
  
  // ✨ NEW: Accessibility & Feedback
  accessibilityLabel?: string;
  hapticFeedback?: boolean;
}

// Action button configuration type
interface ActionButton {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  destructive?: boolean;
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
  
  // Interaction configuration
  enableSwipeActions = true,
  enableLongPress = true,
  enableInlineEdit = false,
  enableQuickActions = true,
  
  // Visual options
  showActionOverlay = true,
  actionPosition = 'bottom',
  confirmDelete = true,
  maxLength = 500,
  
  // Accessibility
  accessibilityLabel,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  // ✨ NEW: Local state management
  const [localStatement, setLocalStatement] = useState(statement);
  const [showActions, setShowActions] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
  // Enhanced animation values
  const fadeAnim = useRef(new Animated.Value(animateEntrance ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(animateEntrance ? 0.95 : 1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  
  // ✨ NEW: Interactive animation values
  const editingAnim = useRef(new Animated.Value(0)).current;
  const actionAnim = useRef(new Animated.Value(0)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  
  // ✨ NEW: Gesture handler reference
  const panRef = useRef<PanGestureHandler>(null);

  // Sync local statement with prop changes
  useEffect(() => {
    setLocalStatement(statement);
  }, [statement]);

  // ✨ NEW: Editing state animation
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    Animated.timing(editingAnim, {
      toValue: isEditing ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // Required for backgroundColor interpolation
    }).start();
  }, [isEditing, editingAnim]);

  // ✨ NEW: Loading pulse animation
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

  // ✨ NEW: Error shake animation
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

  // Original entrance animation
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

  // ✨ ENHANCED: Premium haptic feedback system
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
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

  // ✨ ENHANCED: Small polished action button configurations
  const getActionButtons = (): ActionButton[] => {
    const buttons: ActionButton[] = [];
    
    if (isEditing) {
      // Editing mode buttons: Save and Cancel
      buttons.push({
        icon: 'check',
        label: 'Kaydet',
        color: theme.colors.success,
        onPress: handleSave,
      });
      
      buttons.push({
        icon: 'close',
        label: 'İptal',
        color: theme.colors.onSurfaceVariant,
        onPress: handleCancel,
      });
    } else {
      // Default mode buttons: Edit and Delete (small, always visible)
      if (onEdit) {
        buttons.push({
          icon: 'pencil-outline', // Outline version for subtlety
          label: 'Düzenle',
          color: theme.colors.primary,
          onPress: handleEdit,
        });
      }
      
      if (onDelete) {
        buttons.push({
          icon: 'delete-outline', // Outline version for subtlety
          label: 'Sil',
          color: theme.colors.error,
          onPress: handleDelete,
          destructive: true,
        });
      }
    }
    
    return buttons;
  };

  // ✨ NEW: Enhanced action handlers
  const handleEdit = () => {
    triggerHaptic('light');
    setShowActions(false);
    onEdit?.();
  };

  const handleDelete = () => {
    triggerHaptic('warning');
    setShowActions(false);
    
    if (confirmDelete) {
      Alert.alert(
        'Şükranı Sil',
        'Bu şükran ifadesini silmek istediğinizden emin misiniz?',
        [
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
        ]
      );
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
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Hata', 'Şükran kaydedilirken bir hata oluştu.');
    }
  };

  const handleCancel = () => {
    triggerHaptic('light');
    setLocalStatement(statement); // Reset to original
    setShowActions(false);
    onCancel?.();
  };

  // ✨ NEW: Long press handler
  const handleLongPress = () => {
    if (!enableLongPress || isEditing) {
      return;
    }
    
    triggerHaptic('medium');
    setShowActions(true);
    
    Animated.spring(actionAnim, {
      toValue: 1,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // ✨ NEW: Swipe gesture handler
  const handlePanGesture = (event: PanGestureHandlerGestureEvent) => {
    if (!enableSwipeActions || isEditing) {
      return;
    }
    
    const { translationX, state } = event.nativeEvent;
    const progress = Math.min(Math.abs(translationX) / 100, 1);
    
    setSwipeProgress(progress);
    swipeAnim.setValue(translationX);
    
    if (state === GestureState.END) {
      if (Math.abs(translationX) > 60) {
        triggerHaptic('medium');
        
        if (translationX > 0 && onEdit) {
          handleEdit();
        } else if (translationX < 0 && onDelete) {
          handleDelete();
        }
      }
      
      // Reset swipe
      Animated.spring(swipeAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      setSwipeProgress(0);
    }
  };

  // Enhanced press animation handlers
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

  // ✨ NEW: Enhanced variant styles with interactive states
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
      containerOverrides.borderColor = theme.colors.outline + '60'; // Changed from primary to neutral
      containerOverrides.borderWidth = 2;
    }
    
    if (isEditing) {
      containerOverrides.backgroundColor = theme.colors.surfaceVariant + '20'; // Changed from primary tint to neutral
      containerOverrides.borderColor = theme.colors.outline + '60'; // Changed from primary to neutral
      containerOverrides.borderWidth = 1;
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

  // ✨ NEW: Render action overlay
  const renderActionOverlay = () => {
    if (!showActions || !enableQuickActions) {
      return null;
    }

    const actionButtons = getActionButtons();
    if (actionButtons.length === 0) {
      return null;
    }

         return (
       <Animated.View
         style={[
           styles.actionOverlay,
           actionPosition === 'center' && styles.actionOverlayCenter,
           {
             opacity: actionAnim,
             transform: [
               {
                 scale: actionAnim.interpolate({
                   inputRange: [0, 1],
                   outputRange: [0.8, 1],
                 }),
               },
             ],
           },
         ]}
       >
        <View style={styles.actionContainer}>
          {actionButtons.map((button, index) => (
            <TouchableOpacity
              key={button.label}
              style={[
                styles.actionButton,
                { backgroundColor: button.color + '15' },
                button.destructive && styles.destructiveAction,
              ]}
              onPress={button.onPress}
              activeOpacity={0.7}
            >
              <Icon
                name={button.icon}
                size={20}
                color={button.color}
              />
              <Text style={[styles.actionLabel, { color: button.color }]}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Overlay background */}
        <TouchableOpacity
          style={styles.overlayBackground}
          onPress={() => {
            setShowActions(false);
            Animated.timing(actionAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start();
          }}
          activeOpacity={1}
        />
      </Animated.View>
    );
  };

  // ✨ NEW: Render swipe indicators
  const renderSwipeIndicators = () => {
    if (!enableSwipeActions || swipeProgress === 0) {
      return null;
    }

    return (
      <>
        {/* Left swipe indicator (Edit) */}
        {onEdit && (
          <Animated.View
            style={[
              styles.swipeIndicator,
              styles.leftSwipeIndicator,
              {
                opacity: swipeProgress,
                transform: [
                  {
                    scale: swipeProgress,
                  },
                ],
              },
            ]}
          >
            <Icon name="pencil" size={24} color={theme.colors.primary} />
          </Animated.View>
        )}
        
        {/* Right swipe indicator (Delete) */}
        {onDelete && (
          <Animated.View
            style={[
              styles.swipeIndicator,
              styles.rightSwipeIndicator,
              {
                opacity: swipeProgress,
                transform: [
                  {
                    scale: swipeProgress,
                  },
                ],
              },
            ]}
          >
            <Icon name="delete" size={24} color={theme.colors.error} />
          </Animated.View>
        )}
      </>
    );
  };

  // ✨ NEW: Enhanced content rendering
  const CardContent = (
    <Animated.View
      style={[
        variantStyles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, Animated.multiply(pressAnim, pulseAnim)) },
            { translateX: swipeAnim },
            { translateX: shakeAnim },
          ],
        },
      ]}
    >
      {/* Swipe indicators */}
      {renderSwipeIndicators()}
      
      <View style={variantStyles.content}>
        {/* Quote Icon */}
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
              placeholder="Şükranınızı yazın..."
              placeholderTextColor={theme.colors.onSurfaceVariant + '60'}
              autoFocus
              selectionColor={theme.colors.primary}
            />
          ) : (
            <Text 
              style={variantStyles.statement}
              numberOfLines={numberOfLines}
            >
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

        {/* Date Footer */}
        {date && !isEditing && (
          <View style={styles.dateContainer}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{date}</Text>
          </View>
        )}

        {/* ✨ ENHANCED: Polished small action buttons - Always visible when enabled */}
        {enableQuickActions && (onEdit || onDelete) && (
          <View style={styles.quickActions}>
            {getActionButtons().map((button, index) => (
              <TouchableOpacity
                key={button.label}
                style={[
                  styles.quickActionButton,
                  { 
                    backgroundColor: button.color + '12',
                    borderColor: button.color + '30',
                  },
                  button.destructive && { backgroundColor: button.color + '08' }, // Lighter for destructive
                ]}
                onPress={button.onPress}
                activeOpacity={0.8}
                accessibilityLabel={button.label}
                accessibilityRole="button"
              >
                <Icon name={button.icon} size={16} color={button.color} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Action overlay */}
      {renderActionOverlay()}
    </Animated.View>
  );
  // Fallback to simple touch handling
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={enableLongPress ? handleLongPress : undefined}
        delayLongPress={500}
        accessibilityLabel={accessibilityLabel || `Şükran: ${statement}`}
        accessibilityRole="button"
      >
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

// ✨ POLISHED STYLES with semantic design system
const createStyles = (theme: AppTheme) => {
  const spacing = semanticSpacing(theme);
  const typography = semanticTypography(theme);
  const colors = textColors(theme);
  const shadows = unifiedShadows(theme);

  return StyleSheet.create({
    // Default Variant - Edge-to-edge with neutral design
    defaultContainer: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '15',
      borderBottomColor: theme.colors.outline + '15',
      overflow: 'hidden',
      ...shadows.subtle,
    } as ViewStyle,
    
    defaultContent: {
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.sectionGap,
      backgroundColor: theme.colors.surface, // Changed from primary tint to neutral
    } as ViewStyle,

    defaultStatement: {
      ...typography.content.headline.small,
      color: colors.primary,
      fontStyle: 'italic',
      fontWeight: '500',
      lineHeight: 32,
      letterSpacing: 0.3,
      textAlign: 'left',
    } as TextStyle,

    // Highlighted Variant - For special emphasis with neutral polish
    highlightedContainer: {
      borderRadius: 0,
      backgroundColor: theme.colors.surfaceVariant + '20', // Changed from primary tint to neutral
      borderWidth: 0,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderTopColor: theme.colors.outline + '40', // Changed from primary to neutral
      borderBottomColor: theme.colors.outline + '40', // Changed from primary to neutral
      overflow: 'hidden',
      ...shadows.card,
    } as ViewStyle,

    highlightedContent: {
      paddingHorizontal: spacing.cardPadding,
      paddingVertical: spacing.sectionGap,
      backgroundColor: theme.colors.surfaceVariant + '12', // Changed from primary tint to neutral
    } as ViewStyle,

    highlightedStatement: {
      ...typography.content.headline.medium,
      color: colors.primary,
      fontStyle: 'italic',
      fontWeight: '600',
      lineHeight: 36,
      letterSpacing: 0.4,
      textAlign: 'center',
    } as TextStyle,

    // Minimal Variant - For lists and compact displays with neutral polish
    minimalContainer: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant + '25',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '25',
      overflow: 'hidden',
      marginVertical: spacing.elementGap,
      ...shadows.subtle,
    } as ViewStyle,

    minimalContent: {
      paddingHorizontal: spacing.contentGap * 1.5,
      paddingVertical: spacing.contentGap,
    } as ViewStyle,

    minimalStatement: {
      ...typography.content.body.large,
      color: colors.primary,
      fontStyle: 'italic',
      fontWeight: '500',
      lineHeight: 24,
      letterSpacing: 0.2,
    } as TextStyle,

    // Quote Icon with enhanced positioning
    quoteIconContainer: {
      position: 'absolute',
      top: spacing.contentGap,
      left: spacing.contentGap,
      zIndex: 1,
    } as ViewStyle,

    quoteIcon: {
      opacity: 0.6,
    },

    // Statement Container with semantic spacing
    statementContainer: {
      marginTop: spacing.sectionGap,
      marginBottom: spacing.sectionGap,
      paddingLeft: spacing.contentGap, // Offset for quote
    } as ViewStyle,

    // Enhanced statement input for inline editing
    statementInput: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: spacing.contentGap,
      paddingVertical: spacing.elementGap,
      backgroundColor: theme.colors.surface,
      minHeight: 80,
      textAlignVertical: 'top',
      ...typography.content.body.large,
    } as TextStyle,

    // Character count with semantic typography
    characterCount: {
      ...typography.navigation.menuItem,
      color: colors.secondary,
      textAlign: 'right',
      marginTop: spacing.elementGap,
    } as TextStyle,

    // Date Footer with enhanced styling
    dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.contentGap,
      paddingLeft: spacing.contentGap,
    } as ViewStyle,

    dateLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '25',
      marginRight: spacing.contentGap,
    } as ViewStyle,

    dateText: {
      ...typography.navigation.menuItem,
      color: theme.colors.primary,
      fontWeight: '600',
      letterSpacing: 0.5,
      fontSize: 11,
    } as TextStyle,

    // Decorative Elements with refined spacing
    decorativeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: spacing.contentGap,
      gap: spacing.elementGap,
    } as ViewStyle,

    decorativeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    } as ViewStyle,

    // Enhanced loading indicator
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

    // Polished action overlay styles
    actionOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
      justifyContent: 'flex-end',
      alignItems: 'center',
    } as ViewStyle,
    
    actionOverlayCenter: {
      justifyContent: 'center',
    } as ViewStyle,

    overlayBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    } as ViewStyle,

    actionContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: spacing.elementGap,
      gap: spacing.elementGap,
      ...shadows.floating,
      marginBottom: spacing.contentGap,
    } as ViewStyle,

    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.contentGap,
      paddingVertical: spacing.elementGap,
      borderRadius: theme.borderRadius.md,
      gap: spacing.elementGap,
    } as ViewStyle,

    destructiveAction: {
      backgroundColor: theme.colors.error + '10',
    } as ViewStyle,

    actionLabel: {
      ...typography.button.primary,
      fontWeight: '600',
    } as TextStyle,

    // Enhanced quick action buttons with premium polish
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.elementGap,
      marginTop: spacing.elementGap,
      paddingHorizontal: spacing.elementGap,
    } as ViewStyle,

    quickActionButton: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
      ...shadows.subtle,
    } as ViewStyle,

    // Premium swipe indicator styles
    swipeIndicator: {
      position: 'absolute',
      top: '50%',
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      ...shadows.floating,
    } as ViewStyle,

    leftSwipeIndicator: {
      left: spacing.sectionGap,
      backgroundColor: theme.colors.primaryContainer + '95',
    } as ViewStyle,

    rightSwipeIndicator: {
      right: spacing.sectionGap,
      backgroundColor: theme.colors.errorContainer + '95',
    } as ViewStyle,
  });
};

export default StatementCard; 