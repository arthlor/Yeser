import {
  AppTheme,
  ThemeTypography,
  ThemeTypographyStyle,
} from './types';

/**
 * Enhanced color manipulation utilities
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const rgbToHex = (r: number, g: number, b: number): string =>
  `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

export const alpha = (color: string, opacity: number): string => {
  // Handle different color formats
  if (color.startsWith('rgba')) {
    // Replace existing alpha
    return color.replace(/[\d.]+\)$/g, `${Math.max(0, Math.min(1, opacity))})`);
  }

  if (color.startsWith('rgb')) {
    // Convert rgb to rgba
    return color.replace('rgb', 'rgba').replace(')', `, ${Math.max(0, Math.min(1, opacity))})`);
  }

  if (color.startsWith('#')) {
    const rgb = hexToRgb(color);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, opacity))})`;
    }
  }

  // Fallback for named colors or other formats
  return `rgba(0, 0, 0, ${Math.max(0, Math.min(1, opacity))})`;
};

export const lighten = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) {return color;}

  const factor = 1 + Math.max(0, Math.min(1, amount));
  return rgbToHex(
    Math.min(255, Math.round(rgb.r * factor)),
    Math.min(255, Math.round(rgb.g * factor)),
    Math.min(255, Math.round(rgb.b * factor))
  );
};

export const darken = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) {return color;}

  const factor = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(
    Math.max(0, Math.round(rgb.r * factor)),
    Math.max(0, Math.round(rgb.g * factor)),
    Math.max(0, Math.round(rgb.b * factor))
  );
};

/**
 * Advanced color manipulation functions
 */
export const blend = (color1: string, color2: string, ratio = 0.5): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {return color1;}

  const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
  const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
  const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

  return rgbToHex(r, g, b);
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    const rgb = hexToRgb(color);
    if (!rgb) {return 0;}

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Enhanced color utilities for better theming
 */
export const getBorderColor = (theme: AppTheme, variant: 'light' | 'medium' | 'strong' = 'medium'): string => {
  // Use enhanced border colors if available, fallback to outline variants
  switch (variant) {
    case 'light':
      return theme.colors.borderLight ?? alpha(theme.colors.outline, 0.3);
    case 'strong':
      return theme.colors.borderStrong ?? theme.colors.outline;
    default:
      return theme.colors.borderMedium ?? alpha(theme.colors.outline, 0.6);
  }
};

export const getSurfaceColor = (theme: AppTheme, level: 'base' | 'elevated' | 'container' = 'base'): string => {
  switch (level) {
    case 'elevated':
      return theme.colors.surfaceElevated ?? lighten(theme.colors.surface, 0.02);
    case 'container':
      return theme.colors.surfaceContainer ?? theme.colors.surfaceVariant;
    default:
      return theme.colors.surface;
  }
};

export const getInteractionColor = (theme: AppTheme, state: 'hover' | 'pressed' | 'focus' | 'selected'): string => {
  switch (state) {
    case 'hover':
      return theme.colors.hover;
    case 'pressed':
      return theme.colors.pressed;
    case 'focus':
      return theme.colors.focusRing ?? theme.colors.focus;
    case 'selected':
      return theme.colors.selected;
    default:
      return theme.colors.hover;
  }
};

/**
 * Spacing utilities
 */
export const getSpacing =
  (theme: AppTheme) =>
  (multiplier: number): number =>
    theme.spacing.md * multiplier;

export const createSpacingScale = (baseUnit = 4) => ({
  none: 0,
  xxs: baseUnit * 0.5, // 2
  xs: baseUnit, // 4
  sm: baseUnit * 2, // 8
  md: baseUnit * 4, // 16
  lg: baseUnit * 6, // 24
  xl: baseUnit * 8, // 32
  xxl: baseUnit * 12, // 48
  xxxl: baseUnit * 16, // 64
});

/**
 * 🎯 SEMANTIC SPACING SYSTEM
 * Provides consistent, meaningful spacing decisions across all components
 * Use these instead of raw theme.spacing values for better consistency
 */
