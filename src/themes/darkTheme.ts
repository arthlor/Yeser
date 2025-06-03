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
  primary: '#BB86FC',
  onPrimary: '#000000',
  primaryVariant: '#985EFF',
  primaryContainer: '#4C2C8A',
  onPrimaryContainer: '#E5D4FF',

  secondary: '#03DAC6',
  onSecondary: '#000000',
  secondaryContainer: '#2C5B5A',
  onSecondaryContainer: '#A7F2E8',

  tertiary: '#FF6B6B',
  onTertiary: '#000000',
  tertiaryContainer: '#8B1E3F',
  onTertiaryContainer: '#FFCCD2',

  // Accent colors
  accent: '#FFD93D',
  onAccent: '#1A1A1A',
  accentContainer: '#B8860B',
  onAccentContainer: '#FFF8DC',

  // Surfaces
  background: '#121212',
  onBackground: '#E1E1E1',
  surface: '#1E1E1E',
  onSurface: '#E1E1E1',
  surfaceVariant: '#2A2A2A',
  onSurfaceVariant: '#C7C7C7',
  surfaceTint: '#BB86FC',
  inverseSurface: '#E1E1E1',
  inverseOnSurface: '#121212',

  // Content colors
  outline: '#9B9B9B',
  outlineVariant: '#4A4A4A',
  scrim: '#000000',

  // State colors with containers
  success: '#00C851',
  onSuccess: '#003D1A',
  successContainer: '#1B5E20',
  onSuccessContainer: '#B8E6C1',

  warning: '#FFD54F',
  onWarning: '#332900',
  warningContainer: '#8D6E63',
  onWarningContainer: '#FFF8E1',

  error: '#CF6679',
  onError: '#690005',
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',

  info: '#2196F3',
  onInfo: '#0D47A1',
  infoContainer: '#1565C0',
  onInfoContainer: '#E3F2FD',

  // Interaction states
  disabled: '#6A6A6A',
  onDisabled: '#2A2A2A',

  // Advanced interaction states
  hover: '#2A2A2A',
  pressed: '#404040',
  focus: '#505050',
  selected: '#3A3A3A',

  // Gradient colors
  gradientStart: '#BB86FC',
  gradientEnd: '#03DAC6',

  // Legacy support
  text: '#E1E1E1',
  textSecondary: '#B0B0B0',
  border: '#4A4A4A',
  inputBackground: '#2A2A2A',
  inputText: '#E1E1E1',
  danger: '#CF6679',
  onDanger: '#690005',
  shadow: '#000000',
  surfaceDisabled: '#1A1A1A',
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
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    easeInBack: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    easeOutBack: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    easeInOutBack: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  spring: {
    gentle: { tension: 120, friction: 14 },
    wobbly: { tension: 180, friction: 12 },
    stiff: { tension: 200, friction: 10 },
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
    outlined: {
      backgroundColor: 'transparent',
      color: enhancedDarkColors.primary,
      borderWidth: 1,
      borderColor: enhancedDarkColors.outline,
    },
    text: {
      backgroundColor: 'transparent',
      color: enhancedDarkColors.primary,
    },
    floating: {
      backgroundColor: enhancedDarkColors.primaryContainer,
      color: enhancedDarkColors.onPrimaryContainer,
      ...darkElevation.lg,
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
    warning: {
      backgroundColor: enhancedDarkColors.inputBackground,
      borderColor: enhancedDarkColors.warning,
      color: enhancedDarkColors.inputText,
    },
    disabled: {
      backgroundColor: enhancedDarkColors.surfaceDisabled,
      borderColor: enhancedDarkColors.disabled,
      color: enhancedDarkColors.onDisabled,
    },
    focused: {
      backgroundColor: enhancedDarkColors.inputBackground,
      borderColor: enhancedDarkColors.primary,
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
    interactive: {
      backgroundColor: enhancedDarkColors.surfaceVariant,
      borderWidth: 1,
      borderColor: enhancedDarkColors.outline,
    },
    featured: {
      backgroundColor: enhancedDarkColors.primaryContainer,
      borderWidth: 1,
      borderColor: enhancedDarkColors.primary,
    },
  },
  chip: {
    filled: {},
    outlined: {},
    selected: {},
    disabled: {},
  },
  avatar: {
    small: {},
    medium: {},
    large: {},
    circular: {},
    rounded: {},
  },
  badge: {
    primary: {},
    secondary: {},
    success: {},
    warning: {},
    error: {},
    info: {},
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
