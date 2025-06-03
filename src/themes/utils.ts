import { Dimensions } from 'react-native';

import {
  AppTheme,
  ThemeBreakpoints,
  ThemeTypography,
  ThemeTypographyStyle,
  ThemeUtils,
} from './types';

/**
 * Color manipulation utilities
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
  if (!rgb) return color;

  const factor = 1 + Math.max(0, Math.min(1, amount));
  return rgbToHex(
    Math.min(255, Math.round(rgb.r * factor)),
    Math.min(255, Math.round(rgb.g * factor)),
    Math.min(255, Math.round(rgb.b * factor))
  );
};

export const darken = (color: string, amount: number): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

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

  if (!rgb1 || !rgb2) return color1;

  const r = Math.round(rgb1.r * (1 - ratio) + rgb2.r * ratio);
  const g = Math.round(rgb1.g * (1 - ratio) + rgb2.g * ratio);
  const b = Math.round(rgb1.b * (1 - ratio) + rgb2.b * ratio);

  return rgbToHex(r, g, b);
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    const rgb = hexToRgb(color);
    if (!rgb) return 0;

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
 * Responsive utilities
 */
export const getResponsiveValue = <T>(
  values: Partial<Record<keyof ThemeBreakpoints, T>>,
  screenWidth: number
): T => {
  const breakpointKeys = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'] as (keyof ThemeBreakpoints)[];
  const breakpoints: ThemeBreakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  };

  // Find the largest breakpoint that fits
  for (const key of breakpointKeys) {
    if (screenWidth >= breakpoints[key] && values[key] !== undefined) {
      return values[key]!;
    }
  }

  // Fallback to smallest value
  return values.xs || values[breakpointKeys[breakpointKeys.length - 1]]!;
};

export const useResponsiveValue = <T>(values: Partial<Record<keyof ThemeBreakpoints, T>>): T => {
  const { width } = Dimensions.get('window');
  return getResponsiveValue(values, width);
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
 * Animation utilities
 */
export const createAnimationConfig = (theme: AppTheme) => ({
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  timing: {
    duration: theme.animations.duration.normal,
    useNativeDriver: true,
  },
  stagger: (index: number, baseDelay = 50) => index * baseDelay,
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
 * Theme debugging utilities
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
    const contrast = getContrastRatio(
      theme.colors[bg as keyof typeof theme.colors],
      theme.colors[fg as keyof typeof theme.colors]
    );
    if (contrast < 4.5) {
      errors.push(`Low contrast ratio (${contrast.toFixed(2)}) between ${bg} and ${fg}`);
    }
  });

  return errors;
};

/**
 * Create the theme utils object
 */
export const createThemeUtils = (theme: AppTheme): ThemeUtils => ({
  alpha,
  lighten,
  darken,
  getResponsiveValue: (values, screenWidth) => getResponsiveValue(values, screenWidth),
  getSpacing: getSpacing(theme),
  getTypographyStyle: getTypographyStyle(theme),
});

/**
 * Advanced theme utilities
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
  },
  responsive: {
    getResponsiveValue,
    useResponsiveValue,
  },
  spacing: {
    getSpacing,
    createSpacingScale,
  },
  typography: {
    getTypographyStyle,
    scaleFontSize,
    createTypographyScale,
  },
  animation: {
    createAnimationConfig,
  },
  elevation: {
    createCustomElevation,
  },
  debug: {
    validateTheme,
  },
};
