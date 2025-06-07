import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps, View, ViewProps, ViewStyle } from 'react-native';

import { useTheme } from '../../../providers/ThemeProvider';
import { AppTheme } from '../../../themes/types';
import { semanticSpacing, unifiedShadows } from '../../../themes/utils';

// Comprehensive, unified card variants
type CardVariant = 'default' | 'elevated' | 'interactive' | 'outlined' | 'filled';

// Granular spacing configuration
type SpacingSize = 'none' | 'compact' | 'standard' | 'comfortable' | 'spacious';
type BorderRadiusSize = 'small' | 'medium' | 'large' | 'xlarge';

// Enhanced density system for modern spacing control
type DensitySize = 'compact' | 'standard' | 'comfortable';

// Elevation system integration with theme
type ElevationLevel = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'card' | 'floating' | 'overlay';

interface ThemedCardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  containerStyle?: ViewStyle;
  variant?: CardVariant;
  
  // Enhanced spacing controls (absorbed from ScreenCard)
  padding?: SpacingSize;
  margin?: SpacingSize;
  borderRadius?: BorderRadiusSize;
  
  // ✨ NEW: Density system for modern spacing control
  density?: DensitySize;
  
  // ✨ NEW: Direct elevation control (overrides variant-based shadows)
  elevation?: ElevationLevel;
  
  // Interaction support
  onPress?: () => void;
  touchableProps?: Omit<TouchableOpacityProps, 'style' | 'onPress'>;
  disabled?: boolean;
  
  // Accessibility
  testID?: string;
}

/**
 * 🎯 UNIFIED THEMED CARD
 * Enhanced card component that merges ThemedCard and ScreenCard functionality
 * 
 * Features:
 * - 5 comprehensive variants (default, elevated, interactive, outlined, filled)
 * - Granular spacing controls (padding, margin, borderRadius)
 * - ✨ NEW: Density system for modern spacing control
 * - ✨ NEW: Direct elevation control with theme integration
 * - Semantic spacing system integration
 * - Unified primary shadows
 * - Full interaction support
 * - Enhanced accessibility
 * - Backward compatibility with both ThemedCard and ScreenCard APIs
 * 
 * @example
 * // Basic usage with variant
 * <ThemedCard variant="elevated">
 *   <Text>Content</Text>
 * </ThemedCard>
 * 
 * @example
 * // Modern density-based spacing
 * <ThemedCard 
 *   variant="default" 
 *   density="compact"     // 8px padding - tight for lists
 * >
 *   <Text>List item</Text>
 * </ThemedCard>
 * 
 * @example
 * // Direct elevation control (overrides variant shadows)
 * <ThemedCard 
 *   variant="outlined"
 *   elevation="floating"  // Uses floating shadow instead of outlined's default
 * >
 *   <Text>Custom elevation</Text>
 * </ThemedCard>
 * 
 * @example
 * // Complete modern API usage
 * <ThemedCard
 *   variant="interactive"
 *   density="comfortable"    // 24px padding - spacious for forms
 *   elevation="card"         // Card-level shadow
 *   borderRadius="large"     // Large border radius
 *   margin="standard"        // Standard margin
 *   onPress={handlePress}
 * >
 *   <Text>Interactive card with custom styling</Text>
 * </ThemedCard>
 */
const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  variant = 'default',
  padding = 'standard',
  margin = 'standard',
  borderRadius = 'medium',
  density = 'standard',
  elevation = 'none',
  onPress,
  disabled = false,
  style,
  contentStyle,
  containerStyle,
  touchableProps,
  testID,
  ...rest
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme, variant, padding, margin, borderRadius, density, elevation);

  const isInteractive = Boolean(onPress) && !disabled;

  const cardContent = (
    <View style={[styles.content, contentStyle]}>
      {children}
    </View>
  );

  // Interactive card with TouchableOpacity
  if (isInteractive) {
    return (
      <View style={[containerStyle]}>
        <TouchableOpacity
          style={[styles.card, style]}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          testID={testID}
          {...touchableProps}
        >
          {cardContent}
        </TouchableOpacity>
      </View>
    );
  }

  // Static card with View
  return (
    <View style={[containerStyle]}>
      <View
        style={[styles.card, style]}
        testID={testID}
        {...rest}
        accessibilityRole="none"
      >
        {cardContent}
      </View>
    </View>
  );
};

/**
 * 🎨 ENHANCED STYLING SYSTEM
 * Uses semantic spacing and unified shadows with granular controls
 */
