// Simplified Types - Removing over-engineering
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

// Core color system - enhanced with better hierarchy
export interface ThemeColors {
  // Brand colors
  primary: string;
  onPrimary: string;
  primaryVariant: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Accent colors
  accent: string;
  onAccent: string;
  accentContainer: string;
  onAccentContainer: string;

  // Surfaces - enhanced hierarchy
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceTint: string;
  inverseSurface: string;
  inverseOnSurface: string;

  // Enhanced surface levels for better hierarchy
  surfaceElevated?: string; // Optional for elevated surfaces
  surfaceContainer?: string; // Optional for container surfaces
  surfaceBright?: string; // Optional for bright surfaces
  surfaceDim?: string; // Optional for dimmed surfaces

  // Content colors - enhanced for better visibility
  outline: string;
  outlineVariant: string;
  scrim: string;

  // Enhanced border system
  borderLight?: string; // Optional for light borders
  borderMedium?: string; // Optional for medium borders
  borderStrong?: string; // Optional for strong borders

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
  hover: string;
  pressed: string;
  focus: string;
  selected: string;

  // Enhanced interaction states
  hoverStrong?: string; // Optional for stronger hover effects
  focusRing?: string; // Optional for focus rings
  activeState?: string; // Optional for active states

  // Gradient colors
  gradientStart: string;
  gradientEnd: string;

  // Legacy support (keeping for compatibility)
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

// Typography - keeping existing structure
export interface ThemeTypographyStyle {
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
  textDecorationLine?: 'none' | 'underline' | 'line-through';
}

export interface ThemeTypography {
  // Font families
  fontFamilyRegular: string;
  fontFamilyMedium: string;
  fontFamilyBold: string;
  fontFamilyMono: string;

  // Display styles
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

// Spacing - keeping existing structure
export interface ThemeSpacing {
  none: number;
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;

  // Semantic spacing
  component: number;
  section: number;
  page: number;
  content: number;
  edge: number;

  // Legacy support
  small: number;
  medium: number;
  large: number;
}

// Border radius - keeping existing structure
export interface ThemeBorderRadius {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  full: number;

  // Legacy support
  small: number;
  medium: number;
  large: number;
}

// Elevation system - keeping existing structure
export interface ThemeElevation {
  none: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
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
  // Enhanced shadows for modern UI components
  card: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  floating: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  overlay: {
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export type ThemeName = 'light' | 'dark';

export interface AppTheme {
  name: 'light' | 'dark';
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  elevation: ThemeElevation;
}

export interface ThemeContextType {
  theme: AppTheme;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

// Utility types for easy access
export type ThemeColorKey = keyof ThemeColors;
export type ThemeSpacingKey = keyof ThemeSpacing;
export type ThemeRadiusKey = keyof ThemeBorderRadius;
export type ThemeTypographyKey = keyof ThemeTypography;
