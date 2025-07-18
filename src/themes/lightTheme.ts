import {
  AppTheme,
  ThemeBorderRadius,
  ThemeColors,
  ThemeElevation,
  ThemeSpacing,
  ThemeTypography,
} from './types';

// Verdant Serenity Light Theme - Natural & Uplifting with Eggshell Tones
const enhancedLightColors: ThemeColors = {
  // Brand colors - Deep, calming Teal-Green (The "Growth")
  primary: '#0F766E', // Deep, muted teal - sophisticated and balanced
  onPrimary: '#F5F3F0', // Warm eggshell instead of mint
  primaryVariant: '#0D9488', // Slightly brighter teal variant
  primaryContainer: '#F5F3F0', // Warm eggshell container
  onPrimaryContainer: '#042F2E', // Deep teal text on container

  // Warm, muted Gold/Amber Secondary (The "Gratitude")
  secondary: '#D97706', // Warm, rich amber - represents optimism and warmth
  onSecondary: '#FEF3C7', // Soft cream instead of white
  secondaryContainer: '#FEF3C7', // Light warm amber container
  onSecondaryContainer: '#451A03', // Deep amber text on container

  // Tertiary & Calm - Harmonious with the palette
  tertiary: '#0369A1', // Calming blue that harmonizes with teal
  onTertiary: '#F2F6FA', // Warm off-white with subtle blue tint
  tertiaryContainer: '#E0F2FE', // Light blue container
  onTertiaryContainer: '#0C4A6E', // Deep blue text

  // Accent colors - Using amber variations
  accent: '#CA8A04', // More muted amber accent
  onAccent: '#FEF3C7',
  accentContainer: '#FEF3C7', // Light amber container
  onAccentContainer: '#713F12',

  // Surfaces - Soft, warm Eggshell/Linen (The "Calm")
  background: '#F7F5F3', // Warm eggshell background (not bright white)
  onBackground: '#1E293B', // Softer dark text for comfort
  surface: '#FDFBF9', // Warm eggshell for cards with subtle lift
  onSurface: '#1E293B', // Consistent with background text
  surfaceVariant: '#F0EDE9', // Warm beige-gray variant
  onSurfaceVariant: '#475569', // Softer contrast for secondary text
  surfaceTint: '#0F766E', // Primary teal tint
  inverseSurface: '#334155', // Warm dark slate
  inverseOnSurface: '#F7F5F3', // Warm eggshell on inverse

  // Enhanced surface levels for natural hierarchy - all eggshell tones
  surfaceElevated: '#FEFCFA', // Warm eggshell for elevated cards (no pure white)
  surfaceContainer: '#F7F5F3', // Same as background for continuity
  surfaceBright: '#FEFCFA', // Warmest eggshell for emphasis (no pure white)
  surfaceDim: '#F0EDE9', // Dimmed warm surface for subtle backgrounds

  // Content colors - Strengthened for better visibility while staying natural
  outline: '#94A3B8', // Strengthened from #CBD5E1 for clear UI element definition
  outlineVariant: '#D2CFC8', // Warm outline variant matching our eggshell palette
  scrim: 'rgba(15, 23, 42, 0.5)', // Warm scrim

  // Enhanced border system for better visual hierarchy with eggshell tones
  borderLight: '#E8E5E1', // Warm light border instead of bright
  borderMedium: '#D2CFC8', // Warm medium border
  borderStrong: '#94A3B8', // Strengthened from #CBD5E1 - strong definition

  // State colors - Natural, harmonious with the palette
  success: '#059669', // Deeper green that harmonizes with teal
  onSuccess: '#F4F7F5', // Warm eggshell with green tint
  successContainer: '#ECFDF5', // Light green container
  onSuccessContainer: '#064E3B',

  warning: '#D97706', // Same as secondary - warm amber for consistency
  onWarning: '#FEF3C7', // Soft cream
  warningContainer: '#FEF3C7', // Light amber container
  onWarningContainer: '#92400E',

  error: '#DC2626', // Warm red that doesn't clash with palette
  onError: '#F9F5F5', // Warm eggshell with pink tint
  errorContainer: '#FEF2F2', // Light red container
  onErrorContainer: '#7F1D1D',

  info: '#0284C7', // Blue that harmonizes with tertiary
  onInfo: '#F2F6FA', // Warm off-white with blue tint
  infoContainer: '#E0F2FE', // Light blue container
  onInfoContainer: '#0369A1',

  // Interaction states - Using primary teal for cohesion
  disabled: '#94A3B8', // Softer disabled state
  onDisabled: '#64748B',

  // Advanced interaction states - Very gentle and natural
  hover: 'rgba(15, 118, 110, 0.04)', // Ultra-subtle teal hover
  pressed: 'rgba(15, 118, 110, 0.08)',
  focus: 'rgba(15, 118, 110, 0.12)',
  selected: 'rgba(15, 118, 110, 0.06)',

  // Enhanced interaction states for better feedback
  hoverStrong: 'rgba(15, 118, 110, 0.10)', // Stronger but still gentle
  focusRing: '#0F766E', // Teal focus ring
  activeState: 'rgba(15, 118, 110, 0.15)', // Active state

  // Gradient colors - Natural teal to amber harmony
  gradientStart: '#0F766E', // Deep teal start
  gradientEnd: '#059669', // Harmonious green end

  // Legacy support - updated for improved hierarchy with eggshell tones
  text: '#1E293B', // Softer dark text for comfortable reading
  textSecondary: '#64748B', // Warmer secondary text
  border: '#D2CFC8', // Warm border matching our eggshell palette
  inputBackground: '#FDFBF9', // Warm eggshell for inputs (no bright white)
  inputText: '#1E293B',
  danger: '#DC2626', // Consistent with error
  onDanger: '#F9F5F5', // Warm eggshell with pink tint
  shadow: 'rgba(15, 23, 42, 0.08)', // Softer shadow for gentle elevation
  surfaceDisabled: '#F0EDE9', // Warm disabled surface
};

const enhancedTypography: ThemeTypography = {
  // Font families - Verdant Serenity Typography System
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

// Improved elevation with better shadow visibility for light theme
const elevation: ThemeElevation = {
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, // Increased from 0.03 for better visibility
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Increased from 0.04 for clearer definition
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, // Increased from 0.06 for better depth
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, // Increased from 0.08 for clear elevation
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, // Increased from 0.1 for strong elevation
    shadowRadius: 28,
    elevation: 12,
  },
  // Enhanced shadows with improved visibility for light theme
  card: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18, // Increased from 0.12 for beautiful card depth
    shadowRadius: 16,
    elevation: 6,
  },
  floating: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, // Increased from 0.14 for clear floating effect
    shadowRadius: 20,
    elevation: 8,
  },
  overlay: {
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.28, // Increased from 0.16 for strong overlay presence
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
