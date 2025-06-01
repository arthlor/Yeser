import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../themes/types';

export type ErrorStateProps = {
  /**
   * Title of the error message
   */
  title?: string;

  /**
   * Detailed error message
   */
  message: string;

  /**
   * Icon name from MaterialCommunityIcons
   */
  icon?: string;

  /**
   * Label for the retry button
   */
  retryLabel?: string;

  /**
   * Function to call when retry button is pressed
   */
  onRetry?: () => void;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;
};

/**
 * ErrorState is a component that displays an error message with an optional
 * retry button and icon. It provides a consistent way to show errors across the app.
 *
 * @example
 * ```tsx
 * // Simple error state
 * <ErrorState message="Something went wrong" />
 *
 * // Error state with retry button
 * <ErrorState
 *   title="Connection Error"
 *   message="Unable to connect to the server"
 *   icon="wifi-off"
 *   onRetry={() => fetchData()}
 * />
 * ```
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Error',
  message,
  icon = 'alert-circle',
  retryLabel = 'Try Again',
  onRetry,
  style,
}) => {
  const { theme } = useTheme();

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const content = (
    <View
      style={[styles.container, style]}
      accessibilityRole="alert"
      accessibilityLabel={`${title}: ${message}`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={48}
        color={theme.colors.error}
        style={styles.icon}
      />

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      <Text style={styles.message} accessibilityRole="text">
        {message}
      </Text>

      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          accessibilityHint="Attempts to resolve the error"
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return content;
};

const createStyles = (theme: AppTheme) => {
  return StyleSheet.create({
    container: {
      padding: theme.spacing.large,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      margin: theme.spacing.medium,
    },
    icon: {
      marginBottom: theme.spacing.medium,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.error,
      marginBottom: theme.spacing.small,
      textAlign: 'center',
    },
    message: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
      marginBottom: theme.spacing.large,
      textAlign: 'center',
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.small,
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.borderRadius.small,
    },
    retryText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimary,
    },
  });
};

export default ErrorState;
