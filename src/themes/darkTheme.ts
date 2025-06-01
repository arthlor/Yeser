import {
  ComponentVariants,
  EnhancedAppTheme,
  ThemeAnimations,
  ThemeBorderRadius,
  ThemeBreakpoints,
  ThemeColors,
  ThemeElevation,
  ThemeSpacing,
  ThemeTypography,
} from './types';

// Enhanced Dark Theme Implementation
const enhancedDarkColors: ThemeColors = {
  // Brand colors
  primary: '#66C5B9', // Brighter Muted Teal
  onPrimary: '#00382F', // Dark Teal for text on primary
  primaryVariant: '#85D4C9', // Lighter Muted Teal (can be used for hover/focus)
  primaryContainer: '#005043', // Dark Teal container
  onPrimaryContainer: '#97F0E1', // Light Teal text on primary container

  secondary: '#B8BEC0', // Lightened Grey for dark theme secondary
  onSecondary: '#283336', // Dark Grey for text on secondary
  secondaryContainer: '#3E494C', // Dark Grey container
  onSecondaryContainer: '#D4D8DA', // Light Grey text on secondary container

  tertiary: '#D4B283', // Muted Gold/Brown
  onTertiary: '#3C2E1A', // Dark Brown for text on tertiary
  tertiaryContainer: '#524023', // Dark Gold/Brown container
  onTertiaryContainer: '#FDE0B9', // Light Gold/Brown text on tertiary container

  accent: '#F8C9B0', // Light Peach
  onAccent: '#4A352A', // Dark Warm Brown for text on accent
  accentContainer: '#614030', // Dark Peach/Brown container
  onAccentContainer: '#FFDBC9', // Light Peach text on accent container

  // Surfaces
  background: '#1A1B1E', // Very Dark Cool Grey (almost black)
  onBackground: '#E3E3E6', // Light Grey for text
  surface: '#252A2D', // Dark Cool Grey (slightly lighter than background)
  onSurface: '#E3E3E6', // Light Grey for text on surface
  surfaceVariant: '#3A3F42', // Slightly different dark grey
  onSurfaceVariant: '#B8BFC2', // Lighter grey for text on surfaceVariant
  surfaceTint: '#66C5B9', // Primary color for tinting
  inverseSurface: '#E3E3E6', // Light Grey for inverse surface
  inverseOnSurface: '#1A1B1E', // Dark Grey for text on inverse surface

  // Content colors
  outline: '#8A9093', // Medium Grey for outlines
  outlineVariant: '#3E4549', // Darker Grey for outline variants (current border)
  scrim: 'rgba(0, 0, 0, 0.6)', // Darker scrim for dark mode

  // State colors with containers
  success: '#7EDC82', // Brighter Green
  onSuccess: '#00390A', // Dark Green for text on success
  successContainer: '#005214', // Darker Green container
  onSuccessContainer: '#9AF59C', // Light Green text on success container

  warning: '#FFB84D', // Brighter Orange
  onWarning: '#452B00', // Dark Orange for text on warning
  warningContainer: '#663F00', // Darker Orange container
  onWarningContainer: '#FFDDB5', // Light Orange text on warning container

  error: '#F17C6F', // Brighter Red (current error)
  onError: '#5B0C0C', // Dark Red for text on error
  errorContainer: '#7A1B1B', // Darker Red container
  onErrorContainer: '#FFDAD6', // Light Red text on error container

  info: '#6AB7FF', // Brighter Blue
  onInfo: '#002F5E', // Dark Blue for text on info
  infoContainer: '#004680', // Darker Blue container
  onInfoContainer: '#C3E7FF', // Light Blue text on info container

  // Interaction states
  disabled: '#5E686D', // Medium-Dark Grey (current disabled)
  onDisabled: '#A8B0B4', // Medium-Light Grey for text on disabled (current textSecondary)

  // Legacy support (map from old theme where possible)
  text: '#E3E3E6', // Main text color (Light Grey)
  textSecondary: '#A8B0B4', // Medium-Light Grey
  border: '#3E4549', // Dark Grey
  inputBackground: '#2C3135', // Dark Grey (for inputs)
  inputText: '#E3E3E6', // Light Grey
  danger: '#E57373', // Softer Bright Red
  onDanger: '#430000', // Dark Red for text on danger
  shadow: 'rgba(0, 0, 0, 0.5)', // Darker shadow for dark mode
  surfaceDisabled: '#2C2C2C', // Dark gray for skeleton/disabled surfaces
};

