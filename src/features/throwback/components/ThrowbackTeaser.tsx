import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import StatementDisplayCard from '@/shared/components/ui/StatementDisplayCard';
import { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';
import { logger } from '@/utils/debugConfig';

// Define a more specific type for the throwback entry prop
interface ThrowbackEntryData {
  statements: string[];
  entry_date: string; // Assuming date is a string that can be parsed by new Date()
}

interface ThrowbackTeaserProps {
  throwbackEntry: ThrowbackEntryData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void; // Refresh to get a new random entry
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    } as ViewStyle,
    // Edge-to-edge loading card with improved padding
    loadingCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 80,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...getPrimaryShadow.card(theme),
    } as ViewStyle,
    loadingTextMini: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.md,
      fontWeight: '500',
    } as TextStyle,
    // Edge-to-edge error card with improved styling
    errorCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.errorContainer,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      minHeight: 80,
      ...getPrimaryShadow.card(theme),
    } as ViewStyle,
    throwbackErrorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onErrorContainer,
      marginLeft: theme.spacing.md,
      flexShrink: 1,
      fontWeight: '500',
      lineHeight: 22,
    } as TextStyle,
    // Edge-to-edge placeholder card with better visual hierarchy
    placeholderCard: {
      borderRadius: 0,
      borderWidth: 0,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderStyle: 'dashed',
      borderTopColor: theme.colors.outline + '30',
      borderBottomColor: theme.colors.outline + '30',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface + '80',
      ...getPrimaryShadow.card(theme),
    } as ViewStyle,
    placeholderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    } as ViewStyle,
    placeholderTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.md,
      fontWeight: '700',
      textAlign: 'center',
    } as TextStyle,
    placeholderText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 22,
      textAlign: 'center',
      opacity: 0.8,
      fontWeight: '400',
      letterSpacing: 0.1,
    } as TextStyle,
    // Header section for statement card
    statementHeader: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outline + '15',
      ...getPrimaryShadow.card(theme),
    } as ViewStyle,
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    } as ViewStyle,
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    } as ViewStyle,
    headerTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.primary,
      marginLeft: theme.spacing.md,
      fontWeight: '700',
      letterSpacing: -0.2,
    } as TextStyle,
    refreshButton: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer + '40',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary + '30',
      alignItems: 'center',
      justifyContent: 'center',
      ...getPrimaryShadow.small(theme),
    } as ViewStyle,
    errorContentContainer: {
      flex: 1,
    } as ViewStyle,
    errorRetryText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onErrorContainer,
      fontSize: 12,
      opacity: 0.8,
      marginTop: 4,
    } as TextStyle,
    statementCardStyle: {
      marginHorizontal: theme.spacing.lg, // Add horizontal margin to match design
      marginVertical: 0, // Remove vertical margin since header handles spacing
    } as ViewStyle,
  });

const ThrowbackTeaser: React.FC<ThrowbackTeaserProps> = ({
  throwbackEntry,
  isLoading,
  error,
  onRefresh,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Debug logging
  React.useEffect(() => {
    logger.debug('ThrowbackTeaser Debug:', {
      hasEntry: !!throwbackEntry,
      isLoading,
      error: error?.substring(0, 100), // Log first 100 chars of error
      entryData: throwbackEntry
        ? {
            date: throwbackEntry.entry_date,
            statementsCount: throwbackEntry.statements?.length,
            firstStatement: throwbackEntry.statements?.[0]?.substring(0, 50),
          }
        : null,
      timestamp: new Date().toISOString(),
    });
  }, [throwbackEntry, isLoading, error]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingTextMini}>Geçmişten bir anı yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (error && !throwbackEntry) {
    // Show error only if no entry is present
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.errorCard} onPress={onRefresh} activeOpacity={0.7}>
          <Icon name="alert-circle-outline" size={20} color={theme.colors.onErrorContainer} />
          <View style={styles.errorContentContainer}>
            <Text style={styles.throwbackErrorText}>{error}</Text>
            {onRefresh && <Text style={styles.errorRetryText}>Tekrar denemek için dokunun</Text>}
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  if (!throwbackEntry) {
    // Show placeholder when no data available
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.placeholderCard}
          onPress={() => {
            logger.debug('ThrowbackTeaser: Manual refresh triggered by user tap');
            onRefresh?.();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.placeholderHeader}>
            <Icon name="history" size={24} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.placeholderTitle}>Geçmişten Anılar</Text>
          </View>
          <Text style={styles.placeholderText}>
            Minnet kayıtlarınız arttıkça, burada geçmişten güzel anılarınızı göreceksiniz ✨
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.statementHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Icon name="history" size={22} color={theme.colors.primary} />
            <Text style={styles.headerTitle}>Geçmişten Bir Anı</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Icon name="refresh" size={20} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Beautiful Statement Display Card */}
      <StatementDisplayCard
        statement={throwbackEntry.statements?.[0] || 'Geçmişten bir minnet ifadeniz var.'}
        date={throwbackEntry.entry_date}
        variant="inspiration"
        showQuotes={true}
        showTimestamp={true}
        animateEntrance={true}
        numberOfLines={3}
        style={styles.statementCardStyle}
      />
    </View>
  );
};

export default ThrowbackTeaser;
