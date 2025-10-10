import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import {
  alpha,
  getBorderColor,
  getSurfaceColor,
  semanticSpacing,
  textColors,
} from '@/themes/utils';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';
import i18n from '@/i18n';
import type { MoodEmoji } from '@/types/mood.types';
import { MOOD_EMOJIS } from '@/types/mood.types';
import { moodStorageService } from '@/services/moodStorageService';

// 🎯 SHARED TYPES AND INTERFACES
export interface BaseStatementCardProps {
  statement: string;
  date?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
  hapticFeedback?: boolean;
}

export interface InteractiveStatementCardProps extends BaseStatementCardProps {
  isEditing?: boolean;
  isSelected?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSave?: (newStatement: string) => Promise<void>;
  enableInlineEdit?: boolean;
  confirmDelete?: boolean;
  maxLength?: number;
}

// 🎯 ROBUST THREE DOTS MENU COMPONENT - SIMPLIFIED AND RELIABLE
interface ThreeDotsMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
  isVisible?: boolean;
  hapticFeedback?: boolean;
}

export const ThreeDotsMenu: React.FC<ThreeDotsMenuProps> = React.memo(
  ({ onEdit, onDelete, isVisible = true, hapticFeedback = true }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { triggerHaptic } = useHapticFeedback(hapticFeedback);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuAnim = useRef(new Animated.Value(0)).current;
    const buttonRef = useRef<View>(null);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({
      top: 0,
      left: 0,
    });
    const styles = useMemo(() => createRobustMenuStyles(theme), [theme]);

    // 🛡️ OPTIMIZED STATE MANAGEMENT - Prevent render-time side effects
    const closeMenu = useCallback(() => {
      Animated.spring(menuAnim, {
        toValue: 0,
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }).start();
      // Set state immediately to prevent timing issues
      setIsMenuOpen(false);
    }, [menuAnim]);

    const openMenu = useCallback(() => {
      // Measure button position to anchor menu in a portal Modal
      const windowWidth = Dimensions.get('window').width;
      buttonRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
        // Position the menu below the button, right-aligned with small padding
        const menuWidth = 140;
        const left = Math.min(Math.max(8, x + width - menuWidth), windowWidth - menuWidth - 8);
        const top = y + height + 6;
        setMenuPosition({ top, left });
        setIsMenuOpen(true);
        Animated.spring(menuAnim, {
          toValue: 1,
          tension: 300,
          friction: 30,
          useNativeDriver: true,
        }).start();
      });
    }, [menuAnim]);

    // 🔄 SIMPLIFIED TOGGLE - Remove try/catch that may cause side effects
    const toggleMenu = useCallback(() => {
      triggerHaptic('light');
      if (isMenuOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    }, [isMenuOpen, closeMenu, openMenu, triggerHaptic]);

    // 🛡️ ENHANCED VISIBILITY CONTROL - Fix shadow/ghost menu issue
    useEffect(() => {
      if (!isVisible) {
        // Immediately reset animation and state when becoming invisible
        setIsMenuOpen(false);
        menuAnim.setValue(0);
      }
    }, [isVisible, menuAnim]);

    // Enhanced action handlers with simplified error handling
    const handleEdit = useCallback(() => {
      triggerHaptic('selection');
      closeMenu();
      // Use setTimeout to defer execution and avoid scheduling conflicts
      setTimeout(() => onEdit?.(), 0);
    }, [onEdit, triggerHaptic, closeMenu]);

    const handleDelete = useCallback(() => {
      triggerHaptic('warning');
      closeMenu();
      // Use setTimeout to defer execution and avoid scheduling conflicts
      setTimeout(() => onDelete?.(), 0);
    }, [onDelete, triggerHaptic, closeMenu]);

    // 🛡️ SIMPLIFIED BACKDROP DISMISSAL
    const handleBackdropPress = useCallback(() => {
      triggerHaptic('light');
      closeMenu();
    }, [triggerHaptic, closeMenu]);

    // Force cleanup on visibility change to prevent shadow menus
    if (!isVisible) {
      // Ensure clean state when not visible
      if (isMenuOpen) {
        setIsMenuOpen(false);
        menuAnim.setValue(0);
      }
      return null;
    }

    return (
      <View style={styles.container} pointerEvents="box-none">
        {/* Menu button (anchor) */}
        <TouchableOpacity
          ref={buttonRef}
          style={styles.dotsButton}
          onPress={toggleMenu}
          activeOpacity={0.7}
          accessibilityLabel={t('shared.statement.a11y.tapToView')}
          accessibilityRole="button"
          accessibilityHint={t('shared.ui.accessibility.tapToEditDelete')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="dots-vertical" size={20} color={theme.colors.onSurfaceVariant + 'CC'} />
        </TouchableOpacity>

        {/* Portal menu via Modal to avoid clipping by ScrollView */}
        <Modal visible={isMenuOpen} transparent animationType="none" onRequestClose={closeMenu}>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={handleBackdropPress}
            activeOpacity={1}
            accessibilityLabel={t('common.cancel')}
            accessibilityRole="button"
          />
          {/* Positioned menu */}
          <Animated.View
            style={[
              styles.modalMenu,
              {
                top: menuPosition.top,
                left: menuPosition.left,
                opacity: menuAnim,
                transform: [
                  {
                    scale: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                  {
                    translateY: menuAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.menuItemsContainer}>
              {onEdit && (
                <TouchableOpacity
                  style={styles.iconMenuItem}
                  onPress={handleEdit}
                  activeOpacity={0.7}
                  accessibilityLabel={i18n.t('shared.statement.edit.a11yLabel')}
                  accessibilityRole="button"
                  accessibilityHint={i18n.t('shared.statement.edit.a11yHint')}
                >
                  <Icon name="pencil" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.iconMenuItem}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                  accessibilityLabel={i18n.t('shared.statement.confirmDelete')}
                  accessibilityRole="button"
                  accessibilityHint={i18n.t('shared.statement.confirmDelete')}
                >
                  <Icon name="trash-can" size={16} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Modal>
      </View>
    );
  }
);

ThreeDotsMenu.displayName = 'ThreeDotsMenu';

// 😊 MOOD CHIP WITH INLINE PICKER
interface MoodChipProps {
  moodEmoji: MoodEmoji | null | undefined;
  onChangeMood?: (mood: MoodEmoji | null) => void;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

export const MoodChip: React.FC<MoodChipProps> = React.memo(
  ({ moodEmoji, onChangeMood, disabled = false, hapticFeedback = true }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const { triggerHaptic } = useHapticFeedback(hapticFeedback);
    const styles = useMemo(() => createMoodChipStyles(theme), [theme]);

    const [isOpen, setIsOpen] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const buttonRef = useRef<View>(null);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const [recents, setRecents] = useState<MoodEmoji[]>([]);

    const close = useCallback(() => {
      Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
        setIsOpen(false);
      });
    }, [anim]);

    const open = useCallback(() => {
      if (disabled) {
        return;
      }
      buttonRef.current?.measureInWindow((x, y, width, height) => {
        const menuWidth = 180;
        const windowWidth = Dimensions.get('window').width;
        const left = Math.min(Math.max(8, x + width - menuWidth), windowWidth - menuWidth - 8);
        const top = y + height + 6;
        setPosition({ top, left });
        setIsOpen(true);
        Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      });
    }, [anim, disabled]);

    const toggle = useCallback(() => {
      triggerHaptic('selection');
      if (isOpen) {
        close();
      } else {
        open();
      }
    }, [isOpen, open, close, triggerHaptic]);

    const handleSelect = useCallback(
      (emoji: MoodEmoji) => {
        triggerHaptic('medium');
        onChangeMood?.(emoji);
        // persist recent
        moodStorageService
          .addRecent(emoji)
          .then(() => {
            moodStorageService
              .getRecents()
              .then(setRecents)
              .catch(() => {});
          })
          .catch(() => {});
        close();
      },
      [onChangeMood, triggerHaptic, close]
    );

    const handleClear = useCallback(() => {
      triggerHaptic('light');
      onChangeMood?.(null);
      close();
    }, [onChangeMood, triggerHaptic, close]);

    // Load recents on mount/open
    useEffect(() => {
      let mounted = true;
      const load = async () => {
        const r = await moodStorageService.getRecents();
        if (mounted) {
          setRecents(r);
        }
      };
      load();
      return () => {
        mounted = false;
      };
    }, []);

    // Subtle pulse when mood set
    useEffect(() => {
      if (!moodEmoji) {
        return;
      }
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }, [moodEmoji, pulse]);

    return (
      <View style={styles.container} pointerEvents="box-none">
        <Animated.View
          style={{
            transform: [
              {
                scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }),
              },
            ],
          }}
        >
          <TouchableOpacity
            ref={buttonRef}
            style={[styles.chipButton, disabled && styles.chipDisabled]}
            activeOpacity={0.8}
            onPress={toggle}
            onLongPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel={
              moodEmoji
                ? t('shared.statement.a11y.tapToViewOrExpand')
                : t('shared.statement.a11y.tapToView')
            }
            accessibilityHint={t('shared.ui.accessibility.tapToEditDelete')}
          >
            <Text style={styles.chipText}>{moodEmoji ?? '•'}</Text>
          </TouchableOpacity>
        </Animated.View>

        <Modal visible={isOpen} transparent animationType="none" onRequestClose={close}>
          <TouchableOpacity style={styles.backdrop} onPress={close} activeOpacity={1} />
          <Animated.View
            style={[
              styles.picker,
              {
                top: position.top,
                left: position.left,
                opacity: anim,
                transform: [
                  {
                    scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
                  },
                  {
                    translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.row}>
              {[...new Set([...recents, ...MOOD_EMOJIS])].slice(0, 8).map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => handleSelect(emoji)}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t('shared.mood.setMood.a11y', { emoji })}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.emojiButton, styles.clearButton]}
                onPress={handleClear}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Icon name="close" size={16} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      </View>
    );
  }
);

MoodChip.displayName = 'MoodChip';

// 🎨 ROBUST MENU STYLES - SIMPLIFIED AND RELIABLE
const createRobustMenuStyles = (theme: AppTheme) => {
  const spacing = semanticSpacing(theme);

  return StyleSheet.create({
    container: {
      position: 'relative',
      zIndex: 1000,
      elevation: 6,
    } as ViewStyle,

    backdrop: {
      position: 'absolute',
      top: -2000, // Larger coverage area
      left: -2000,
      right: -2000,
      bottom: -2000,
      zIndex: 99998, // Just below container
      backgroundColor: alpha(theme.colors.surface, 0), // Transparent using theme
    } as ViewStyle,

    dotsButton: {
      width: 36, // Compact but adequate size
      height: 36,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 0, // Remove border
      // No background - transparent by default
    } as ViewStyle,

    // Old in-flow menu style removed; using modalMenu for portal rendering
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: alpha(theme.colors.surface, 0),
    } as ViewStyle,
    modalMenu: {
      position: 'absolute',
      backgroundColor: getSurfaceColor(theme, 'elevated'),
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: spacing.elementGap,
      paddingVertical: spacing.elementGap / 2,
      minWidth: 140,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: getBorderColor(theme, 'light'),
    } as ViewStyle,

    menuItemsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center the icons
      gap: spacing.contentGap, // Add gap between icons
    } as ViewStyle,

    iconMenuItem: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.sm,
    } as ViewStyle,

    // Loading indicator
    loadingIndicator: {} as ViewStyle,
  });
};

const createMoodChipStyles = (theme: AppTheme) => {
  const spacing = semanticSpacing(theme);
  return StyleSheet.create({
    container: {
      position: 'relative',
      zIndex: 999,
    } as ViewStyle,
    chipButton: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(theme.colors.primaryContainer, 0.6),
      borderWidth: 1,
      borderColor: alpha(theme.colors.primary, 0.35),
      marginRight: spacing.elementGap,
    } as ViewStyle,
    chipDisabled: {
      opacity: 0.5,
    } as ViewStyle,
    chipText: {
      fontSize: 14,
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: alpha(theme.colors.surface, 0),
    } as ViewStyle,
    picker: {
      position: 'absolute',
      backgroundColor: getSurfaceColor(theme, 'elevated'),
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: spacing.contentGap,
      paddingVertical: spacing.contentGap,
      minWidth: 200,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: getBorderColor(theme, 'light'),
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    } as ViewStyle,
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.elementGap,
    } as ViewStyle,
    emojiButton: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: getBorderColor(theme, 'light'),
    } as ViewStyle,
    emojiText: {
      fontSize: 18,
    },
    clearButton: {
      backgroundColor: alpha(theme.colors.errorContainer, 0.3),
      borderColor: alpha(theme.colors.error, 0.3),
    } as ViewStyle,
  });
};

