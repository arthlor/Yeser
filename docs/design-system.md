# Design System

> Comprehensive visual language and component system powering Yeser's beautiful, consistent user interface.

## 🎨 Overview

Yeser's design system provides:

- **Consistent Visual Language** - Unified colors, typography, spacing, and component patterns
- **Dark/Light Theme Support** - Adaptive themes with seamless switching
- **Accessibility First** - WCAG 2.1 AA compliant design patterns
- **Component Library** - Reusable, themeable UI components
- **Performance Optimized** - StyleSheet-based styling with zero inline styles

## 🏗 Theme Architecture

### Core Theme Structure

```typescript
// Base theme interface
interface AppTheme {
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  components: ComponentThemes;
}

interface ThemeColors {
  // Primary colors
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary colors
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Surface colors
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;

  // Background colors
  background: string;
  onBackground: string;

  // Error colors
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Success colors (custom)
  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;

  // Warning colors (custom)
  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;

  // Semantic colors
  gratitudeAccent: string;
  streakAccent: string;
  achievementAccent: string;

  // Utility colors
  outline: string;
  outlineVariant: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
}

interface ThemeTypography {
  // Display styles
  displayLarge: TextStyle;
  displayMedium: TextStyle;
  displaySmall: TextStyle;

  // Headline styles
  headlineLarge: TextStyle;
  headlineMedium: TextStyle;
  headlineSmall: TextStyle;

  // Title styles
  titleLarge: TextStyle;
  titleMedium: TextStyle;
  titleSmall: TextStyle;

  // Body styles
  bodyLarge: TextStyle;
  bodyMedium: TextStyle;
  bodySmall: TextStyle;

  // Label styles
  labelLarge: TextStyle;
  labelMedium: TextStyle;
  labelSmall: TextStyle;
}
```

### Light Theme Definition

```typescript
// Light theme implementation
export const lightTheme: AppTheme = {
  colors: {
    // Primary - Gratitude Green
    primary: '#2E7D32',
    onPrimary: '#FFFFFF',
    primaryContainer: '#A5D6A7',
    onPrimaryContainer: '#1B5E20',

    // Secondary - Warm Orange
    secondary: '#F57C00',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FFE0B2',
    onSecondaryContainer: '#E65100',

    // Surface colors
    surface: '#FFFFFF',
    onSurface: '#1C1B1F',
    surfaceVariant: '#F3F2F7',
    onSurfaceVariant: '#46464F',

    // Background
    background: '#FEFBFF',
    onBackground: '#1C1B1F',

    // Error colors
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#410002',

    // Success colors
    success: '#146C2E',
    onSuccess: '#FFFFFF',
    successContainer: '#B7F397',
    onSuccessContainer: '#002204',

    // Warning colors
    warning: '#7D5700',
    onWarning: '#FFFFFF',
    warningContainer: '#FFDF9C',
    onWarningContainer: '#271900',

    // Semantic colors
    gratitudeAccent: '#4CAF50',
    streakAccent: '#FF6B35',
    achievementAccent: '#FFD700',

    // Utility colors
    outline: '#777680',
    outlineVariant: '#C7C5D0',
    scrim: '#000000',
    inverseSurface: '#313033',
    inverseOnSurface: '#F4EFF4',
    inversePrimary: '#7BC67E',
  },

  typography: {
    // Display styles
    displayLarge: {
      fontFamily: 'Inter-Bold',
      fontSize: 57,
      lineHeight: 64,
      letterSpacing: -0.25,
      fontWeight: '700',
    },
    displayMedium: {
      fontFamily: 'Inter-Bold',
      fontSize: 45,
      lineHeight: 52,
      letterSpacing: 0,
      fontWeight: '700',
    },
    displaySmall: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 36,
      lineHeight: 44,
      letterSpacing: 0,
      fontWeight: '600',
    },

    // Headline styles
    headlineLarge: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 32,
      lineHeight: 40,
      letterSpacing: 0,
      fontWeight: '600',
    },
    headlineMedium: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: 0,
      fontWeight: '600',
    },
    headlineSmall: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: 0,
      fontWeight: '600',
    },

    // Title styles
    titleLarge: {
      fontFamily: 'Inter-Medium',
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: 0,
      fontWeight: '500',
    },
    titleMedium: {
      fontFamily: 'Inter-Medium',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.15,
      fontWeight: '500',
    },
    titleSmall: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
      fontWeight: '500',
    },

    // Body styles
    bodyLarge: {
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.5,
      fontWeight: '400',
    },
    bodyMedium: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.25,
      fontWeight: '400',
    },
    bodySmall: {
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      fontWeight: '400',
    },

    // Label styles
    labelLarge: {
      fontFamily: 'Inter-Medium',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0.1,
      fontWeight: '500',
    },
    labelMedium: {
      fontFamily: 'Inter-Medium',
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.5,
      fontWeight: '500',
    },
    labelSmall: {
      fontFamily: 'Inter-Medium',
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 0.5,
      fontWeight: '500',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },

  borders: {
    none: 0,
    thin: 1,
    medium: 2,
    thick: 4,
    radius: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 28,
      full: 999,
    },
  },

  shadows: {
    none: {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    sm: {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    lg: {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    xl: {
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.37,
      shadowRadius: 7.49,
      elevation: 12,
    },
  },

  animations: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 400,
    },
    easing: {
      easeIn: Easing.in(Easing.ease),
      easeOut: Easing.out(Easing.ease),
      easeInOut: Easing.inOut(Easing.ease),
    },
  },
};
```

