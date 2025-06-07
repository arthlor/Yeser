import {
  AppTheme,
  ThemeBorderRadius,
  ThemeColors,
  ThemeElevation,
  ThemeSpacing,
  ThemeTypography,
} from './types';

// Enhanced Dark Theme with Better Button Colors
const enhancedDarkColors: ThemeColors = {
  // Brand colors - More sophisticated for dark mode buttons
  primary: '#2DD4BF', // More muted teal-green, less overwhelming
  onPrimary: '#0F172A', // Dark text on light buttons
  primaryVariant: '#14B8A6',
  primaryContainer: '#164E63', // Darker container for surface-based buttons
  onPrimaryContainer: '#67E8F9', // Light text on dark containers

  secondary: '#A78BFA', // Softer purple secondary
  onSecondary: '#1E1B4B',
  secondaryContainer: '#312E81',
  onSecondaryContainer: '#C4B5FD',

  tertiary: '#60A5FA', // Softer blue tertiary
  onTertiary: '#1E3A8A',
  tertiaryContainer: '#1E40AF',
  onTertiaryContainer: '#DBEAFE',

  // Accent colors
  accent: '#FBBF24', // Warm amber accent
  onAccent: '#92400E',
  accentContainer: '#92400E',
  onAccentContainer: '#FEF3C7',

  // Surfaces - Enhanced for better button treatment
  background: '#0F172A', // Deep slate background
  onBackground: '#F1F5F9', // Light text
  surface: '#1E293B', // Elevated surface for buttons
  onSurface: '#F1F5F9',
  surfaceVariant: '#334155', // More distinct variant for button containers
  onSurfaceVariant: '#CBD5E1', // Better contrast
  surfaceTint: '#2DD4BF',
  inverseSurface: '#F1F5F9',
  inverseOnSurface: '#0F172A',

  // Enhanced surface levels for button treatment
  surfaceElevated: '#374151', // Elevated surface for primary buttons
  surfaceContainer: '#475569', // Container surface for secondary actions
  surfaceBright: '#475569', // Bright surface variant
  surfaceDim: '#1E293B', // Dimmed surface

  // Content colors - More visible in dark mode
  outline: '#64748B', // More visible outline for outline buttons
  outlineVariant: '#475569', // Secondary outline
  scrim: 'rgba(0, 0, 0, 0.8)',

  // Enhanced border system for dark mode
  borderLight: '#374151', // Light borders
  borderMedium: '#475569', // Medium borders  
  borderStrong: '#64748B', // Strong borders

  // State colors with containers - More muted for dark mode
  success: '#10B981', // Muted green success
  onSuccess: '#FFFFFF',
  successContainer: '#065F46',
  onSuccessContainer: '#A7F3D0',

  warning: '#F59E0B', // Amber warning
  onWarning: '#FFFFFF',
  warningContainer: '#92400E',
  onWarningContainer: '#FEF3C7',

  error: '#F87171', // Softer red for dark mode
  onError: '#FFFFFF',
  errorContainer: '#7F1D1D',
  onErrorContainer: '#FEE2E2',

  info: '#60A5FA', // Softer blue info
  onInfo: '#FFFFFF',
  infoContainer: '#1E40AF',
  onInfoContainer: '#DBEAFE',

  // Interaction states
  disabled: '#64748B',
  onDisabled: '#94A3B8',

  // Advanced interaction states - Better for dark mode buttons
  hover: 'rgba(45, 212, 191, 0.08)', // Subtle teal hover
  pressed: 'rgba(45, 212, 191, 0.12)',
  focus: 'rgba(45, 212, 191, 0.16)',
  selected: 'rgba(45, 212, 191, 0.12)',
  
  // Enhanced interaction states for better button feedback
  hoverStrong: 'rgba(45, 212, 191, 0.15)', // Stronger hover for primary buttons
  focusRing: '#2DD4BF', // Focus ring color
  activeState: 'rgba(45, 212, 191, 0.20)', // Active state for pressed buttons

  // Gradient colors - More subtle for dark mode
  gradientStart: '#2DD4BF',
  gradientEnd: '#14B8A6',

  // Legacy support - updated for better dark theme
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  border: '#64748B', // More visible border
  inputBackground: '#374151', // Better input background
  inputText: '#F1F5F9',
  danger: '#F87171',
  onDanger: '#FFFFFF',
  shadow: 'rgba(0, 0, 0, 0.5)',
  surfaceDisabled: '#374151', // Better disabled surface
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

  // Headlines - Enhanced for better hierarchy
  headlineLarge: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.5 },
  headlineMedium: { fontSize: 28, fontWeight: '600', lineHeight: 36, letterSpacing: -0.3 },
  headlineSmall: { fontSize: 24, fontWeight: '600', lineHeight: 32, letterSpacing: -0.2 },

  // Titles - More refined
  titleLarge: { fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: -0.1 },
  titleMedium: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  titleSmall: { fontSize: 16, fontWeight: '600', lineHeight: 20 },

  // Body text - Improved readability
  bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 26, letterSpacing: 0.1 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 22, letterSpacing: 0.1 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 18, letterSpacing: 0.2 },

  // Labels - Better contrast
  labelLarge: { fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.3 },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
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

  // Semantic spacing - updated for modern mobile layouts with better hierarchy
  component: 16,
  section: 28, // Increased for better breathing room
  page: 16, // Back to 16px for optimal balance
  content: 12, // Increased for better content spacing
  edge: 6, // Slightly more edge spacing

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

// Enhanced elevation for Dark Theme with better shadows
const darkElevation: ThemeElevation = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3, // More visible in dark mode
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  // 🆕 Enhanced shadow for cards and interactive elements (adapted for dark mode)
  card: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, // Higher opacity needed for dark mode visibility
    shadowRadius: 16,
    elevation: 6,
  },
  // 🆕 Enhanced shadow for floating elements (adapted for dark mode)
  floating: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 8,
  },
  // 🆕 Enhanced shadow for overlays and modals (adapted for dark mode)
  overlay: {
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 16,
  },
};

export const darkTheme: AppTheme = {
  name: 'dark',
  colors: enhancedDarkColors,
  typography: enhancedTypography,
  spacing: enhancedSpacing,
  borderRadius: enhancedBorderRadius,
  elevation: darkElevation,
};