// 📱 EDGE-TO-EDGE LAYOUT HOOK
export const useResponsiveLayout = () => {
  const { width, height } = Dimensions.get('window');
  const { top, bottom, left, right } = useSafeAreaInsets();

  // Dynamic breakpoints for responsive design
  const breakpoint =
    width < 375 ? 'compact' : width < 768 ? 'regular' : width < 1024 ? 'large' : 'xlarge';

  // Dynamic margins based on screen width for better edge-to-edge experience
  const getContentMargins = () => {
    switch (breakpoint) {
      case 'compact':
        return { horizontal: 12, vertical: 8 }; // Tighter on small screens
      case 'regular':
        return { horizontal: 16, vertical: 12 }; // Standard phone
      case 'large':
        return { horizontal: 24, vertical: 16 }; // Large phones/small tablets
      case 'xlarge':
        return { horizontal: 32, vertical: 20 }; // Tablets/desktop
      default:
        return { horizontal: 16, vertical: 12 };
    }
  };

  // Maximum content width for readability
  const maxContentWidth = Math.min(width - 32, 800);

  // Enhanced padding system
  const getAdaptivePadding = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    const base = {
      sm: breakpoint === 'compact' ? 12 : 16,
      md: breakpoint === 'compact' ? 16 : 20,
      lg: breakpoint === 'compact' ? 20 : 24,
      xl: breakpoint === 'compact' ? 24 : 28,
    };
    return base[size];
  };

  return {
    breakpoint,
    screenDimensions: { width, height },
    safeAreaInsets: { top, bottom, left, right },
    contentMargins: getContentMargins(),
    maxContentWidth,
    getAdaptivePadding,
    isCompact: breakpoint === 'compact',
    isLarge: breakpoint === 'large' || breakpoint === 'xlarge',
  };
};