export const semanticSpacing = (theme: AppTheme) => ({
  // Touch and interaction targets
  touchTarget: 44, // Minimum accessible touch target (iOS/Android standard)
  buttonHeight: {
    compact: 36,
    standard: 44, 
    large: 52,
  },
  buttonPadding: {
    compact: { horizontal: theme.spacing.md, vertical: theme.spacing.xs },
    standard: { horizontal: theme.spacing.lg, vertical: theme.spacing.xs },
    large: { horizontal: theme.spacing.xl, vertical: theme.spacing.sm },
  },
  
  // Content spacing hierarchy
  elementGap: theme.spacing.xs, // 4px - Between related small elements (icons, labels)
  contentGap: theme.spacing.sm, // 8px - Between content blocks in same section  
  sectionGap: theme.spacing.md, // 16px - Between different sections
  majorGap: theme.spacing.lg, // 24px - Between major content areas
  
  // Container padding standards
  cardPadding: theme.spacing.md, // 16px - Standard card content padding
  modalPadding: theme.spacing.lg, // 24px - Modal and overlay content
  screenPadding: theme.spacing.page, // 16px - Screen edge padding (matches current)
  inputPadding: { horizontal: theme.spacing.md, vertical: theme.spacing.sm },
  
  // List and item spacing
  listItemPadding: theme.spacing.md, // 16px - Standard list item padding
  listItemHeight: 56, // Standard list item height for consistency
  listGap: theme.spacing.xs, // 4px - Gap between list items
  dividerMargin: theme.spacing.sm, // 8px - Margin around dividers
  
  // Form and input spacing
  fieldGap: theme.spacing.md, // 16px - Gap between form fields
  labelGap: theme.spacing.xs, // 4px - Gap between label and input
  helperGap: theme.spacing.xs, // 4px - Gap between input and helper text
  
  // Navigation and header spacing
  headerPadding: theme.spacing.md, // 16px - Header content padding
  tabPadding: { horizontal: theme.spacing.lg, vertical: theme.spacing.sm },
  
  // Icon and image spacing
  iconGap: theme.spacing.sm, // 8px - Gap between icon and text
  avatarGap: theme.spacing.md, // 16px - Gap around avatars
});

/**
 * 🎨 SIMPLIFIED SHADOW SYSTEM
 * Unified shadow strategy using neutral colors for clean appearance
 * Use these instead of mixing different shadow approaches
 */
export const unifiedShadows = (theme: AppTheme) => ({
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  
  subtle: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  
  card: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  
  floating: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  
  overlay: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
});

/**
 * 🎯 ENHANCED COMPONENT UTILITIES
 * Pre-built styling helpers for common component patterns
 */
export const componentStyles = (theme: AppTheme) => {
  const spacing = semanticSpacing(theme);
  const shadows = unifiedShadows(theme);
  
  return {
    // Button styling helpers
    button: {
      minHeight: spacing.touchTarget,
      borderRadius: theme.borderRadius.lg,
      primaryShadow: shadows.subtle,
    },
    
    // Card styling helpers  
    card: {
      borderRadius: theme.borderRadius.lg,
      padding: spacing.cardPadding,
      shadow: shadows.card,
      backgroundColor: theme.colors.surface,
    },
    
    // Input styling helpers
    input: {
      minHeight: spacing.touchTarget,
      borderRadius: theme.borderRadius.sm,
      padding: spacing.inputPadding,
      borderColor: theme.colors.outline,
      focusedBorderColor: theme.colors.primary,
      backgroundColor: theme.colors.inputBackground,
    },
    
    // List item styling helpers
    listItem: {
      minHeight: spacing.listItemHeight,
      padding: spacing.listItemPadding,
      borderRadius: theme.borderRadius.sm,
    },
    
    // Modal styling helpers
    modal: {
      borderRadius: theme.borderRadius.xl,
      padding: spacing.modalPadding,
      shadow: shadows.overlay,
      backgroundColor: theme.colors.surface,
    },
  };
};