const enhancedTypography: ThemeTypography = {
  // Font families (assuming same as light theme, adjust if specific dark mode fonts are used)
  fontFamilyRegular: 'Inter-Regular',
  fontFamilyMedium: 'Inter-Medium',
  fontFamilyBold: 'Inter-Bold',
  fontFamilyMono: 'JetBrainsMono-Regular',

  // Display styles
  displayLarge: { fontSize: 57, fontWeight: '400', lineHeight: 64 },
  displayMedium: { fontSize: 45, fontWeight: '400', lineHeight: 52 },
  displaySmall: { fontSize: 36, fontWeight: '400', lineHeight: 44 },

  // Headlines
  headlineLarge: { fontSize: 32, fontWeight: '600', lineHeight: 40 },
  headlineMedium: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  headlineSmall: { fontSize: 24, fontWeight: '600', lineHeight: 32 },

  // Titles
  titleLarge: { fontSize: 22, fontWeight: '500', lineHeight: 28 },
  titleMedium: { fontSize: 18, fontWeight: '500', lineHeight: 24 },
  titleSmall: { fontSize: 16, fontWeight: '500', lineHeight: 20 },

  // Body text
  bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16 },

  // Labels
  labelLarge: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Legacy support
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: 'bold' },
  body1: { fontSize: 16 },
  body2: { fontSize: 14 },
  button: { fontSize: 16, fontWeight: '500' },
  caption: { fontSize: 12 },
  overline: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  subtitle1: { fontSize: 18, fontWeight: '500' },
  label: { fontSize: 14, fontWeight: '500' },
};

const enhancedSpacing: ThemeSpacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Semantic spacing
  component: 16,
  section: 32,
  page: 24,

  // Legacy support
  small: 8,
  medium: 16,
  large: 24,
};

const enhancedBorderRadius: ThemeBorderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,

  // Legacy support
  small: 4,
  medium: 8,
  large: 16,
};

// Elevation for Dark Theme (shadows are often more subtle or use a light glow)
// For simplicity, using black shadows with adjusted opacity.
const darkElevation: ThemeElevation = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, // Slightly higher opacity for visibility
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
};

const animations: ThemeAnimations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

const breakpoints: ThemeBreakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

const componentVariants: ComponentVariants = {
  button: {
    primary: {
      backgroundColor: enhancedDarkColors.primary,
      color: enhancedDarkColors.onPrimary,
    },
    secondary: {
      backgroundColor: enhancedDarkColors.secondary,
      color: enhancedDarkColors.onSecondary,
    },
    tertiary: {
      backgroundColor: 'transparent',
      color: enhancedDarkColors.primary,
      borderWidth: 1,
      borderColor: enhancedDarkColors.primary,
    },
    destructive: {
      backgroundColor: enhancedDarkColors.error,
      color: enhancedDarkColors.onError,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: enhancedDarkColors.primary,
    },
  },
  input: {
    default: {
      backgroundColor: enhancedDarkColors.inputBackground,
      borderColor: enhancedDarkColors.outline,
      color: enhancedDarkColors.inputText,
    },
    error: {
      backgroundColor: enhancedDarkColors.inputBackground,
      borderColor: enhancedDarkColors.error,
      color: enhancedDarkColors.inputText,
    },
    success: {
      backgroundColor: enhancedDarkColors.inputBackground,
      borderColor: enhancedDarkColors.success,
      color: enhancedDarkColors.inputText,
    },
  },
  card: {
    elevated: {
      backgroundColor: enhancedDarkColors.surface,
      ...darkElevation.sm, // Use dark theme elevation
    },
    outlined: {
      backgroundColor: enhancedDarkColors.surface,
      borderWidth: 1,
      borderColor: enhancedDarkColors.outline,
    },
    filled: {
      backgroundColor: enhancedDarkColors.surfaceVariant,
    },
  },
};

export const darkTheme: EnhancedAppTheme = {
  name: 'dark',
  colors: enhancedDarkColors,
  typography: enhancedTypography,
  spacing: enhancedSpacing,
  borderRadius: enhancedBorderRadius,
  elevation: darkElevation,
  animations,
  breakpoints,
  components: componentVariants,
};