### Dark Theme Definition

```typescript
// Dark theme implementation
export const darkTheme: AppTheme = {
  ...lightTheme, // Inherit base structure
  colors: {
    // Primary - Adjusted for dark mode
    primary: '#7BC67E',
    onPrimary: '#003910',
    primaryContainer: '#195E1D',
    onPrimaryContainer: '#A5D6A7',

    // Secondary - Adjusted for dark mode
    secondary: '#FFB74D',
    onSecondary: '#3E2D00',
    secondaryContainer: '#5C4200',
    onSecondaryContainer: '#FFE0B2',

    // Surface colors - Dark mode
    surface: '#16151A',
    onSurface: '#E6E1E5',
    surfaceVariant: '#46464F',
    onSurfaceVariant: '#C7C5D0',

    // Background - Dark mode
    background: '#100F13',
    onBackground: '#E6E1E5',

    // Error colors - Dark mode
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',

    // Success colors - Dark mode
    success: '#9CD67C',
    onSuccess: '#0A390E',
    successContainer: '#0F531C',
    onSuccessContainer: '#B7F397',

    // Warning colors - Dark mode
    warning: '#FFDF9C',
    onWarning: '#3E2D00',
    warningContainer: '#5C4200',
    onWarningContainer: '#FFDF9C',

    // Semantic colors - Dark mode adjusted
    gratitudeAccent: '#81C784',
    streakAccent: '#FF8A65',
    achievementAccent: '#FFE082',

    // Utility colors - Dark mode
    outline: '#918F99',
    outlineVariant: '#46464F',
    scrim: '#000000',
    inverseSurface: '#E6E1E5',
    inverseOnSurface: '#313033',
    inversePrimary: '#2E7D32',
  },
};
```

## 🎯 Component Theming

### Themed Component Patterns

```typescript
// Base themed component interface
interface ThemedComponentProps {
  theme?: AppTheme;
  variant?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

// Example: Themed Button Component
interface ThemedButtonProps extends ThemedComponentProps {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
}

const ThemedButton: React.FC<ThemedButtonProps> = React.memo(({
  title,
  onPress,
  variant = 'filled',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() => createButtonStyles(theme, variant, size, disabled),
    [theme, variant, size, disabled]);

  const textColor = useMemo(() => {
    if (disabled) return theme.colors.onSurfaceVariant;

    switch (variant) {
      case 'filled':
        return theme.colors.onPrimary;
      case 'outlined':
        return theme.colors.primary;
      case 'text':
        return theme.colors.primary;
      default:
        return theme.colors.onPrimary;
    }
  }, [theme, variant, disabled]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Icon
              name={icon}
              size={styles.iconSize}
              color={textColor}
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, { color: textColor }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// Button styles factory
const createButtonStyles = (
  theme: AppTheme,
  variant: string,
  size: string,
  disabled: boolean
) => {
  const sizeConfig = {
    small: { height: 32, paddingHorizontal: 16, fontSize: 12, iconSize: 16 },
    medium: { height: 40, paddingHorizontal: 24, fontSize: 14, iconSize: 18 },
    large: { height: 48, paddingHorizontal: 32, fontSize: 16, iconSize: 20 },
  }[size];

  const variantStyles = {
    filled: {
      backgroundColor: disabled
        ? theme.colors.surfaceVariant
        : theme.colors.primary,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: disabled
        ? theme.colors.outlineVariant
        : theme.colors.primary,
    },
    text: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  }[variant];

  return StyleSheet.create({
    container: {
      height: sizeConfig.height,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: theme.borders.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      ...variantStyles,
      opacity: disabled ? 0.6 : 1,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontSize: sizeConfig.fontSize,
      fontFamily: theme.typography.labelLarge.fontFamily,
      fontWeight: theme.typography.labelLarge.fontWeight,
    },
    icon: {
      marginRight: theme.spacing.xs,
    },
    iconSize: sizeConfig.iconSize,
  });
};
```

