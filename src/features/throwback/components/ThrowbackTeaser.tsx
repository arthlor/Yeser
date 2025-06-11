import React, { useCallback, useMemo } from 'react';
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

const ThrowbackTeaser: React.FC<ThrowbackTeaserProps> = React.memo(
  ({ throwbackEntry, isLoading, error, onRefresh }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    /**
     * **ANIMATION SIMPLIFICATION COMPLETED**: 
     * - Eliminated refresh rotation animation (360deg spin)
     * - Removed pulse animation for loading states
     * - Simplified to basic state-based visual feedback
     * - Maintained all functionality with cleaner, minimal approach
     * - Reduced from 2+ animation instances to 0 animations
     * - Performance improved by removing animation overhead
     */

    // Enhanced refresh handler - simplified without animations
    const handleRefresh = useCallback(() => {
      if (!onRefresh) {
        return;
      }
      onRefresh();
    }, [onRefresh]);

    // Debug logging - FIXED: Remove unstable timestamp to prevent infinite re-renders
    const debugData = useMemo(
      () => ({
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
      }),
      [throwbackEntry, isLoading, error]
    );

    React.useEffect(() => {
      logger.debug('ThrowbackTeaser Debug:', {
        ...debugData,
        timestamp: new Date().toISOString(), // Move timestamp here to prevent re-render loop
      });
    }, [debugData]); // Use memoized debugData instead of individual props

    // Enhanced loading state with better visual feedback
    if (isLoading) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingCard}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
            <View style={styles.loadingContent}>
              <Text style={styles.loadingTitle}>Geçmişten Anılar</Text>
              <Text style={styles.loadingSubtitle}>Güzel bir anı yükleniyor...</Text>
            </View>
          </View>
        </View>
      );
    }

    // Enhanced error state with better visual hierarchy
    if (error && !throwbackEntry) {
      return (
        <View style={styles.container}>
          <TouchableOpacity style={styles.errorCard} onPress={onRefresh} activeOpacity={0.8}>
            <View style={styles.errorIconContainer}>
              <Icon name="alert-circle-outline" size={20} color={theme.colors.onErrorContainer} />
            </View>
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Anı Yüklenemedi</Text>
              <Text style={styles.errorSubtitle}>{error}</Text>
              {onRefresh && <Text style={styles.errorRetryText}>Tekrar denemek için dokunun</Text>}
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Enhanced placeholder state with inspiring design
    if (!throwbackEntry) {
      return (
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.placeholderCard}
            onPress={() => {
              logger.debug('ThrowbackTeaser: Manual refresh triggered by user tap');
              onRefresh?.();
            }}
            activeOpacity={0.8}
          >
            <View style={styles.placeholderIconContainer}>
              <Icon name="history" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.placeholderContent}>
              <Text style={styles.placeholderTitle}>Geçmişten Anılar</Text>
              <Text style={styles.placeholderSubtitle}>
                Minnet kayıtlarınız arttıkça, burada geçmişten güzel anılarınızı göreceksiniz
              </Text>
              <View style={styles.placeholderHint}>
                <Icon name="sparkles" size={14} color={theme.colors.tertiary} />
                <Text style={styles.placeholderHintText}>Başlamak için dokunun</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    // Enhanced main content with stable rendering
    return (
      <View style={styles.container}>
        {/* Enhanced Header Section */}
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Icon name="history" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Geçmişten Bir Anı</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Icon name="refresh" size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Statement Display Card */}
        <StatementDisplayCard
          statement={throwbackEntry.statements?.[0] || 'Geçmişten bir minnet ifadeniz var.'}
          date={throwbackEntry.entry_date}
          variant="inspiration"
          showQuotes={true}
          showTimestamp={true}
          animateEntrance={true}
          numberOfLines={4}
          edgeToEdge={true}
          style={styles.statementCardStyle}
        />
      </View>
    );
  }
);

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    } as ViewStyle,

    // Enhanced loading card with better visual hierarchy
    loadingCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      borderBottomColor: theme.colors.outlineVariant,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      ...getPrimaryShadow.card(theme),
    } as ViewStyle,

    loadingIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    } as ViewStyle,

    loadingContent: {
      flex: 1,
    } as ViewStyle,

    loadingTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    } as TextStyle,

    loadingSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '400',
      opacity: 0.8,
    } as TextStyle,

    // Enhanced error card with better design
    errorCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.errorContainer,
      borderWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.error,
      borderBottomColor: theme.colors.error,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      minHeight: 64,
      ...getPrimaryShadow.card(theme),
    } as ViewStyle,

    errorIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.onErrorContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
      opacity: 0.15,
    } as ViewStyle,

    errorContent: {
      flex: 1,
    } as ViewStyle,

    errorTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onErrorContainer,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    } as TextStyle,

    errorSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onErrorContainer,
      fontWeight: '400',
      lineHeight: 18,
      opacity: 0.9,
    } as TextStyle,

    errorRetryText: {
      ...theme.typography.bodySmall,
      color: theme.colors.onErrorContainer,
      fontSize: 11,
      opacity: 0.7,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    } as TextStyle,

    // Enhanced placeholder card with inspiring design
    placeholderCard: {
      borderRadius: 0,
      borderWidth: 0,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderStyle: 'dashed',
      borderTopColor: theme.colors.outline,
      borderBottomColor: theme.colors.outline,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      minHeight: 100,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      ...getPrimaryShadow.card(theme),
    } as ViewStyle,

    placeholderIconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    } as ViewStyle,

    placeholderContent: {
      alignItems: 'center',
    } as ViewStyle,

    placeholderTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    } as TextStyle,

    placeholderSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
      textAlign: 'center',
      opacity: 0.8,
      fontWeight: '400',
      letterSpacing: 0.1,
      marginBottom: theme.spacing.sm,
    } as TextStyle,

    placeholderHint: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.tertiaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      gap: theme.spacing.xs,
    } as ViewStyle,

    placeholderHintText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onTertiaryContainer,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    } as TextStyle,

    // Enhanced header card with better visual hierarchy
    headerCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outlineVariant,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.outlineVariant,
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

    headerIconContainer: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    } as ViewStyle,

    headerTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.primary,
      fontWeight: '600',
      letterSpacing: -0.1,
    } as TextStyle,

    refreshButton: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...getPrimaryShadow.small(theme),
    } as ViewStyle,

    // Enhanced statement card styling
    statementCardStyle: {
      marginHorizontal: 0,
      marginVertical: 0,
    } as ViewStyle,
  });

ThrowbackTeaser.displayName = 'ThrowbackTeaser';

export default ThrowbackTeaser;
