import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppTheme } from '@/themes/types';
import { useTheme } from '@/providers/ThemeProvider';
import ThemedCard from '@/components/ThemedCard';
import ThemedButton from '@/components/ThemedButton';

interface TodaysGratitudeSummaryProps {
  todaysGratitudeCount: number;
  recentStatements: string[];
  navigation: any; // TODO: Use a more specific navigation prop type
  isLoading: boolean;
  error: string | null;
  onRetryFetch: () => void;
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    summarySection: {
      // No specific styles needed here if EnhancedHomeScreen handles margins
    } as ViewStyle,
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.lg, // Added margin top for spacing from previous element
    } as ViewStyle,
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    sectionTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onBackground,
      marginLeft: theme.spacing.sm,
      fontWeight: '600',
    } as TextStyle,
    viewAllLink: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      fontWeight: '600',
    } as TextStyle,
    summaryCard: {
      padding: 0, // Card itself has no padding, content will handle it
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
    } as ViewStyle,
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
      minHeight: 150, // Approx height to prevent layout jumps
    } as ViewStyle,
    loadingText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.md,
    } as TextStyle,
    errorCardContent: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      minHeight: 150,
    } as ViewStyle,
    errorText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      marginTop: theme.spacing.sm,
    } as TextStyle,
    summaryContent: {
      padding: theme.spacing.lg,
    } as ViewStyle,
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    } as ViewStyle,
    summaryCountContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    } as ViewStyle,
    summaryCount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginRight: theme.spacing.sm,
    } as TextStyle,
    summaryCountLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    } as TextStyle,
    chevronContainer: {} as ViewStyle,
    emptySummaryContainer: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    } as ViewStyle,
    emptySummaryText: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      marginTop: theme.spacing.md,
      textAlign: 'center',
    } as TextStyle,
    emptySummarySubtext: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      lineHeight: 20,
    } as TextStyle,
    recentStatementsContainer: {
      marginTop: theme.spacing.sm,
    } as ViewStyle,
    recentStatementsTitle: {
      ...theme.typography.labelSmall,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    } as TextStyle,
    recentStatementItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    } as ViewStyle,
    quoteIconContainer: {
      marginRight: theme.spacing.sm,
      marginTop: 2, // Align with text better
    } as ViewStyle,
    recentStatementText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
      lineHeight: 20,
    } as TextStyle,
  });

const TodaysGratitudeSummary: React.FC<TodaysGratitudeSummaryProps> = ({
  todaysGratitudeCount,
  recentStatements,
  navigation,
  isLoading,
  error,
  onRetryFetch,
}) => {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Özet Yükleniyor...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorCardContent}>
          <Icon name="alert-circle-outline" size={32} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <ThemedButton
            title="Tekrar Dene"
            onPress={onRetryFetch}
            variant="ghost"
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity onPress={() => navigation.navigate('PastEntriesTab')} activeOpacity={0.7}>
        <View style={styles.summaryContent}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryCountContainer}>
              <Text style={styles.summaryCount}>{todaysGratitudeCount}</Text>
              <Text style={styles.summaryCountLabel}>şükran ifadesi</Text>
            </View>
            <View style={styles.chevronContainer}>
              <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </View>
          </View>
          {todaysGratitudeCount === 0 ? (
            <View style={styles.emptySummaryContainer}>
              <Icon name="emoticon-happy-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptySummaryText}>
                Bugün için henüz şükran eklenmemiş.
              </Text>
              <Text style={styles.emptySummarySubtext}>
                İlk şükranını eklemek için dokun.
              </Text>
            </View>
          ) : (
            <View style={styles.recentStatementsContainer}>
              <Text style={styles.recentStatementsTitle}>Son eklenenler:</Text>
              {recentStatements.slice(0, 2).map((stmt, index) => (
                <View key={index} style={styles.recentStatementItem}>
                  <View style={styles.quoteIconContainer}>
                    <Icon name="format-quote-open" size={14} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.recentStatementText} numberOfLines={2}>
                    {stmt}
                  </Text>
                </View>
              ))}
              {recentStatements.length > 2 && (
                 <Text style={{...styles.recentStatementText, color: theme.colors.textSecondary, marginTop: theme.spacing.xs, fontStyle: 'italic'}}>
                    ve {recentStatements.length - 2} tane daha...
                 </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.summarySection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Icon name="calendar-check-outline" size={24} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Bugünün Özeti</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('PastEntriesTab')}>
          <Text style={styles.viewAllLink}>Tümünü Gör →</Text>
        </TouchableOpacity>
      </View>
      <ThemedCard style={styles.summaryCard}>{renderContent()}</ThemedCard>
    </View>
  );
};

export default TodaysGratitudeSummary;
