import {
  AppTheme,
  ThemeBorderRadius,
  ThemeColors,
  ThemeElevation,
  ThemeSpacing,
  ThemeTypography,
} from './types';

// Verdant Serenity Dark Theme - Natural & Sophisticated
const enhancedDarkColors: ThemeColors = {
  // Brand colors - Brighter Teal-Green for dark mode visibility (The "Growth")
  primary: '#2DD4BF', // Brighter, more vibrant teal for contrast in dark mode
  onPrimary: '#0F172A', // Dark text on bright primary
  primaryVariant: '#14B8A6', // Slightly deeper teal variant
  primaryContainer: '#164E63', // Darker teal container for surface-based elements
  onPrimaryContainer: '#67E8F9', // Light teal text on dark containers

  // Warm, lighter Amber for dark mode (The "Gratitude")
  secondary: '#FBBF24', // Lighter, warmer amber for dark mode visibility
  onSecondary: '#92400E', // Dark amber text on bright secondary
  secondaryContainer: '#92400E', // Dark amber container
  onSecondaryContainer: '#FEF3C7', // Light cream on dark amber container

  // Harmonious blue tertiary for dark mode
  tertiary: '#60A5FA', // Lighter blue for dark mode visibility
  onTertiary: '#1E3A8A', // Dark blue text on bright tertiary
  tertiaryContainer: '#1E40AF', // Dark blue container
  onTertiaryContainer: '#DBEAFE', // Light blue on dark container

  // Accent colors - Warm amber variations
  accent: '#FBBF24', // Bright amber accent for visibility
  onAccent: '#92400E', // Dark text on bright accent
  accentContainer: '#92400E', // Dark amber container
  onAccentContainer: '#FEF3C7', // Light text on dark container

  // Surfaces - Deep, sophisticated Desaturated Slate-Blue (The "Calm")
  background: '#0F172A', // Deep, dark desaturated slate-blue (not pure black)
  onBackground: '#F1F5F9', // Light text for comfortable reading
  surface: '#1E293B', // Elevated desaturated blue surface for cards
  onSurface: '#F1F5F9', // Light text on elevated surfaces
  surfaceVariant: '#334155', // More distinct desaturated blue variant
  onSurfaceVariant: '#CBD5E1', // Light text with good contrast
  surfaceTint: '#2DD4BF', // Bright teal tint
  inverseSurface: '#F1F5F9', // Light inverse surface
  inverseOnSurface: '#0F172A', // Dark text on light inverse

  // Enhanced surface levels - Sophisticated blue hierarchy
  surfaceElevated: '#374151', // Elevated desaturated blue for primary elements
  surfaceContainer: '#475569', // Container desaturated blue for secondary actions
  surfaceBright: '#475569', // Bright surface variant for emphasis
  surfaceDim: '#1E293B', // Dimmed surface for subtle backgrounds

  // Content colors - Sophisticated slate-blue tones
  outline: '#64748B', // More visible desaturated blue outline
  outlineVariant: '#475569', // Secondary desaturated blue outline
  scrim: 'rgba(0, 0, 0, 0.8)', // Deep scrim for overlays

  // Enhanced border system for sophisticated dark mode
  borderLight: '#374151', // Light desaturated blue borders
  borderMedium: '#475569', // Medium desaturated blue borders
  borderStrong: '#64748B', // Strong but elegant borders

  // State colors - Natural harmonies optimized for dark mode
  success: '#10B981', // Brighter emerald for dark mode visibility
  onSuccess: '#FFFFFF', // White text on success
  successContainer: '#065F46', // Dark green container
  onSuccessContainer: '#A7F3D0', // Light green on dark container

  warning: '#FBBF24', // Same as secondary - bright amber for consistency
  onWarning: '#92400E', // Dark text on bright warning
  warningContainer: '#92400E', // Dark amber container
  onWarningContainer: '#FEF3C7', // Light cream on dark container

  error: '#F87171', // Softer red optimized for dark mode
  onError: '#7F1D1D', // Dark red text
  errorContainer: '#7F1D1D', // Dark red container
  onErrorContainer: '#FEE2E2', // Light pink on dark container

  info: '#60A5FA', // Bright blue that harmonizes with tertiary
  onInfo: '#1E3A8A', // Dark blue text
  infoContainer: '#1E40AF', // Dark blue container
  onInfoContainer: '#DBEAFE', // Light blue on dark container

  // Interaction states - Using bright teal for visibility
  disabled: '#64748B', // Muted desaturated blue for disabled
  onDisabled: '#94A3B8', // Lighter text on disabled

  // Advanced interaction states - Optimized for dark mode
  hover: 'rgba(45, 212, 191, 0.08)', // Subtle bright teal hover
  pressed: 'rgba(45, 212, 191, 0.12)', // More pronounced press
  focus: 'rgba(45, 212, 191, 0.16)', // Clear focus indication
  selected: 'rgba(45, 212, 191, 0.12)', // Distinct selection state

  // Enhanced interaction states for sophisticated feedback
  hoverStrong: 'rgba(45, 212, 191, 0.15)', // Stronger hover for primary elements
  focusRing: '#2DD4BF', // Bright teal focus ring
  activeState: 'rgba(45, 212, 191, 0.20)', // Clear active state

  // Gradient colors - Natural teal harmony for dark mode
  gradientStart: '#2DD4BF', // Bright teal start
  gradientEnd: '#14B8A6', // Harmonious deeper teal end

  // Legacy support - updated for sophisticated dark theme
  text: '#F1F5F9', // Light, comfortable text for reading
  textSecondary: '#CBD5E1', // Secondary text with good contrast
  border: '#64748B', // Visible but not harsh borders
  inputBackground: '#374151', // Sophisticated desaturated blue input background
  inputText: '#F1F5F9', // Light text in inputs
  danger: '#F87171', // Consistent with error
  onDanger: '#7F1D1D', // Dark text on danger
  shadow: 'rgba(0, 0, 0, 0.5)', // Deep shadow for elevation
  surfaceDisabled: '#374151', // Sophisticated disabled surface
};

