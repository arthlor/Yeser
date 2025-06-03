import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedCard from '@/components/ThemedCard';
import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

// Define a more specific type for the throwback entry prop
interface ThrowbackEntryData {
  statements: string[];
  entry_date: string; // Assuming date is a string that can be parsed by new Date()
}

interface ThrowbackTeaserProps {
  throwbackEntry: ThrowbackEntryData | null;
  isLoading: boolean;
  error: string | null;
  onNavigateToThrowback: () => void;
  // onRetryFetch?: () => void; // Optional: if we add a retry mechanism specific to throwback
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      // Manages overall spacing for the teaser section if needed
      // marginHorizontal: theme.spacing.lg, // Example, if EnhancedHomeScreen doesn't handle it
      // marginTop: theme.spacing.md, // Example
    } as ViewStyle,
    loadingContainerMini: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      minHeight: 80,
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
    } as ViewStyle,
    loadingTextMini: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
    } as TextStyle,
    throwbackErrorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: theme.borderRadius.md,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
    } as ViewStyle,
    throwbackErrorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onErrorContainer,
      marginLeft: theme.spacing.xs,
      flexShrink: 1, // Allow text to wrap
    } as TextStyle,
    throwbackCard: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
    } as ViewStyle,
    throwbackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    } as ViewStyle,
    throwbackTitleText: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
      fontWeight: '600',
    } as TextStyle,
    throwbackContentText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.xs,
      lineHeight: 20,
    } as TextStyle,
    throwbackDateText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'right',
      fontStyle: 'italic',
    } as TextStyle,
  });

const ThrowbackTeaser: React.FC<ThrowbackTeaserProps> = ({
  throwbackEntry,
  isLoading,
  error,
  onNavigateToThrowback,
  // onRetryFetch,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainerMini}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingTextMini}>Geçmişten bir anı yükleniyor...</Text>
      </View>
    );
  }

  if (error && !throwbackEntry) {
    // Show error only if no entry is present
    return (
      <View style={styles.throwbackErrorContainer}>
        <Icon name="alert-circle-outline" size={20} color={theme.colors.onErrorContainer} />
        <Text style={styles.throwbackErrorText}>{error}</Text>
        {/* Optional: Add retry button here if onRetryFetch is provided */}
      </View>
    );
  }

  if (!throwbackEntry) {
    return null; // Or some placeholder if no throwback is available and not loading/error
  }

  return (
    <View style={styles.container}>
      <ThemedCard style={styles.throwbackCard} elevation="xs">
        <TouchableOpacity onPress={onNavigateToThrowback} activeOpacity={0.7}>
          <View style={styles.throwbackHeader}>
            <Icon name="history" size={20} color={theme.colors.primary} />
            <Text style={styles.throwbackTitleText}>Geçmişten Bir Anı</Text>
          </View>
          <Text style={styles.throwbackContentText} numberOfLines={2}>
            {throwbackEntry.statements?.[0] || 'Geçmişten bir şükran ifadeniz var.'}
          </Text>
          <Text style={styles.throwbackDateText}>
            {format(new Date(throwbackEntry.entry_date), 'dd MMMM yyyy', { locale: tr })}
          </Text>
        </TouchableOpacity>
      </ThemedCard>
    </View>
  );
};

export default ThrowbackTeaser;