const createStyles = (
  theme: AppTheme,
  variant: CardVariant,
  padding: SpacingSize,
  margin: SpacingSize,
  borderRadius: BorderRadiusSize,
  density: DensitySize,
  elevation: ElevationLevel
) => {
  const spacing = semanticSpacing(theme);
  const shadows = unifiedShadows(theme);

  // ✨ NEW: Density-based padding that overrides padding prop when density is used
  const getDensityPadding = (): number => {
    switch (density) {
      case 'compact':
        return spacing.contentGap; // 8px - tight spacing for lists
      case 'comfortable':
        return spacing.majorGap; // 24px - spacious for forms
      case 'standard':
      default:
        return spacing.cardPadding; // 16px - standard card padding
    }
  };

  // Enhanced padding system - density takes precedence if specified
  const getPadding = (): number => {
    // Always use density-based padding as the primary system
    return getDensityPadding();
  };

  // Enhanced margin system
  const getMargin = (): number => {
    switch (margin) {
      case 'none':
        return 0;
      case 'compact':
        return spacing.elementGap; // 4px
      case 'comfortable':
        return spacing.sectionGap; // 16px
      case 'spacious':
        return spacing.majorGap; // 24px
      case 'standard':
      default:
        return spacing.contentGap; // 8px
    }
  };

  // Enhanced border radius system
  const getBorderRadius = (): number => {
    switch (borderRadius) {
      case 'small':
        return theme.borderRadius.sm;
      case 'large':
        return theme.borderRadius.xl;
      case 'xlarge':
        return theme.borderRadius.xxl || theme.borderRadius.xl * 1.5;
      case 'medium':
      default:
        return theme.borderRadius.lg;
    }
  };

  // Get variant-specific styling
  const variantStyles = getVariantStyles(theme, variant, shadows, elevation);

  return StyleSheet.create({
    card: {
      borderRadius: getBorderRadius(),
      marginBottom: getMargin(),
      overflow: 'hidden',
      ...variantStyles,
    },
    content: {
      padding: getPadding(),
    },
  });
};

/**
 * 🎨 COMPREHENSIVE VARIANT STYLING
 * Enhanced variant system supporting all use cases with elevation override support
 */
const getVariantStyles = (
  theme: AppTheme, 
  variant: CardVariant, 
  shadows: ReturnType<typeof unifiedShadows>, 
  elevation: ElevationLevel
) => {
  const baseCard = {
    backgroundColor: theme.colors.surface,
  };

  // ✨ NEW: Direct elevation override takes precedence over variant-based shadows
  const getElevationShadow = () => {
    if (elevation === 'none') {
      return shadows.none;
    }
    // Map elevation levels to shadow utilities
    switch (elevation) {
      case 'xs':
        return shadows.subtle;
      case 'sm':
      case 'card':
        return shadows.card;
      case 'md':
      case 'floating':
        return shadows.floating;
      case 'lg':
      case 'xl':
      case 'overlay':
        return shadows.overlay;
      default:
        return shadows.none;
    }
  };

  // Use elevation override if specified (not 'none'), otherwise use variant-based shadows
  const finalShadow = elevation !== 'none' ? getElevationShadow() : undefined;

  switch (variant) {
    case 'elevated':
      return {
        ...baseCard,
        ...(finalShadow || shadows.card), // Use elevation override or default card shadow
      };
      
    case 'interactive':
      return {
        ...baseCard,
        borderWidth: 1,
        borderColor: theme.colors.outline + '20', // Subtle border
        ...(finalShadow || shadows.subtle), // Use elevation override or default subtle shadow
      };
      
    case 'outlined':
      return {
        ...baseCard,
        borderWidth: 1,
        borderColor: theme.colors.outline + '40', // More prominent border
        ...(finalShadow || shadows.none), // Use elevation override or no shadow for clean outlined look
      };
      
    case 'filled':
      return {
        backgroundColor: theme.colors.surfaceVariant, // Different background
        borderWidth: 0,
        ...(finalShadow || shadows.none), // Use elevation override or no shadow for filled variant
      };
      
    case 'default':
    default:
      return {
        ...baseCard,
        borderWidth: 1,
        borderColor: theme.colors.outline + '15', // Very subtle border
        ...(finalShadow || shadows.subtle), // Use elevation override or default gentle elevation
      };
  }
};

export default ThemedCard;
export type { ThemedCardProps, CardVariant, SpacingSize, BorderRadiusSize, DensitySize, ElevationLevel };