### Component Theme Definitions

```typescript
// Component-specific theme definitions
interface ComponentThemes {
  button: ButtonTheme;
  card: CardTheme;
  input: InputTheme;
  modal: ModalTheme;
  navigation: NavigationTheme;
}

interface ButtonTheme {
  variants: {
    filled: ButtonVariantTheme;
    outlined: ButtonVariantTheme;
    text: ButtonVariantTheme;
  };
  sizes: {
    small: ButtonSizeTheme;
    medium: ButtonSizeTheme;
    large: ButtonSizeTheme;
  };
}

interface ButtonVariantTheme {
  backgroundColor: string;
  textColor: string;
  borderColor?: string;
  pressedBackgroundColor: string;
  disabledBackgroundColor: string;
  disabledTextColor: string;
}

interface CardTheme {
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  borderWidth: number;
  padding: number;
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

// Complete component themes
const componentThemes: ComponentThemes = {
  button: {
    variants: {
      filled: {
        backgroundColor: lightTheme.colors.primary,
        textColor: lightTheme.colors.onPrimary,
        pressedBackgroundColor: '#1B5E20',
        disabledBackgroundColor: lightTheme.colors.surfaceVariant,
        disabledTextColor: lightTheme.colors.onSurfaceVariant,
      },
      outlined: {
        backgroundColor: 'transparent',
        textColor: lightTheme.colors.primary,
        borderColor: lightTheme.colors.primary,
        pressedBackgroundColor: lightTheme.colors.primaryContainer,
        disabledBackgroundColor: 'transparent',
        disabledTextColor: lightTheme.colors.onSurfaceVariant,
      },
      text: {
        backgroundColor: 'transparent',
        textColor: lightTheme.colors.primary,
        pressedBackgroundColor: lightTheme.colors.primaryContainer,
        disabledBackgroundColor: 'transparent',
        disabledTextColor: lightTheme.colors.onSurfaceVariant,
      },
    },
    sizes: {
      small: { height: 32, paddingHorizontal: 16, fontSize: 12 },
      medium: { height: 40, paddingHorizontal: 24, fontSize: 14 },
      large: { height: 48, paddingHorizontal: 32, fontSize: 16 },
    },
  },

  card: {
    backgroundColor: lightTheme.colors.surface,
    borderColor: lightTheme.colors.outlineVariant,
    borderRadius: lightTheme.borders.radius.md,
    borderWidth: 1,
    padding: lightTheme.spacing.md,
    shadowColor: lightTheme.colors.scrim,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  input: {
    backgroundColor: lightTheme.colors.surfaceVariant,
    borderColor: lightTheme.colors.outline,
    focusedBorderColor: lightTheme.colors.primary,
    errorBorderColor: lightTheme.colors.error,
    textColor: lightTheme.colors.onSurface,
    placeholderColor: lightTheme.colors.onSurfaceVariant,
    borderRadius: lightTheme.borders.radius.sm,
    padding: lightTheme.spacing.md,
  },

  modal: {
    backgroundColor: lightTheme.colors.surface,
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: lightTheme.borders.radius.lg,
    padding: lightTheme.spacing.lg,
    maxWidth: 400,
  },

  navigation: {
    headerBackgroundColor: lightTheme.colors.surface,
    headerTintColor: lightTheme.colors.onSurface,
    tabBarBackgroundColor: lightTheme.colors.surface,
    tabBarActiveTintColor: lightTheme.colors.primary,
    tabBarInactiveTintColor: lightTheme.colors.onSurfaceVariant,
  },
};
```

