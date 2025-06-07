import {
  AppTheme,
  ThemeBorderRadius,
  ThemeColors,
  ThemeElevation,
  ThemeSpacing,
  ThemeTypography,
} from './types';

// Softer Light Theme - Easier on the Eyes
const enhancedLightColors: ThemeColors = {
  // Brand colors - Softer, warmer green tones
  primary: '#0F766E', // Deeper, more muted teal-green
  onPrimary: '#F0FDFA', // Soft mint instead of pure white
  primaryVariant: '#0D9488', // Slightly brighter variant
  primaryContainer: '#F0FDFA', // Very soft mint container
  onPrimaryContainer: '#042F2E',

  secondary: '#92400E', // Warm amber-brown 
  onSecondary: '#FEF3C7', // Soft cream instead of white
  secondaryContainer: '#FEF3C7', // Light warm container
  onSecondaryContainer: '#451A03',

  tertiary: '#0369A1', // Softer blue tertiary
  onTertiary: '#E0F2FE', // Soft blue tint
  tertiaryContainer: '#E0F2FE',
  onTertiaryContainer: '#0C4A6E',

  accent: '#CA8A04', // More muted amber accent
  onAccent: '#FEF3C7',
  accentContainer: '#FEF3C7',
  onAccentContainer: '#713F12',

  // Surfaces - Warmer, softer backgrounds
  background: '#F8FAFC', // Soft blue-gray instead of pure white
  onBackground: '#1E293B', // Softer dark text
  surface: '#FFFFFF', // Keep pure white for cards but reduce usage
  onSurface: '#1E293B',
  surfaceVariant: '#F1F5F9', // Warm gray-blue variant
  onSurfaceVariant: '#475569', // Softer contrast
  surfaceTint: '#0F766E',
  inverseSurface: '#334155',
  inverseOnSurface: '#F8FAFC',

  // Enhanced surface levels for softer hierarchy
  surfaceElevated: '#FEFEFE', // Very slightly off-white
  surfaceContainer: '#F8FAFC', // Same as background for continuity
  surfaceBright: '#FFFFFF', // Pure white for emphasis
  surfaceDim: '#F1F5F9', // Dimmed surface

  // Content colors - Softer borders and outlines
  outline: '#CBD5E1', // Much softer outline
  outlineVariant: '#E2E8F0', // Very light outline
  scrim: 'rgba(15, 23, 42, 0.5)', // Warmer scrim

  // Enhanced border system for softer appearance
  borderLight: '#F1F5F9', // Very light borders
  borderMedium: '#E2E8F0', // Medium borders  
  borderStrong: '#CBD5E1', // Strong but not harsh borders

  // State colors - Softer, more muted
  success: '#059669', // Deeper green, less bright
  onSuccess: '#F0FDF4', // Soft green tint
  successContainer: '#ECFDF5', // Light green container
  onSuccessContainer: '#064E3B',

  warning: '#D97706', // Warmer, less bright amber
  onWarning: '#FEF3C7', // Soft cream
  warningContainer: '#FEF3C7',
  onWarningContainer: '#92400E',

  error: '#DC2626', // Softer red
  onError: '#FEF2F2', // Soft pink tint
  errorContainer: '#FEF2F2',
  onErrorContainer: '#7F1D1D',

  info: '#0284C7', // Softer blue info
  onInfo: '#E0F2FE', // Soft blue tint
  infoContainer: '#E0F2FE',
  onInfoContainer: '#0369A1',

  // Interaction states
  disabled: '#94A3B8', // Softer disabled
  onDisabled: '#64748B',

  // Advanced interaction states - Very gentle
  hover: 'rgba(15, 118, 110, 0.04)', // Ultra-subtle hover
  pressed: 'rgba(15, 118, 110, 0.08)',
  focus: 'rgba(15, 118, 110, 0.12)',
  selected: 'rgba(15, 118, 110, 0.06)',
  
  // Enhanced interaction states
  hoverStrong: 'rgba(15, 118, 110, 0.10)', // Stronger but still subtle
  focusRing: '#0F766E', // Focus ring color
  activeState: 'rgba(15, 118, 110, 0.15)', // Active state

  // Gradient colors - Softer gradient
  gradientStart: '#0F766E',
  gradientEnd: '#059669',

  // Legacy support - updated for softer theme
  text: '#1E293B', // Softer dark text
  textSecondary: '#64748B', // Warmer secondary text
  border: '#E2E8F0', // Much softer border
  inputBackground: '#FEFEFE', // Very slightly off-white
  inputText: '#1E293B',
  danger: '#DC2626',
  onDanger: '#FEF2F2',
  shadow: 'rgba(15, 23, 42, 0.08)', // Softer shadow
  surfaceDisabled: '#F1F5F9',
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

// Softer elevation with gentler shadows
const elevation: ThemeElevation = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, // Ultra-subtle shadow
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, // Very gentle shadow
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, // Soft shadow
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, // Gentle shadow
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1, // Comfortable shadow
    shadowRadius: 28,
    elevation: 12,
  },
  // 🆕 Enhanced shadow for cards and interactive elements
  card: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, // Beautiful card shadow from DailyEntryScreen
    shadowRadius: 16,
    elevation: 6,
  },
  // 🆕 Enhanced shadow for floating elements
  floating: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  // 🆕 Enhanced shadow for overlays and modals
  overlay: {
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 16,
  },
};

export const lightTheme: AppTheme = {
  name: 'light',
  colors: enhancedLightColors,
  typography: enhancedTypography,
  spacing: enhancedSpacing,
  borderRadius: enhancedBorderRadius,
  elevation,
};
