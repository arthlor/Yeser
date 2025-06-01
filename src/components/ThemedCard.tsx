import React from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';

import { useTheme } from '../providers/ThemeProvider';
import { AppTheme } from '../themes/types';

// Define possible card variants
type CardVariant = 'elevated' | 'outlined' | 'filled';

// Define possible elevation levels
type ElevationLevel = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ThemedCardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
  elevation?: ElevationLevel;
  contentPadding?: string;
}

// Define a function to get styles based on the theme, variant, and elevation
const getCardStyles = (
  theme: AppTheme,
  variant: CardVariant,
  elevation: ElevationLevel
) => {
  let cardStyle: ViewStyle = {};

  switch (variant) {
    case 'elevated':
      cardStyle = {
        backgroundColor: theme.colors.surface,
        ...theme.elevation[elevation],
        shadowColor: theme.colors.shadow,
      };
      break;
    case 'outlined':
      cardStyle = {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
      };
      break;
    case 'filled':
      cardStyle = {
        backgroundColor: theme.colors.surfaceVariant,
      };
      break;
  }

  return cardStyle;
};

/**
 * ThemedCard is a versatile card component that supports different variants and elevation levels.
 * It uses the app's theming system for consistent styling.
 *
 * @example
 * ```tsx
 * // Default elevated card
 * <ThemedCard>
 *   <Text>Card content</Text>
 * </ThemedCard>
 *
 * // Outlined card
 * <ThemedCard variant="outlined">
 *   <Text>Card with outline</Text>
 * </ThemedCard>
 * ```
 *
 * @param variant - The card variant ('elevated', 'outlined', or 'filled')
 * @param elevation - The elevation level ('none', 'xs', 'sm', 'md', 'lg', or 'xl')
 * @param style - Additional styles to apply to the card
 * @param children - The content to render inside the card
 */
const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  variant = 'elevated',
  elevation = 'sm',
  // contentPadding is not used since we're using a fixed medium padding
  contentPadding: _contentPadding = 'medium',
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const cardStyle = React.useMemo(
    () => getCardStyles(theme, variant, elevation),
    [theme, variant, elevation]
  );

  return (
    <View
      style={[
        {
          borderRadius: theme.borderRadius.medium,
          padding: theme.spacing.medium,
          ...cardStyle,
        },
        style,
      ]}
      {...rest}
      accessibilityRole="none"
    >
      {children}
    </View>
  );
};

export default ThemedCard;
