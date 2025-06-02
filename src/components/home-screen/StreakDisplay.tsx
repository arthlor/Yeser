import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '@/themes/types';
import { useTheme } from '@/providers/ThemeProvider';
import { EnhancedStreakVisual, type Milestone } from '@/components';

interface StreakDisplayProps {
  currentStreak: number;
  previousStreak?: number;
  isLoading: boolean;
  error?: string | null; // More specific error type if available
  onMilestoneReached?: (milestone: Milestone) => void;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      // The EnhancedStreakVisual already has its own card and margins,
      // so this container might just be for loading/error states
      // or if additional wrapping is needed in the future.
    } as ViewStyle,
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      minHeight: 150, // Approximate height of streak visual to avoid layout jumps
    } as ViewStyle,
    loadingText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.md,
    } as TextStyle,
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      backgroundColor: `${theme.colors.errorContainer}4D`, // Light error background
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.lg, // Match card margins
      marginVertical: theme.spacing.sm,
      minHeight: 100,
    } as ViewStyle,
    errorText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onErrorContainer,
      marginLeft: theme.spacing.sm,
      flexShrink: 1, // Allow text to wrap
    } as TextStyle,
  });

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  currentStreak,
  previousStreak,
  isLoading,
  error,
  onMilestoneReached,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Seri yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon
          name="alert-circle-outline"
          size={24}
          color={theme.colors.error}
        />
        <Text style={styles.errorText}>
          Seri bilgileri yüklenirken bir hata oluştu: {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EnhancedStreakVisual
        streakCount={currentStreak}
        previousStreakCount={previousStreak}
        onMilestoneReached={onMilestoneReached}
      />
    </View>
  );
};

export default StreakDisplay;