/**
 * 🎨 ENHANCED TYPOGRAPHY SYSTEM
 * Provides semantic, accessible typography patterns for better consistency
 */
export const semanticTypography = (theme: AppTheme) => ({
  // UI Component Text Styles
  button: {
    primary: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      letterSpacing: 0.5,
    },
    secondary: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 18,
      letterSpacing: 0.25,
    },
    compact: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.25,
    },
  },
  
  // Input and Form Text Styles
  input: {
    label: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 18,
      letterSpacing: 0.1,
    },
    text: {
      fontFamily: theme.typography.fontFamilyRegular,
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
      letterSpacing: 0.15,
    },
    helper: {
      fontFamily: theme.typography.fontFamilyRegular,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.1,
    },
    error: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      letterSpacing: 0.1,
    },
  },
  
  // Card and Content Text Styles
  card: {
    title: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamilyRegular,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    body: {
      fontFamily: theme.typography.fontFamilyRegular,
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: 0.25,
    },
    caption: {
      fontFamily: theme.typography.fontFamilyRegular,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      letterSpacing: 0.4,
    },
  },
  
  // Navigation and Header Text Styles
  navigation: {
    header: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: 0.15,
    },
    tab: {
      fontFamily: theme.typography.fontFamilyMedium,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    menuItem: {
      fontFamily: theme.typography.fontFamilyRegular,
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
      letterSpacing: 0.15,
    },
  },
  
  // Content Hierarchy Styles
  content: {
    // Headlines
    headline: {
      large: {
        fontFamily: theme.typography.fontFamilyBold,
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 36,
        letterSpacing: 0,
      },
      medium: {
        fontFamily: theme.typography.fontFamilyMedium,
        fontSize: 24,
        fontWeight: '600' as const,
        lineHeight: 32,
        letterSpacing: 0,
      },
      small: {
        fontFamily: theme.typography.fontFamilyMedium,
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 28,
        letterSpacing: 0.15,
      },
    },
    
    // Body text
    body: {
      large: {
        fontFamily: theme.typography.fontFamilyRegular,
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
        letterSpacing: 0.15,
      },
      medium: {
        fontFamily: theme.typography.fontFamilyRegular,
        fontSize: 14,
        fontWeight: '400' as const,
        lineHeight: 20,
        letterSpacing: 0.25,
      },
      small: {
        fontFamily: theme.typography.fontFamilyRegular,
        fontSize: 12,
        fontWeight: '400' as const,
        lineHeight: 16,
        letterSpacing: 0.4,
      },
    },
  },
  
  // State-specific text styles
  states: {
    disabled: {
      opacity: 0.6,
    },
    error: {
      fontWeight: '500' as const,
    },
    success: {
      fontWeight: '500' as const,
    },
    emphasized: {
      fontWeight: '600' as const,
    },
  },
});

/**
 * 🎯 TEXT COLOR UTILITIES
 * Provides semantic color selections for better text hierarchy
 */
export const textColors = (theme: AppTheme) => ({
  // Primary text hierarchy
  primary: theme.colors.onSurface,
  secondary: theme.colors.onSurfaceVariant,
  tertiary: theme.colors.outline,
  
  // Interactive text colors
  interactive: theme.colors.primary,
  interactiveHover: theme.colors.primaryVariant,
  interactivePressed: theme.colors.primary,
  
  // State text colors
  success: theme.colors.success,
  warning: theme.colors.warning,
  error: theme.colors.error,
  info: theme.colors.info,
  
  // Contrast text colors
  onPrimary: theme.colors.onPrimary,
  onSecondary: theme.colors.onSecondary,
  onSurface: theme.colors.onSurface,
  
  // Specialized text colors
  disabled: theme.colors.disabled,
  placeholder: theme.colors.onSurfaceVariant,
  brand: theme.colors.primary,
  
  // Legacy support
  text: theme.colors.text,
  textSecondary: theme.colors.textSecondary,
});