## 📱 Responsive Design

### Screen Size Breakpoints

```typescript
// Responsive design utilities
interface ScreenBreakpoints {
  small: number; // Small phones
  medium: number; // Standard phones
  large: number; // Large phones/small tablets
  xlarge: number; // Tablets
}

const breakpoints: ScreenBreakpoints = {
  small: 375, // iPhone SE
  medium: 414, // iPhone 11 Pro Max
  large: 768, // iPad Mini
  xlarge: 1024, // iPad Pro
};

// Screen size hooks
export const useScreenSize = () => {
  const { width, height } = Dimensions.get('window');

  const screenSize = useMemo(() => {
    if (width < breakpoints.small) return 'xs';
    if (width < breakpoints.medium) return 'sm';
    if (width < breakpoints.large) return 'md';
    if (width < breakpoints.xlarge) return 'lg';
    return 'xl';
  }, [width]);

  const orientation = width > height ? 'landscape' : 'portrait';

  return {
    width,
    height,
    screenSize,
    orientation,
    isSmallScreen: screenSize === 'xs' || screenSize === 'sm',
    isTablet: screenSize === 'lg' || screenSize === 'xl',
  };
};

// Responsive spacing utility
export const useResponsiveSpacing = () => {
  const { screenSize } = useScreenSize();
  const { theme } = useTheme();

  return useMemo(() => {
    const multiplier = {
      xs: 0.8,
      sm: 1,
      md: 1.2,
      lg: 1.4,
      xl: 1.6,
    }[screenSize];

    return {
      xs: theme.spacing.xs * multiplier,
      sm: theme.spacing.sm * multiplier,
      md: theme.spacing.md * multiplier,
      lg: theme.spacing.lg * multiplier,
      xl: theme.spacing.xl * multiplier,
      xxl: theme.spacing.xxl * multiplier,
      xxxl: theme.spacing.xxxl * multiplier,
    };
  }, [screenSize, theme.spacing]);
};
```

## ♿ Accessibility Standards

### Accessibility Guidelines

```typescript
// Accessibility utilities and standards
interface AccessibilityStandards {
  minimumTouchTarget: number;
  minimumColorContrast: number;
  focusRingWidth: number;
  animationDuration: number;
}

const a11yStandards: AccessibilityStandards = {
  minimumTouchTarget: 44, // 44x44 pts minimum
  minimumColorContrast: 4.5, // WCAG AA standard
  focusRingWidth: 2,
  animationDuration: 200, // Maximum for accessibility
};

// Color contrast checker
export const checkColorContrast = (
  foreground: string,
  background: string
): { ratio: number; isAccessible: boolean } => {
  const ratio = calculateContrastRatio(foreground, background);
  return {
    ratio,
    isAccessible: ratio >= a11yStandards.minimumColorContrast,
  };
};

// Accessible component wrapper
interface AccessibleViewProps {
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  focusable?: boolean;
  minimumTouchTarget?: boolean;
}

const AccessibleView: React.FC<AccessibleViewProps> = ({
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  focusable = false,
  minimumTouchTarget = false,
  ...props
}) => {
  const { theme } = useTheme();

  const style = useMemo(() => ({
    minHeight: minimumTouchTarget ? a11yStandards.minimumTouchTarget : undefined,
    minWidth: minimumTouchTarget ? a11yStandards.minimumTouchTarget : undefined,
  }), [minimumTouchTarget]);

  return (
    <View
      style={style}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      focusable={focusable}
      {...props}
    >
      {children}
    </View>
  );
};

// Focus management hook
export const useFocusManagement = () => {
  const focusedElementRef = useRef<any>(null);

  const setFocus = useCallback((element: any) => {
    if (element && element.focus) {
      element.focus();
      focusedElementRef.current = element;
    }
  }, []);

  const clearFocus = useCallback(() => {
    if (focusedElementRef.current && focusedElementRef.current.blur) {
      focusedElementRef.current.blur();
      focusedElementRef.current = null;
    }
  }, []);

  return { setFocus, clearFocus, focusedElement: focusedElementRef.current };
};
```

