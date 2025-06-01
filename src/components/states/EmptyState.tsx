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

export type EmptyStateProps = {
  /**
   * Title of the empty state
   */
  title: string;

  /**
   * Description message
   */
  message?: string;

  /**
   * Icon name from MaterialCommunityIcons
   */
  icon?: string;

  /**
   * Label for the action button
   */
  actionLabel?: string;

  /**
   * Function to call when action button is pressed
   */
  onAction?: () => void;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;
};

/**
 * EmptyState is a component that displays a message when there's no data to show.
 * It provides a consistent way to handle empty states across the app with optional
 * action button and icon.
 *
 * @example
 * ```tsx
 * // Simple empty state
 * <EmptyState
 *   title="No Tasks"
 *   message="You don't have any tasks yet"
 * />
 *
 * // Empty state with action button
 * <EmptyState
 *   title="No Entries"
 *   message="Start your mindfulness journey by creating your first entry"
 *   icon="notebook"
 *   actionLabel="Create Entry"
 *   onAction={() => navigation.navigate('NewEntry')}
 * />
 * ```
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'information-outline',
  actionLabel,
  onAction,
  style,
}) => {
  const { theme } = useTheme();

  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const content = (
    <View
      style={[styles.container, style]}
      accessibilityRole="none"
      accessibilityLabel={`${title}${message ? `: ${message}` : ''}`}
    >
      <MaterialCommunityIcons
        name={icon}
        size={64}
        color={theme.colors.textSecondary}
        style={styles.icon}
      />

      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>

      {message && (
        <Text style={styles.message} accessibilityRole="text">
          {message}
        </Text>
      )}

      {onAction && actionLabel && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
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
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.medium,
      margin: theme.spacing.medium,
      minHeight: 200,
    },
    icon: {
      marginBottom: theme.spacing.large,
      opacity: 0.8,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.text,
      marginBottom: theme.spacing.small,
      textAlign: 'center',
    },
    message: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.large,
      textAlign: 'center',
    },
    actionButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.small,
      paddingHorizontal: theme.spacing.large,
      borderRadius: theme.borderRadius.small,
      marginTop: theme.spacing.medium,
    },
    actionText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimary,
    },
  });
};

export default EmptyState;