/**
 * 🎨 ACCESSIBILITY HELPERS
 * Utilities for ensuring accessible contrast and sizing
 */
export const accessibilityHelpers = (theme: AppTheme) => ({
  // Minimum touch targets
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
  },
  
  // Focus ring styles
  focusRing: {
    borderWidth: 2,
    borderColor: theme.colors.focus || theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
  
  // High contrast text combinations
  highContrast: {
    onPrimary: {
      color: theme.colors.onPrimary,
      backgroundColor: theme.colors.primary,
    },
    onError: {
      color: theme.colors.onError,
      backgroundColor: theme.colors.error,
    },
    onSuccess: {
      color: theme.colors.onSuccess,
      backgroundColor: theme.colors.success,
    },
  },
  
  // Screen reader optimized styles
  screenReaderOnly: {
    position: 'absolute' as const,
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden' as const,
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    borderWidth: 0,
  },
});

/**
 * Typography utilities
 */
export const getTypographyStyle =
  (theme: AppTheme) =>
  (variant: keyof ThemeTypography): ThemeTypographyStyle =>
    theme.typography[variant] as ThemeTypographyStyle;

export const scaleFontSize = (baseSize: number, scale: number): number =>
  Math.round(baseSize * scale);

export const createTypographyScale = (baseSize = 16, ratio = 1.25) => {
  const scale = (steps: number) => Math.round(baseSize * Math.pow(ratio, steps));

  return {
    xs: scale(-2), // 10px
    sm: scale(-1), // 13px
    base: baseSize, // 16px
    lg: scale(1), // 20px
    xl: scale(2), // 25px
    '2xl': scale(3), // 31px
    '3xl': scale(4), // 39px
    '4xl': scale(5), // 49px
  };
};

/**
 * Enhanced animation utilities
 */
export const createAnimationConfig = () => ({
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  timing: {
    duration: 250, // Standard duration
    useNativeDriver: true,
  },
  stagger: (index: number, baseDelay = 50) => index * baseDelay,
  // Enhanced timing curves
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
});

/**
 * Elevation utilities
 */