// 🎨 ENHANCED SHARED STYLE UTILITIES
export const createSharedStyles = (
  theme: AppTheme,
  layout: ReturnType<typeof useResponsiveLayout>
) => {
  const spacing = semanticSpacing(theme);
  const colors = textColors(theme);

  // Enhanced typography system with better hierarchy
  const enhancedTypography = {
    statement: {
      primary: {
        fontFamily: 'Lora-SemiBold',
        fontSize: layout.isCompact ? 17 : 18,
        fontWeight: '600' as const,
        lineHeight: layout.isCompact ? 26 : 28,
        letterSpacing: 0.4,
      },
      secondary: {
        fontFamily: 'Lora-Medium',
        fontSize: layout.isCompact ? 15 : 16,
        fontWeight: '500' as const,
        lineHeight: layout.isCompact ? 23 : 24,
        letterSpacing: 0.3,
      },
      tertiary: {
        fontFamily: 'Lora-Regular',
        fontSize: layout.isCompact ? 14 : 15,
        fontWeight: '400' as const,
        lineHeight: layout.isCompact ? 21 : 22,
        letterSpacing: 0.2,
      },
    },
    metadata: {
      primary: {
        fontFamily: 'Lora-Medium',
        fontSize: 12,
        fontWeight: '600' as const,
        letterSpacing: 0.6,
        textTransform: 'uppercase' as const,
      },
      secondary: {
        fontFamily: 'Lora-Regular',
        fontSize: 11,
        fontWeight: '500' as const,
        letterSpacing: 0.4,
      },
    },
  };

  // Enhanced shadow system with better depth perception
  const enhancedShadows = {
    minimal: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    subtle: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    elevated: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    floating: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 6,
    },
    overlay: {
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 28,
      elevation: 8,
    },
  };

  return {
    spacing,
    typography: enhancedTypography,
    colors,
    shadows: enhancedShadows,
    layout,

    // Enhanced container style function with edge-to-edge support
    getContainerStyle: (variant: 'elevated' | 'minimal' | 'highlighted', edgeToEdge = false) => {
      const margins = edgeToEdge
        ? { marginHorizontal: 0 }
        : {
            marginHorizontal: layout.contentMargins.horizontal,
          };

      const baseStyle = {
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden' as const,
        marginVertical: layout.contentMargins.vertical,
        ...margins,
      };

      switch (variant) {
        case 'elevated':
          return {
            ...baseStyle,
            backgroundColor: getSurfaceColor(theme, 'elevated'),
            borderWidth: 0,
            ...enhancedShadows.elevated,
          };
        case 'highlighted':
          return {
            ...baseStyle,
            backgroundColor: alpha(theme.colors.primaryContainer, 0.08),
            borderWidth: 0,
            // Remove thick left accent; rely on new premium gradients for emphasis
            borderLeftWidth: 0,
            borderLeftColor: 'transparent',
            ...enhancedShadows.floating,
          };
        case 'minimal':
        default:
          return {
            ...baseStyle,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: getBorderColor(theme, 'light'),
            ...enhancedShadows.subtle,
          };
      }
    },

    // Enhanced glassmorphism effect for context menus
    getGlassmorphismStyle: () => ({
      backgroundColor: Platform.select({
        ios: alpha(theme.colors.surface, 0.85),
        android: theme.colors.surface,
        default: theme.colors.surface,
      }),
      backdropFilter: 'blur(20px)',
      borderWidth: 1,
      borderColor: alpha(theme.colors.outline, 0.2),
      ...enhancedShadows.overlay,
    }),
  };
};

