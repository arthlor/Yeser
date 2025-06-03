import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../themes/types';

export interface LoadingStateProps {
  /**
   * Message to display below the loading indicator
   */
  message?: string;

  /**
   * Size of the loading indicator
   */
  size?: 'small' | 'large';

  /**
   * Whether to show the loading indicator with a transparent overlay
   */
  overlay?: boolean;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;
}

/**
 * LoadingState is a component that displays a loading indicator with an optional message.
 * It can be used as a full-screen loading state or as an inline component.
 *
 * @example
 * ```tsx
 * // Simple loading state
 * <LoadingState />
 *
 * // Loading state with message
 * <LoadingState message="Loading your data..." />
 *
 * // Loading overlay
 * <LoadingState overlay={true} message="Please wait" />
 * ```
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = 'large',
  overlay = false,
  style,
}) => {
  const { theme } = useTheme();

  const styles = React.useMemo(() => createStyles(theme, overlay), [theme, overlay]);

  const content = (
    <View style={[styles.container, style]} accessibilityRole="progressbar">
      <ActivityIndicator size={size} color={theme.colors.primary} accessibilityLabel="Loading" />
      {message && (
        <Text style={styles.message} accessibilityRole="text">
          {message}
        </Text>
      )}
    </View>
  );

  return content;
};

const createStyles = (theme: AppTheme, overlay: boolean) =>
  StyleSheet.create({
    container: {
      padding: theme.spacing.large,
      alignItems: 'center',
      justifyContent: 'center',
      ...(overlay && {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 999,
      }),
    },
    message: {
      ...theme.typography.bodyMedium,
      color: theme.colors.text,
      marginTop: theme.spacing.medium,
      textAlign: 'center',
    },
  });

export default LoadingState;
