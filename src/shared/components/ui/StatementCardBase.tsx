import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import {
  alpha,
  getBorderColor,
  getSurfaceColor,
  semanticSpacing,
  textColors,
} from '@/themes/utils';

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
    const { triggerHaptic } = useHapticFeedback(hapticFeedback);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuAnim = useRef(new Animated.Value(0)).current;
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
      setIsMenuOpen(true);
      Animated.spring(menuAnim, {
        toValue: 1,
        tension: 300,
        friction: 30,
        useNativeDriver: true,
      }).start();
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
      <View style={styles.container}>
        {/* 🛡️ BULLETPROOF BACKDROP - Enhanced touch handling */}
        {isMenuOpen && (
          <TouchableOpacity
            style={styles.backdrop}
            onPress={handleBackdropPress}
            activeOpacity={1}
            accessibilityLabel="Menüyü kapat"
            accessibilityRole="button"
          />
        )}

        {/* 🎯 ROBUST MENU BUTTON - Enhanced touch targets */}
        <TouchableOpacity
          style={styles.dotsButton}
          onPress={toggleMenu}
          activeOpacity={0.6}
          accessibilityLabel="Seçenekler menüsü"
          accessibilityRole="button"
          accessibilityHint="Düzenleme ve silme seçeneklerini görmek için dokunun"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="dots-vertical" size={18} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* 🎯 ROBUST DROPDOWN MENU - Enhanced animations and positioning */}
        <Animated.View
          style={[
            styles.menu,
            {
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
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
        >
          {/* 🎨 ICON-ONLY ACTIONS - Clean minimal design */}
          <View style={styles.menuItemsContainer}>
            {/* Edit Action - Icon Only */}
            {onEdit && (
              <TouchableOpacity
                style={styles.iconMenuItem}
                onPress={handleEdit}
                activeOpacity={0.7}
                accessibilityLabel="Düzenle"
                accessibilityRole="button"
                accessibilityHint="Bu minnet ifadesini düzenle"
              >
                <Icon name="pencil" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}

            {/* Delete Action - Icon Only */}
            {onDelete && (
              <TouchableOpacity
                style={styles.iconMenuItem}
                onPress={handleDelete}
                activeOpacity={0.7}
                accessibilityLabel="Sil"
                accessibilityRole="button"
                accessibilityHint="Bu minnet ifadesini sil"
              >
                <Icon name="trash-can" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    );
  }
);

ThreeDotsMenu.displayName = 'ThreeDotsMenu';

// 🎨 ROBUST MENU STYLES - SIMPLIFIED AND RELIABLE
const createRobustMenuStyles = (theme: AppTheme) => {
  const spacing = semanticSpacing(theme);

  return StyleSheet.create({
    container: {
      position: 'relative',
      zIndex: 99999, // Extremely high z-index for bulletproof layering
      elevation: 15, // Higher Android elevation
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
      width: 36, // Reduced from 44px for more compact design
      height: 36,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(theme.colors.onSurfaceVariant, 0.06), // Reduced opacity for subtlety
      // Enhanced visual design with smaller shadows
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 1,
    } as ViewStyle,

    menu: {
      position: 'absolute',
      top: 40, // Adjusted for smaller button (36px + 4px gap)
      right: 0,
      backgroundColor: getSurfaceColor(theme, 'elevated'),
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: spacing.elementGap,
      paddingVertical: spacing.elementGap / 2,
      maxWidth: 100, // Smaller width for icon-only layout
      zIndex: 99999, // Match container z-index for consistency
      // Enhanced shadows for better depth
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      elevation: 8,
      // Better border definition
      borderWidth: 1,
      borderColor: getBorderColor(theme, 'light'),
    } as ViewStyle,

    menuItemsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', // Center the icons
      gap: spacing.contentGap, // Add gap between icons
    } as ViewStyle,

    iconMenuItem: {
      width: 32, // Smaller touch target
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    // Loading indicator
    loadingIndicator: {} as ViewStyle,
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
            borderLeftWidth: layout.isCompact ? 3 : 4,
            borderLeftColor: theme.colors.primary,
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

// 🎭 OPTIMIZED ANIMATION HOOKS - STABLE REFERENCES
export const useStatementCardAnimations = () => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const skeletonAnim = useRef(new Animated.Value(0)).current;

  // Enhanced entrance animation with spring physics - MEMOIZED
  const animateEntrance = useCallback(
    (delay = 0) => {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [fadeAnim, scaleAnim]
  );

  // Enhanced press animations with better physics - MEMOIZED
  const animatePressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.97,
      tension: 500,
      friction: 30,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  const animatePressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      tension: 500,
      friction: 30,
      useNativeDriver: true,
    }).start();
  }, [pressAnim]);

  // Enhanced error animation with more natural feel - MEMOIZED
  const animateError = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Skeleton loading animation for better loading states - MEMOIZED
  const animateSkeleton = useCallback(() => {
    const skeletonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    skeletonAnimation.start();
    return () => skeletonAnimation.stop();
  }, [skeletonAnim]);

  // Context menu entrance with glassmorphism - MEMOIZED
  const animateContextMenu = useCallback(
    (show: boolean) => {
      return Animated.spring(fadeAnim, {
        toValue: show ? 1 : 0,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      });
    },
    [fadeAnim]
  );

  // STABLE OBJECT - ONLY CHANGES WHEN ANIMATION VALUES CHANGE
  return useMemo(
    () => ({
      fadeAnim,
      scaleAnim,
      pressAnim,
      shakeAnim,
      skeletonAnim,
      animateEntrance,
      animatePressIn,
      animatePressOut,
      animateError,
      animateSkeleton,
      animateContextMenu,
    }),
    [
      fadeAnim,
      scaleAnim,
      pressAnim,
      shakeAnim,
      skeletonAnim,
      animateEntrance,
      animatePressIn,
      animatePressOut,
      animateError,
      animateSkeleton,
      animateContextMenu,
    ]
  );
};

// 🎵 ENHANCED HAPTIC FEEDBACK SYSTEM
export const useHapticFeedback = (enabled = true) => {
  const triggerHaptic = (
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' = 'light'
  ) => {
    if (!enabled || Platform.OS === 'web') {
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

// 🛠️ ENHANCED UTILITY FUNCTIONS
export const formatStatementDate = (date: Date | string | undefined) => {
  if (!date) {
    return { formattedDate: 'Tarih bilgisi yok', relativeTime: '', isRecent: false };
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Validate date object
  if (isNaN(dateObj.getTime())) {
    return { formattedDate: 'Geçersiz tarih', relativeTime: '', isRecent: false };
  }

  const today = new Date();
  const diffTime = today.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Handle future dates
  if (diffDays < 0) {
    return {
      formattedDate: dateObj.toLocaleDateString('tr-TR'),
      relativeTime: 'Gelecek',
      isRecent: false,
    };
  }

  const formattedDate = dateObj.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  let relativeTime = '';
  let isRecent = false;

  if (diffDays === 0) {
    relativeTime = 'Bugün';
    isRecent = true;
  } else if (diffDays === 1) {
    relativeTime = 'Dün';
    isRecent = true;
  } else if (diffDays >= 2 && diffDays < 7) {
    relativeTime = `${diffDays} gün önce`;
    isRecent = true;
  } else if (diffDays >= 7 && diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    relativeTime = weeks === 1 ? '1 hafta önce' : `${weeks} hafta önce`;
  } else if (diffDays >= 30 && diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    relativeTime = months === 1 ? '1 ay önce' : `${months} ay önce`;
  } else if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    relativeTime = years === 1 ? '1 yıl önce' : `${years} yıl önce`;
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
            { scale: Animated.multiply(animations.scaleAnim, animations.pressAnim) },
            { translateX: animations.shakeAnim },
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
  const animations = useStatementCardAnimations();

  React.useEffect(() => {
    const cleanup = animations.animateSkeleton();
    return cleanup;
  }, [animations]);

  const skeletonStyle = {
    backgroundColor: alpha(theme.colors.outline, 0.1),
    borderRadius: 4,
  };

  return (
    <Animated.View
      style={[
        skeletonStyle,
        {
          opacity: animations.skeletonAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 0.7],
          }),
        },
      ]}
    >
      {/* Skeleton content based on variant */}
    </Animated.View>
  );
};
