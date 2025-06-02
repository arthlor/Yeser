// Enhanced Types
export type ColorMode = 'light' | 'dark' | 'auto';
export type FontWeight =
  | 'normal'
  | 'bold'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900';

// Enhanced color system with semantic states
export interface ThemeColors {
  // Brand colors
  primary: string;
  onPrimary: string;
  primaryVariant: string;
  primaryContainer: string; // Subtle primary background
  onPrimaryContainer: string;

  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  tertiary: string; // Third brand color
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Accent colors
  accent: string;
  onAccent: string;
  accentContainer: string;
  onAccentContainer: string;

  // Surfaces
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string; // Subtle surface variation
  onSurfaceVariant: string;
  surfaceTint: string; // For elevated surfaces
  inverseSurface: string; // Opposite theme surface
  inverseOnSurface: string;

  // Content colors
  outline: string; // Borders, dividers
  outlineVariant: string; // Subtle borders
  scrim: string; // Overlay/backdrop

  // State colors with containers
  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;

  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;

  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  info: string;
  onInfo: string;
  infoContainer: string;
  onInfoContainer: string;

  // Interaction states
  disabled: string;
  onDisabled: string;

  // Legacy support
  text: string;
  textSecondary: string;
  border: string;
  inputBackground: string;
  inputText: string;
  danger: string;
  onDanger: string;
  shadow: string;
  surfaceDisabled: string;
}

// Enhanced typography with more semantic styles
export interface ThemeTypographyStyle {
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
}

export interface ThemeTypography {
  // Font families
  fontFamilyRegular: string;
  fontFamilyMedium: string;
  fontFamilyBold: string;
  fontFamilyMono: string; // For code/monospace

  // Display styles (large headlines)
  displayLarge: ThemeTypographyStyle;
  displayMedium: ThemeTypographyStyle;
  displaySmall: ThemeTypographyStyle;

  // Headlines
  headlineLarge: ThemeTypographyStyle;
  headlineMedium: ThemeTypographyStyle;
  headlineSmall: ThemeTypographyStyle;

  // Titles
  titleLarge: ThemeTypographyStyle;
  titleMedium: ThemeTypographyStyle;
  titleSmall: ThemeTypographyStyle;

  // Body text
  bodyLarge: ThemeTypographyStyle;
  bodyMedium: ThemeTypographyStyle;
  bodySmall: ThemeTypographyStyle;

  // Labels
  labelLarge: ThemeTypographyStyle;
  labelMedium: ThemeTypographyStyle;
  labelSmall: ThemeTypographyStyle;

  // Legacy support
  h1: ThemeTypographyStyle;
  h2: ThemeTypographyStyle;
  h3: ThemeTypographyStyle;
  body1: ThemeTypographyStyle;
  body2: ThemeTypographyStyle;
  button: ThemeTypographyStyle;
  caption: ThemeTypographyStyle;
  overline: ThemeTypographyStyle;
  subtitle1: ThemeTypographyStyle;
  label: ThemeTypographyStyle;
}

// Enhanced spacing with more granular control
export interface ThemeSpacing {
  none: number; // 0
  xxs: number; // 2
  xs: number; // 4
  sm: number; // 8
  md: number; // 16
  lg: number; // 24
  xl: number; // 32
  xxl: number; // 48
  xxxl: number; // 64

  // Semantic spacing
  component: number; // Standard component padding
  section: number; // Section spacing
  page: number; // Page margins

  // Legacy support
  small: number;
  medium: number;
  large: number;
}

// Enhanced border radius
export interface ThemeBorderRadius {
  none: number;
  xs: number; // 2
  sm: number; // 4
  md: number; // 8
  lg: number; // 12
  xl: number; // 16
  xxl: number; // 24
  full: number; // 9999

  // Legacy support
  small: number;
  medium: number;
  large: number;
}

// New: Elevation system for shadows/depth
export interface ThemeElevation {
  none: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number; // Android
  };
  xs: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  sm: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  md: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  lg: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  xl: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

// New: Animation/transition system
export interface ThemeAnimations {
  duration: {
    fast: number; // 150ms
    normal: number; // 250ms
    slow: number; // 350ms
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

// New: Breakpoints for responsive design
export interface ThemeBreakpoints {
  xs: number; // 0
  sm: number; // 576
  md: number; // 768
  lg: number; // 992
  xl: number; // 1200
  xxl: number; // 1400
}

// Enhanced main theme interface
export type ThemeName = 'light' | 'dark';

export interface AppTheme {
  name: 'light' | 'dark';
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  elevation: ThemeElevation;
  animations: ThemeAnimations;
  breakpoints: ThemeBreakpoints;
}

// Theme utility functions
export interface ThemeUtils {
  // Color utilities
  alpha: (color: string, opacity: number) => string;
  lighten: (color: string, amount: number) => string;
  darken: (color: string, amount: number) => string;

  // Responsive utilities
  getResponsiveValue: <T>(
    values: Partial<Record<keyof ThemeBreakpoints, T>>,
    screenWidth: number
  ) => T;

  // Spacing utilities
  getSpacing: (multiplier: number) => number;

  // Typography utilities
  getTypographyStyle: (variant: keyof ThemeTypography) => ThemeTypographyStyle;
}

// Theme context type for React
export interface ThemeContextType {
  theme: AppTheme;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
  utils: ThemeUtils;
}

// Component variant system
export interface ComponentVariants {
  button: {
    primary: object;
    secondary: object;
    tertiary: object;
    destructive: object;
    ghost: object;
  };
  input: {
    default: object;
    error: object;
    success: object;
  };
  card: {
    elevated: object;
    outlined: object;
    filled: object;
  };
  // Add more component variants as needed
}

export interface EnhancedAppTheme extends AppTheme {
  components: ComponentVariants;
}

// Example usage types
export type ThemeColorKey = keyof ThemeColors;
export type ThemeSpacingKey = keyof ThemeSpacing;
export type ThemeRadiusKey = keyof ThemeBorderRadius;