export const createCustomElevation = (
  height: number,
  opacity = 0.12,
  radius: number = height * 2,
  elevation: number = height
) => ({
  shadowOffset: { width: 0, height },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

/**
 * Enhanced theme debugging utilities
 */
export const validateTheme = (theme: AppTheme): string[] => {
  const errors: string[] = [];

  // Check for missing required colors
  const requiredColors = [
    'primary',
    'onPrimary',
    'background',
    'onBackground',
    'surface',
    'onSurface',
  ];
  requiredColors.forEach((color) => {
    if (!theme.colors[color as keyof typeof theme.colors]) {
      errors.push(`Missing required color: ${color}`);
    }
  });

  // Check contrast ratios for critical color pairs
  const colorPairs = [
    ['primary', 'onPrimary'],
    ['background', 'onBackground'],
    ['surface', 'onSurface'],
  ];

  colorPairs.forEach(([bg, fg]) => {
    const bgColor = theme.colors[bg as keyof typeof theme.colors];
    const fgColor = theme.colors[fg as keyof typeof theme.colors];
    
    if (bgColor && fgColor) {
      const contrast = getContrastRatio(bgColor, fgColor);
      if (contrast < 4.5) {
        errors.push(`Low contrast ratio (${contrast.toFixed(2)}) between ${bg} and ${fg}`);
      }
    }
  });

  return errors;
};

/**
 * Theme generation utilities for consistent color schemes
 */
export const generateThemeVariants = (baseColors: { primary: string; background: string }) => {
  const { primary, background } = baseColors;
  
  return {
    primaryVariant: darken(primary, 0.1),
    primaryContainer: alpha(primary, 0.12),
    surfaceVariant: alpha(primary, 0.05),
    outline: alpha(primary, 0.2),
    outlineVariant: alpha(primary, 0.1),
    hover: alpha(primary, 0.04),
    pressed: alpha(primary, 0.08),
    focus: alpha(primary, 0.12),
    selected: alpha(primary, 0.08),
  };
};

/**
 * ENHANCED: Essential theme utilities with better features
 */
export const themeUtils = {
  colors: {
    alpha,
    lighten,
    darken,
    blend,
    getContrastRatio,
    hexToRgb,
    rgbToHex,
    getBorderColor,
    getSurfaceColor,
    getInteractionColor,
    generateThemeVariants,
    text: textColors, // New semantic text colors
  },
  spacing: {
    getSpacing,
    createSpacingScale,
    semantic: semanticSpacing, // New semantic spacing system
  },
  typography: {
    getTypographyStyle,
    scaleFontSize,
    createTypographyScale,
    semantic: semanticTypography, // New semantic typography system
  },
  animation: {
    createAnimationConfig,
  },
  elevation: {
    createCustomElevation,
    unified: unifiedShadows, // New unified shadow system
  },
  components: {
    styles: componentStyles, // New component styling helpers
  },
  accessibility: {
    helpers: accessibilityHelpers, // New accessibility utilities
  },
  debug: {
    validateTheme,
  },
};

/**
 * 🌟 NEUTRAL SHADOW HELPERS
 * Beautiful neutral shadow effects for clean, professional appearance
 * Creates elegant shadows without color tinting
 */

/**
 * Get neutral shadow (for all components)
 * Usage: ...getNeutralShadow.card(theme)
 */
export const getNeutralShadow = {
  /**
   * 🎪 Neutral Card Shadow - For content cards with clean shadows
   * Perfect for: Statement cards, feature cards, content blocks
   */
  card: (theme: AppTheme) => ({
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  }),

  /**
   * 🚀 Neutral Floating Shadow - For interactive floating elements  
   * Perfect for: Input cards, FABs, prominent action elements
   */
  floating: (theme: AppTheme) => ({
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  }),

  /**
   * 🏷️ Neutral Small Shadow - For smaller UI elements
   * Perfect for: Badges, buttons, small interactive elements
   */
  small: (theme: AppTheme) => ({
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  }),

  /**
   * 📦 Neutral Medium Shadow - For standard containers
   * Perfect for: Settings cards, list containers, grouped content
   */
  medium: (theme: AppTheme) => ({
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  }),

  /**
   * 🌟 Neutral Overlay Shadow - For modals and overlays
   * Perfect for: Modals, dropdowns, high-prominence overlays
   */
  overlay: (theme: AppTheme) => ({
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  }),
};

// Keep getPrimaryShadow for backward compatibility but make it use neutral shadows
export const getPrimaryShadow = getNeutralShadow;

/**
 * 🎨 COLORED SHADOW HELPERS
 * Apply themed colored shadows to any component
 */

/**
 * Get success-colored shadow (green themed shadows)
 */
export const getSuccessShadow = {
  card: (theme: AppTheme) => ({
    shadowColor: theme.colors.success,
    ...theme.elevation.card,
  }),
  floating: (theme: AppTheme) => ({
    shadowColor: theme.colors.success,
    ...theme.elevation.floating,
  }),
};

/**
 * Get error-colored shadow (red themed shadows)
 */
export const getErrorShadow = {
  card: (theme: AppTheme) => ({
    shadowColor: theme.colors.error,
    ...theme.elevation.card,
  }),
  floating: (theme: AppTheme) => ({
    shadowColor: theme.colors.error,
    ...theme.elevation.floating,
  }),
};

/**
 * Get warning-colored shadow (amber themed shadows)
 */
export const getWarningShadow = {
  card: (theme: AppTheme) => ({
    shadowColor: theme.colors.warning,
    ...theme.elevation.card,
  }),
  floating: (theme: AppTheme) => ({
    shadowColor: theme.colors.warning,
    ...theme.elevation.floating,
  }),
};

// REMOVED: Complex responsive utilities, theme utils interface, semantic helpers