// 🎭 COORDINATED ANIMATION HOOKS - UNIFIED APPROACH
export const useStatementCardAnimations = () => {
  // **ANIMATION COORDINATION COMPLETED**: Use centralized coordinated system
  const coordinatedAnimations = useCoordinatedAnimations();
  const { reducedMotion } = useReducedMotion();

  /**
   * **ANIMATION SIMPLIFICATION COMPLETED**:
   * - Eliminated complex entrance animations with spring physics
   * - Removed shake animation sequences for errors
   * - Eliminated skeleton loading animations
   * - Removed context menu animations
   * - Replaced custom animation hooks with coordinated system
   * - Unified all statement card animations under one system
   */

  // STABLE OBJECT - COORDINATED API
  useEffect(() => {
    if (reducedMotion) {
      const scale: Animated.Value | undefined = (
        coordinatedAnimations as unknown as {
          scaleAnim?: Animated.Value;
        }
      ).scaleAnim;
      const fade: Animated.Value | undefined = (
        coordinatedAnimations as unknown as {
          fadeAnim?: Animated.Value;
        }
      ).fadeAnim;
      const opacity: Animated.Value | undefined = (
        coordinatedAnimations as unknown as {
          opacityAnim?: Animated.Value;
        }
      ).opacityAnim;

      scale?.setValue(1);
      fade?.setValue(1);
      opacity?.setValue(1);
    }
  }, [reducedMotion, coordinatedAnimations]);

  return useMemo(
    () => ({
      // Use coordinated animation values
      pressAnim: coordinatedAnimations.scaleAnim,
      fadeAnim: coordinatedAnimations.fadeAnim,
      opacityAnim: coordinatedAnimations.opacityAnim,

      // Use coordinated animation methods (no-op when reduced motion is enabled)
      animatePressIn: reducedMotion ? () => {} : coordinatedAnimations.animatePressIn,
      animatePressOut: reducedMotion ? () => {} : coordinatedAnimations.animatePressOut,
      animateEntrance: reducedMotion ? () => {} : coordinatedAnimations.animateEntrance,
    }),
    [coordinatedAnimations, reducedMotion]
  );
};

