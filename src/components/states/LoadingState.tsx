import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../themes/types';
import { ScreenLayout } from '../../shared/components/layout';
import { getPrimaryShadow } from '@/themes/utils';

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
   * Whether to render as a full screen with ScreenLayout
   * When true, renders with ScreenLayout wrapper for screen-level usage
   * When false, renders as inline component
   */
  fullScreen?: boolean;

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
 * // Simple loading state (inline)
 * <LoadingState />
 *
 * // Loading state with message (inline)
 * <LoadingState message="Loading your data..." />
 *
 * // Full-screen loading state
 * <LoadingState fullScreen message="Loading your profile..." />
 *
 * // Loading overlay
 * <LoadingState overlay={true} message="Please wait" />
 * ```
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = 'large',
  overlay = false,
  fullScreen = false,
  style,
}) => {
  const { theme } = useTheme();

  const styles = React.useMemo(
    () => createStyles(theme, overlay, fullScreen),
    [theme, overlay, fullScreen]
  );

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

  // Regular inline usage
  return content;
};

const createStyles = (theme: AppTheme, overlay: boolean, fullScreen: boolean) =>
  StyleSheet.create({
    container: {
      ...(fullScreen
        ? {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.page,
          }
        : {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.outline + '25',
            alignItems: 'center',
            justifyContent: 'center',
            margin: theme.spacing.medium,
            minHeight: 120,
            // 🌟 Beautiful primary shadow for loading state card
            ...getPrimaryShadow.card(theme),
          }),
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
