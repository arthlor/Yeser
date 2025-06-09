import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { getPrimaryShadow } from '@/themes/utils';

interface PastEntriesHeaderProps {
  title: string;
  subtitle?: string;
  entryCount?: number;
}

/**
 * Enhanced Past Entries Header with Edge-to-Edge Design
 *
 * DESIGN PHILOSOPHY:
 * 1. HERO ZONE: Floating edge-to-edge header with comprehensive stats
 * 2. VISUAL DEPTH: Enhanced shadows and elevation for modern feel
 * 3. PROGRESS VISUALIZATION: Similar to DailyEntryScreen progress patterns
 * 4. TYPOGRAPHY HIERARCHY: Consistent with established design system
 *
 * UX ENHANCEMENTS:
 * - Edge-to-edge floating card design
 * - Enhanced stats visualization with progress indicators
 * - Better visual hierarchy and spacing
 * - Improved typography scale consistency
 */
const PastEntriesHeader: React.FC<PastEntriesHeaderProps> = ({ title, subtitle, entryCount }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const getSubtitleText = () => {
    if (subtitle) {
      return subtitle;
    }
    if (entryCount !== undefined) {
      const lastUpdate = new Date().toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
      });
      return `Son güncelleme: ${lastUpdate}`;
    }
    return undefined;
  };

  const getEnhancedStatsData = () => {
    if (entryCount === undefined) {
      return null;
    }

    // Calculate engaging stats similar to DailyEntryScreen patterns
    const today = new Date();
    const currentMonth = today.getMonth();
    const daysInMonth = new Date(today.getFullYear(), currentMonth + 1, 0).getDate();
    const dayOfMonth = today.getDate();

    // Monthly goal calculation
    const monthlyGoal = Math.floor(daysInMonth * 0.8); // 80% of days in month
    const monthlyProgress = Math.min((entryCount / monthlyGoal) * 100, 100);

    // Weekly streak calculation (simplified)
    const weeklyGoal = 5; // 5 days per week
    const weeklyProgress = Math.min(((entryCount % 7) / weeklyGoal) * 100, 100);

    return {
      total: entryCount,
      monthlyProgress: Math.round(monthlyProgress),
      monthlyGoal,
      weeklyProgress: Math.round(weeklyProgress),
      isOnTrack: monthlyProgress >= (dayOfMonth / daysInMonth) * 100,
    };
  };

  const stats = getEnhancedStatsData();

  return (
    <View style={styles.heroZone}>
      <ThemedCard variant="elevated" density="comfortable" elevation="card" style={styles.heroCard}>
        {/* Enhanced Main Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.titleContainer}>
            <View style={styles.iconContainer}>
              <Icon name="book-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.titleContent}>
              <Text style={styles.title}>{title}</Text>
              {getSubtitleText() && (
                <View style={styles.subtitleContainer}>
                  <Icon name="clock-outline" size={14} color={theme.colors.onSurfaceVariant} />
                  <Text style={styles.subtitle}>{getSubtitleText()}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Enhanced Stats Section with Progress Visualization */}
        {stats && (
          <View style={styles.statsSection}>
            {/* Primary Stats Grid */}
            <View style={styles.primaryStatsContainer}>
              <View style={styles.statItem}>
                <View style={styles.statBadge}>
                  <Text style={styles.statNumber}>{stats.total}</Text>
                </View>
                <Text style={styles.statLabel}>Toplam Kayıt</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statBadge}>
                  <Text style={styles.statNumber}>{stats.monthlyProgress}%</Text>
                </View>
                <Text style={styles.statLabel}>Aylık Hedef</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statBadge,
                    {
                      backgroundColor: stats.isOnTrack
                        ? theme.colors.successContainer
                        : theme.colors.warningContainer,
                    },
                  ]}
                >
                  <Icon
                    name={stats.isOnTrack ? 'trending-up' : 'trending-neutral'}
                    size={16}
                    color={
                      stats.isOnTrack
                        ? theme.colors.onSuccessContainer
                        : theme.colors.onWarningContainer
                    }
                  />
                </View>
                <Text style={styles.statLabel}>{stats.isOnTrack ? 'Hedefte' : 'Motivasyon'}</Text>
              </View>
            </View>

            {/* Enhanced Progress Visualization */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>
                  {stats.isOnTrack ? '🎯 Aylık hedefe doğru ilerliyorsun!' : '💪 Hedefe odaklan!'}
                </Text>
                <Text style={styles.progressSubtitle}>
                  {stats.monthlyGoal - stats.total > 0
                    ? `${stats.monthlyGoal - stats.total} kayıt daha`
                    : 'Aylık hedef tamamlandı!'}
                </Text>
              </View>

              {/* Progress Line */}
              <View style={styles.progressLineContainer}>
                <View style={styles.progressLine}>
                  <View
                    style={[
                      styles.progressLineFill,
                      {
                        width: `${Math.min(stats.monthlyProgress, 100)}%`,
                        backgroundColor: stats.isOnTrack
                          ? theme.colors.primary
                          : theme.colors.warning,
                      },
                    ]}
                  />
                </View>

                {/* Goal Achievement Indicator */}
                {stats.monthlyProgress >= 100 && (
                  <View style={styles.goalCompleteIndicator}>
                    <Icon name="check-circle" size={16} color={theme.colors.success} />
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </ThemedCard>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Edge-to-Edge Hero Zone
    heroZone: {
      paddingBottom: theme.spacing.lg,
    },
    heroCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '10',
      ...getPrimaryShadow.floating(theme),
    },

    // Enhanced Header Section
    headerSection: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '15',
      // Padding handled by density="comfortable"
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    titleContent: {
      flex: 1,
    },
    title: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onSurface,
      fontWeight: '700',
      letterSpacing: -0.5,
      marginBottom: theme.spacing.xs,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    subtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      letterSpacing: 0.1,
    },

    // Enhanced Stats Section
    statsSection: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      // Horizontal padding handled by card density
    },
    primaryStatsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    statBadge: {
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: theme.borderRadius.lg,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    statNumber: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    statLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '500',
      letterSpacing: 0.2,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.colors.outline + '25',
      marginHorizontal: theme.spacing.sm,
    },

    // Enhanced Progress Section
    progressSection: {
      // Container for progress visualization
    },
    progressHeader: {
      marginBottom: theme.spacing.sm,
    },
    progressTitle: {
      ...theme.typography.titleSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    progressSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      fontWeight: '500',
    },
    progressLineContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    progressLine: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.primaryContainer + '40',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    progressLineFill: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    goalCompleteIndicator: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.full,
      padding: 2,
      ...getPrimaryShadow.small(theme),
    },
  });

export default PastEntriesHeader;
