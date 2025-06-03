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

// Enhanced Light Theme Implementation
const enhancedLightColors: ThemeColors = {
  // Brand colors
  primary: '#5DB0A5',
  onPrimary: '#FFFFFF',
  primaryVariant: '#4A8C80',
  primaryContainer: '#E8F4F2',
  onPrimaryContainer: '#1A4A42',

  secondary: '#A8A39D',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#F0EDE9',
  onSecondaryContainer: '#3D3A37',

  tertiary: '#8B7355',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#F2E6D3',
  onTertiaryContainer: '#2D2419',

  accent: '#F5B89A',
  onAccent: '#6B4F43',
  accentContainer: '#FDF0EA',
  onAccentContainer: '#3A2B21',

  // Surfaces
  background: '#FEFEFE',
  onBackground: '#1A1B1E',
  surface: '#FFFFFF',
  onSurface: '#1A1B1E',
  surfaceVariant: '#F7F7F7',
  onSurfaceVariant: '#464749',
  surfaceTint: '#5DB0A5',
  inverseSurface: '#2F3033',
  inverseOnSurface: '#F1F0F4',

  // Content colors
  outline: '#DDE2E5',
  outlineVariant: '#F0F0F0',
  scrim: 'rgba(0, 0, 0, 0.5)',

  // State colors with containers
  success: '#4CAF50',
  onSuccess: '#FFFFFF',
  successContainer: '#E8F5E8',
  onSuccessContainer: '#1B4B1D',

  warning: '#FF9800',
  onWarning: '#FFFFFF',
  warningContainer: '#FFF3E0',
  onWarningContainer: '#B8680D',

  error: '#E74C3C',
  onError: '#FFFFFF',
  errorContainer: '#FFEBEE',
  onErrorContainer: '#C62828',

  info: '#2196F3',
  onInfo: '#FFFFFF',
  infoContainer: '#E3F2FD',
  onInfoContainer: '#0D47A1',

  // Interaction states
  disabled: '#BDC3C7',
  onDisabled: '#7F8C8D',

  // Advanced interaction states
  hover: 'rgba(93, 176, 165, 0.08)',
  pressed: 'rgba(93, 176, 165, 0.12)',
  focus: 'rgba(93, 176, 165, 0.12)',
  selected: 'rgba(93, 176, 165, 0.16)',

  // Gradient colors
  gradientStart: '#5DB0A5',
  gradientEnd: '#4A8C80',

  // Legacy support
  text: '#1A1B1E',
  textSecondary: '#7F8C8D',
  border: '#DDE2E5',
  inputBackground: '#FFFFFF',
  inputText: '#1A1B1E',
  danger: '#C0392B',
  onDanger: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.1)',
  surfaceDisabled: '#F0F0F0',
};

const enhancedTypography: ThemeTypography = {
  // Font families
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

const elevation: ThemeElevation = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
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
    stiff: { tension: 210, friction: 20 },
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
      backgroundColor: '#5DB0A5',
      color: '#FFFFFF',
    },
    secondary: {
      backgroundColor: '#A8A39D',
      color: '#FFFFFF',
    },
    tertiary: {
      backgroundColor: 'transparent',
      color: '#5DB0A5',
      borderWidth: 1,
      borderColor: '#5DB0A5',
    },
    destructive: {
      backgroundColor: '#E74C3C',
      color: '#FFFFFF',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#5DB0A5',
    },
    outlined: {
      backgroundColor: 'transparent',
      color: '#5DB0A5',
      borderWidth: 1,
      borderColor: '#DDE2E5',
    },
    text: {
      backgroundColor: 'transparent',
      color: '#5DB0A5',
    },
    floating: {
      backgroundColor: '#5DB0A5',
      color: '#FFFFFF',
      borderRadius: 28,
      elevation: 6,
    },
  },
  input: {
    default: {
      backgroundColor: '#FFFFFF',
      borderColor: '#DDE2E5',
      color: '#1A1B1E',
    },
    error: {
      backgroundColor: '#FFFFFF',
      borderColor: '#E74C3C',
      color: '#1A1B1E',
    },
    success: {
      backgroundColor: '#FFFFFF',
      borderColor: '#4CAF50',
      color: '#1A1B1E',
    },
    warning: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FF9800',
      color: '#1A1B1E',
    },
    disabled: {
      backgroundColor: '#F0F0F0',
      borderColor: '#BDC3C7',
      color: '#7F8C8D',
    },
    focused: {
      backgroundColor: '#FFFFFF',
      borderColor: '#5DB0A5',
      color: '#1A1B1E',
    },
  },
  card: {
    elevated: {
      backgroundColor: '#FFFFFF',
      ...elevation.sm,
    },
    outlined: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#DDE2E5',
    },
    filled: {
      backgroundColor: '#F7F7F7',
    },
    interactive: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#DDE2E5',
      ...elevation.xs,
    },
    featured: {
      backgroundColor: '#E8F4F2',
      borderWidth: 1,
      borderColor: '#5DB0A5',
      ...elevation.md,
    },
  },
  chip: {
    filled: {
      backgroundColor: '#5DB0A5',
      color: '#FFFFFF',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: '#DDE2E5',
      color: '#1A1B1E',
    },
    selected: {
      backgroundColor: '#E8F4F2',
      color: '#1A4A42',
    },
    disabled: {
      backgroundColor: '#F0F0F0',
      color: '#7F8C8D',
    },
  },
  avatar: {
    small: {
      width: 32,
      height: 32,
    },
    medium: {
      width: 48,
      height: 48,
    },
    large: {
      width: 64,
      height: 64,
    },
    circular: {
      borderRadius: 999,
    },
    rounded: {
      borderRadius: 8,
    },
  },
  badge: {
    primary: {
      backgroundColor: '#5DB0A5',
      color: '#FFFFFF',
    },
    secondary: {
      backgroundColor: '#A8A39D',
      color: '#FFFFFF',
    },
    success: {
      backgroundColor: '#4CAF50',
      color: '#FFFFFF',
    },
    warning: {
      backgroundColor: '#FF9800',
      color: '#FFFFFF',
    },
    error: {
      backgroundColor: '#E74C3C',
      color: '#FFFFFF',
    },
    info: {
      backgroundColor: '#2196F3',
      color: '#FFFFFF',
    },
  },
};

export const lightTheme: EnhancedAppTheme = {
  name: 'light',
  colors: enhancedLightColors,
  typography: enhancedTypography,
  spacing: enhancedSpacing,
  borderRadius: enhancedBorderRadius,
  elevation,
  animations,
  breakpoints,
  components: componentVariants,
};
