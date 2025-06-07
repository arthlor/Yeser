import React from 'react';
import { ViewStyle } from 'react-native';
import ThemedCard, { BorderRadiusSize, CardVariant, DensitySize, ElevationLevel, SpacingSize } from '../ui/ThemedCard';

interface ScreenCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'interactive';
  
  // ✨ UPDATED: Modern prop naming aligned with ThemedCard
  padding?: 'none' | 'compact' | 'standard' | 'comfortable' | 'spacious';
  margin?: 'none' | 'compact' | 'standard' | 'comfortable' | 'spacious';
  borderRadius?: 'small' | 'medium' | 'large' | 'xlarge';
  
  // ✨ NEW: Enhanced props from ThemedCard
  density?: 'compact' | 'standard' | 'comfortable';
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'card' | 'floating' | 'overlay';
  
  // Legacy props for backward compatibility
  legacyPadding?: 'none' | 'small' | 'medium' | 'large';
  legacyMargin?: 'none' | 'small' | 'medium' | 'large';
  legacyBorderRadius?: 'small' | 'medium' | 'large';
  
  disabled?: boolean;
  testID?: string;
}

/**
 * 🔄 LEGACY COMPATIBILITY WRAPPER
 * ScreenCard now redirects to the enhanced ThemedCard for unified functionality
 * 
 * This maintains backward compatibility while using the new unified card system.
 * All ScreenCard props are mapped to equivalent ThemedCard props.
 * 
 * @deprecated Consider migrating to ThemedCard directly for new code
 */
const ScreenCard: React.FC<ScreenCardProps> = ({
  children,
  onPress,
  style,
  contentStyle,
  variant = 'default',
  padding = 'standard',
  margin = 'standard',
  borderRadius = 'medium',
  density,
  elevation,
  legacyPadding,
  legacyMargin,
  legacyBorderRadius,
  disabled = false,
  testID,
}) => {
  // ✨ NEW: Legacy prop mapping for backward compatibility
  const resolvePadding = (): SpacingSize => {
    if (legacyPadding) {
      return mapLegacyPadding(legacyPadding);
    }
    return padding as SpacingSize;
  };
  
  const resolveMargin = (): SpacingSize => {
    if (legacyMargin) {
      return mapLegacyMargin(legacyMargin);
    }
    return margin as SpacingSize;
  };
  
  const resolveBorderRadius = (): BorderRadiusSize => {
    if (legacyBorderRadius) {
      return mapLegacyBorderRadius(legacyBorderRadius);
    }
    return borderRadius as BorderRadiusSize;
  };

  return (
    <ThemedCard
      variant={variant}
      padding={resolvePadding()}
      margin={resolveMargin()}
      borderRadius={resolveBorderRadius()}
      density={density}
      elevation={elevation}
      onPress={onPress}
      disabled={disabled}
      style={style}
      contentStyle={contentStyle}
      testID={testID}
    >
      {children}
    </ThemedCard>
  );
};

/**
 * Map ScreenCard legacy padding values to ThemedCard SpacingSize
 */
const mapLegacyPadding = (legacyPadding: 'none' | 'small' | 'medium' | 'large'): SpacingSize => {
  switch (legacyPadding) {
    case 'none':
      return 'none';
    case 'small':
      return 'compact';
    case 'medium':
      return 'standard';
    case 'large':
      return 'comfortable';
    default:
      return 'standard';
  }
};

/**
 * Map ScreenCard legacy margin values to ThemedCard SpacingSize
 */
const mapLegacyMargin = (legacyMargin: 'none' | 'small' | 'medium' | 'large'): SpacingSize => {
  switch (legacyMargin) {
    case 'none':
      return 'none';
    case 'small':
      return 'compact';
    case 'medium':
      return 'standard';
    case 'large':
      return 'comfortable';
    default:
      return 'standard';
  }
};

/**
 * Map ScreenCard legacy borderRadius values to ThemedCard BorderRadiusSize
 */
const mapLegacyBorderRadius = (legacyBorderRadius: 'small' | 'medium' | 'large'): BorderRadiusSize => {
  switch (legacyBorderRadius) {
    case 'small':
      return 'small';
    case 'medium':
      return 'medium';
    case 'large':
      return 'large';
    default:
      return 'medium';
  }
};

export default ScreenCard; 