import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../themes/types';
import { ScreenLayout } from '../../shared/components/layout';
import { getPrimaryShadow } from '@/themes/utils';

export interface ErrorStateProps {
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
   * Whether to render as a full screen with ScreenLayout
   * When true, renders with ScreenLayout wrapper for screen-level usage
   * When false, renders as inline component with card styling
   */
  fullScreen?: boolean;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;
}

/**
 * ErrorState is a component that displays an error message with an optional
 * retry button and icon. It provides a consistent way to show errors across the app.
 *
 * @example
 * ```tsx
 * // Simple error state (inline with card styling)
 * <ErrorState message="Something went wrong" />
 *
 * // Full-screen error state
 * <ErrorState
 *   fullScreen
 *   title="Connection Error"
 *   message="Unable to connect to the server"
 *   icon="wifi-off"
 *   onRetry={() => fetchData()}
 * />
 *
 * // Inline error state with retry
 * <ErrorState
 *   message="Failed to load data"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Error',
  message,
  icon = 'alert-circle',
  retryLabel = 'Try Again',
  onRetry,
  fullScreen = false,
  style,
}) => {
  const { theme } = useTheme();

  const styles = React.useMemo(() => createStyles(theme, fullScreen), [theme, fullScreen]);

  const content = (
    <View
      style={[styles.container, style]}
      accessibilityRole="alert"
      accessibilityLabel={`${title}: ${message}`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={fullScreen ? 64 : 48}
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

  // Full-screen mode with ScreenLayout integration
  if (fullScreen) {
    return (
      <ScreenLayout
        scrollable={false}
        showsVerticalScrollIndicator={false}
        edges={['top']}
        edgeToEdge={true}
      >
        {content}
      </ScreenLayout>
    );
  }

  // Regular inline usage with card styling
  return content;
};

const createStyles = (theme: AppTheme, fullScreen: boolean) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      ...(fullScreen
        ? {
            flex: 1,
            paddingHorizontal: theme.spacing.page,
            backgroundColor: 'transparent',
          }
        : {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.outline + '25',
            margin: theme.spacing.medium,
            // 🌟 Beautiful primary shadow for error state card
            ...getPrimaryShadow.card(theme),
          }),
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

export default ErrorState;