## 🎭 Animation System

### Motion Design Principles

```typescript
// Animation configuration
interface AnimationConfig {
  duration: {
    instant: number;
    fast: number;
    normal: number;
    slow: number;
  };
  easing: {
    linear: (value: number) => number;
    ease: (value: number) => number;
    easeIn: (value: number) => number;
    easeOut: (value: number) => number;
    easeInOut: (value: number) => number;
    spring: {
      tension: number;
      friction: number;
    };
  };
  presets: {
    fadeIn: Animated.TimingAnimationConfig;
    slideUp: Animated.TimingAnimationConfig;
    scale: Animated.TimingAnimationConfig;
    bounce: Animated.SpringAnimationConfig;
  };
}

const animationConfig: AnimationConfig = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
  },

  easing: {
    linear: Easing.linear,
    ease: Easing.ease,
    easeIn: Easing.in(Easing.ease),
    easeOut: Easing.out(Easing.ease),
    easeInOut: Easing.inOut(Easing.ease),
    spring: {
      tension: 100,
      friction: 8,
    },
  },

  presets: {
    fadeIn: {
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    },
    slideUp: {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    },
    scale: {
      duration: 200,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    },
    bounce: {
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    },
  },
};

// Animation hooks
export const useAnimation = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const fadeIn = useCallback(
    (duration?: number) => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: duration || animationConfig.duration.normal,
        ...animationConfig.presets.fadeIn,
      }).start();
    },
    [fadeAnim]
  );

  const fadeOut = useCallback(
    (duration?: number) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: duration || animationConfig.duration.fast,
        ...animationConfig.presets.fadeIn,
      }).start();
    },
    [fadeAnim]
  );

  const scaleIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...animationConfig.presets.bounce,
    }).start();
  }, [scaleAnim]);

  const slideUp = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      ...animationConfig.presets.slideUp,
    }).start();
  }, [slideAnim]);

  return {
    fadeAnim,
    scaleAnim,
    slideAnim,
    fadeIn,
    fadeOut,
    scaleIn,
    slideUp,
  };
};
```

## 📏 Layout System

### Grid System

```typescript
// Grid system for consistent layouts
interface GridSystem {
  columns: number;
  gutter: number;
  margin: number;
  breakpoints: ScreenBreakpoints;
}

const gridSystem: GridSystem = {
  columns: 12,
  gutter: 16,
  margin: 16,
  breakpoints,
};

// Grid utilities
export const useGrid = () => {
  const { width } = useScreenSize();
  const { theme } = useTheme();

  const columnWidth = useMemo(() => {
    const availableWidth = width - (gridSystem.margin * 2);
    const gutterSpace = (gridSystem.columns - 1) * gridSystem.gutter;
    return (availableWidth - gutterSpace) / gridSystem.columns;
  }, [width]);

  const getColumnWidth = useCallback((span: number) => {
    return (columnWidth * span) + (gridSystem.gutter * (span - 1));
  }, [columnWidth]);

  const createGridStyles = useCallback((span: number, offset: number = 0) => {
    return {
      width: getColumnWidth(span),
      marginLeft: offset > 0 ? getColumnWidth(offset) + gridSystem.gutter : 0,
    };
  }, [getColumnWidth]);

  return {
    columnWidth,
    getColumnWidth,
    createGridStyles,
    gridConfig: gridSystem,
  };
};

// Container component for consistent layouts
interface ContainerProps {
  children: React.ReactNode;
  fluid?: boolean;
  padding?: keyof ThemeSpacing;
}

const Container: React.FC<ContainerProps> = ({
  children,
  fluid = false,
  padding = 'md',
}) => {
  const { theme } = useTheme();
  const { width } = useScreenSize();

  const containerStyle = useMemo(() => ({
    width: fluid ? '100%' : Math.min(width - 32, 1200),
    paddingHorizontal: theme.spacing[padding],
    alignSelf: 'center' as const,
  }), [fluid, width, theme.spacing, padding]);

  return <View style={containerStyle}>{children}</View>;
};
```

This comprehensive design system ensures visual consistency, accessibility compliance, and maintainable styling patterns throughout the Yeser application.
