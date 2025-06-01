import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../providers/ThemeProvider'; // Adjust path if your ThemeProvider is elsewhere
import { AppTheme } from '../themes/types'; // Adjust path if your types are elsewhere

// Define possible button variants or types
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface ThemedButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  // You can add other props like 'iconLeft', 'iconRight', etc.
}

// Define a function to get styles based on the theme and button variant
const getStyles = (
  theme: AppTheme,
  variant: ButtonVariant,
  disabled?: boolean | null,
  isLoading?: boolean
) => {
  let backgroundColor = theme.colors.primary;
  let textColor = theme.colors.onPrimary;
  let borderColor = 'transparent';
  let borderWidth = 0;

  switch (variant) {
    case 'secondary':
      backgroundColor = theme.colors.secondary;
      textColor = theme.colors.onSecondary;
      break;
    case 'outline':
      backgroundColor = 'transparent';
      textColor = theme.colors.primary; // Or theme.colors.text, depending on desired look
      borderColor = theme.colors.primary; // Or theme.colors.border
      borderWidth = 1;
      break;
    case 'ghost':
      backgroundColor = 'transparent';
      textColor = theme.colors.primary; // Or theme.colors.text
      break;
    case 'danger':
      backgroundColor = theme.colors.error;
      textColor = theme.colors.onError;
      break;
    // 'primary' is default
  }

  if (disabled || isLoading) {
    backgroundColor = theme.colors.border; // A more muted background for disabled state
    textColor = theme.colors.textSecondary; // Muted text for disabled
    if (variant === 'outline' || variant === 'ghost') {
      borderColor = theme.colors.border;
    }
  }

  return StyleSheet.create({
    button: {
      backgroundColor,
      borderColor,
      borderWidth,
      paddingVertical: theme.spacing.medium,
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.borderRadius.medium,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row', // To accommodate loading indicator or icons
    } as ViewStyle, // Type assertion for clarity
    text: {
      color: textColor,
      fontSize: theme.typography.button.fontSize,
      fontWeight: theme.typography.button.fontWeight,
      fontFamily:
        theme.typography.button.fontFamily ||
        theme.typography.fontFamilyRegular,
    } as TextStyle, // Type assertion for clarity
    loadingIndicator: {
      marginLeft: isLoading && variant !== 'ghost' ? theme.spacing.small : 0, // Add space if title is also present
    },
  });
};

const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  isLoading = false,
  style, // Allow passing custom styles to override or extend
  ...rest
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme, variant, disabled, isLoading);

  return (
    <TouchableOpacity
      style={[styles.button, style]} // Apply base styles, then custom overrides
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7} // Standard active opacity
      {...rest}
    >
      {!isLoading && <Text style={styles.text}>{title}</Text>}
      {isLoading && (
        <ActivityIndicator
          size="small"
          color={styles.text.color} // Use the determined text color for the spinner
          style={styles.loadingIndicator}
        />
      )}
    </TouchableOpacity>
  );
};

export default ThemedButton;