const enhancedTypography: ThemeTypography = {
  // Font families - Verdant Serenity Typography System (same as light theme)
  fontFamilyRegular: 'Inter-Regular', // Clean sans-serif for body text
  fontFamilyMedium: 'Inter-Medium', // Medium weight sans-serif
  fontFamilyBold: 'Inter-Bold', // Bold sans-serif
  fontFamilyMono: 'JetBrainsMono-Regular', // Monospace for code

  // Enhanced font families for journal feel
  fontFamilySerif: 'Lora-Regular', // Serif for headlines and journal titles
  fontFamilySerifMedium: 'Lora-Medium', // Medium serif weight
  fontFamilySerifBold: 'Lora-Bold', // Bold serif for emphasis

  // Display styles - Using serif for journal-like feel
  displayLarge: {
    fontFamily: 'Lora-Bold',
    fontSize: 57,
    fontWeight: '700',
    lineHeight: 64,
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontFamily: 'Lora-Bold',
    fontSize: 45,
    fontWeight: '700',
    lineHeight: 52,
    letterSpacing: -0.2,
  },
  displaySmall: {
    fontFamily: 'Lora-Medium',
    fontSize: 36,
    fontWeight: '600',
    lineHeight: 44,
    letterSpacing: -0.1,
  },

  // Headlines - Serif fonts for reflective, journal-like feel
  headlineLarge: {
    fontFamily: 'Lora-Bold',
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  headlineMedium: {
    fontFamily: 'Lora-Medium',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  headlineSmall: {
    fontFamily: 'Lora-Medium',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.2,
  },

  // Titles - Mixed approach: Serif for large titles, Sans-serif for smaller UI titles
  titleLarge: {
    fontFamily: 'Lora-Medium',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  titleMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Body text - Clean sans-serif for optimal readability
  bodyLarge: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  bodyMedium: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bodySmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: 0.2,
  },

  // Labels - Sans-serif for UI elements and buttons
  labelLarge: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Legacy support - Updated for mixed typography approach
  h1: { fontFamily: 'Lora-Bold', fontSize: 32, fontWeight: 'bold' },
  h2: { fontFamily: 'Lora-Medium', fontSize: 24, fontWeight: '600' },
  h3: { fontFamily: 'Lora-Medium', fontSize: 20, fontWeight: '600' },
  body1: { fontFamily: 'Inter-Regular', fontSize: 16 },
  body2: { fontFamily: 'Inter-Regular', fontSize: 14 },
  button: { fontFamily: 'Inter-Medium', fontSize: 16, fontWeight: '500' },
  caption: { fontFamily: 'Inter-Regular', fontSize: 12 },
  overline: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle1: { fontFamily: 'Lora-Regular', fontSize: 18, fontWeight: '500' },
  label: { fontFamily: 'Inter-Medium', fontSize: 14, fontWeight: '500' },
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
    shadowOpacity: 0.3,
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