// 🎵 ENHANCED HAPTIC FEEDBACK SYSTEM
export const useHapticFeedback = (enabled = true) => {
  const { reducedMotion } = useReducedMotion();
  const triggerHaptic = (
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' = 'light'
  ) => {
    if (!enabled || Platform.OS === 'web' || reducedMotion) {
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
      case 'selection':
        Haptics.selectionAsync();
        break;
    }
  };

  return { triggerHaptic };
};

// ♿ REDUCED MOTION SUPPORT
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (isMounted) {
        setReducedMotion(Boolean(value));
      }
    });

    // Listener compatibility across RN versions
    const handler = (value: boolean) => setReducedMotion(Boolean(value));
    const subscription: { remove?: () => void } | undefined = // @ts-ignore - older RN types
      AccessibilityInfo.addEventListener?.('reduceMotionChanged', handler);

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  return { reducedMotion };
};

// 🛠️ ENHANCED UTILITY FUNCTIONS
export const formatStatementDate = (date: Date | string | undefined) => {
  if (!date) {
    return { formattedDate: '', relativeTime: '', isRecent: false };
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Validate date object
  if (isNaN(dateObj.getTime())) {
    return {
      formattedDate: i18n.t('shared.statement.invalidDate'),
      relativeTime: '',
      isRecent: false,
    };
  }

  const today = new Date();
  const diffTime = today.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Handle future dates
  if (diffDays < 0) {
    return {
      formattedDate: dateObj.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US'),
      relativeTime: '',
      isRecent: false,
    };
  }

  const formattedDate = dateObj.toLocaleDateString(i18n.language === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  let relativeTime = '';
  let isRecent = false;

  if (diffDays === 0) {
    relativeTime = i18n.t('pastEntries.item.relative.today');
    isRecent = true;
  } else if (diffDays === 1) {
    relativeTime = i18n.t('pastEntries.item.relative.yesterday');
    isRecent = true;
  } else if (diffDays >= 2 && diffDays < 7) {
    relativeTime = i18n.t('pastEntries.item.relative.days', { count: diffDays });
    isRecent = true;
  } else if (diffDays >= 7 && diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    relativeTime = i18n.t('pastEntries.item.relative.weeks', { count: weeks });
  } else if (diffDays >= 30 && diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relativeTime = i18n.t('pastEntries.item.relative.months', { count: months });
  } else if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    // Approximate using months if year-specific keys are not defined
    relativeTime = i18n.t('pastEntries.item.relative.months', { count: years * 12 });
  }

  return { formattedDate, relativeTime, isRecent };
};

export const truncateStatement = (statement: string, maxLength = 140) => {
  if (statement.length <= maxLength) {
    return { text: statement, isTruncated: false };
  }

  // Enhanced truncation that respects word boundaries
  const truncated = statement.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const smartTruncated =
    lastSpace > maxLength * 0.8 ? truncated.substring(0, lastSpace) : truncated;

  return {
    text: smartTruncated + '...',
    isTruncated: true,
  };
};

// 🎯 ENHANCED BASE COMPONENT WRAPPER
export const StatementCardWrapper: React.FC<{
  children: React.ReactNode;
  animations: ReturnType<typeof useStatementCardAnimations>;
  style?: ViewStyle | ViewStyle[];
  edgeToEdge?: boolean;
}> = ({ children, animations, style, edgeToEdge = false }) => {
  const layout = useResponsiveLayout();

  const containerStyle = edgeToEdge
    ? {
        paddingHorizontal:
          layout.safeAreaInsets.left || layout.safeAreaInsets.right
            ? Math.max(layout.safeAreaInsets.left, layout.safeAreaInsets.right)
            : 0,
      }
    : {};

  return (
    <Animated.View
      style={[
        containerStyle,
        style,
        {
          opacity: animations.fadeAnim,
          transform: [
            {
              scale: animations.pressAnim,
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// 🎨 SKELETON LOADING COMPONENT
export const StatementCardSkeleton: React.FC<{
  variant?: 'default' | 'detailed' | 'compact';
}> = ({ variant: _variant = 'default' }) => {
  const { theme } = useTheme();
  // Removed unused animations variable

  const skeletonStyle = {
    backgroundColor: alpha(theme.colors.outline, 0.1),
    borderRadius: 4,
  };

  return (
    <Animated.View style={[skeletonStyle]}>{/* Skeleton content based on variant */}</Animated.View>
  );
};
