import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { AppTheme } from '@/themes/types';
import { useTheme } from '@/providers/ThemeProvider';
import { getPrimaryShadow } from '@/themes/utils';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useUserProfile } from '@/shared/hooks';
import { getCurrentLocale } from '@/utils/localeUtils';
import { StatementCard } from '@/shared/components/ui';

interface PastEntryItemProps {
  entry: GratitudeEntry;
  index: number;
  onPress: (entry: GratitudeEntry) => void;
}

/**
 * Enhanced Past Entry Item with Edge-to-Edge Design
 *
 * DESIGN PHILOSOPHY:
 * 1. CONTENT ZONE: Edge-to-edge entry cards with rich preview content
 * 2. VISUAL DEPTH: Enhanced shadows and elevation for modern feel
 * 3. INTERACTION STATES: Better visual feedback and micro-interactions
 * 4. TYPOGRAPHY HIERARCHY: Consistent with established design system
 *
 * UX ENHANCEMENTS:
 * - Edge-to-edge card design with proper spacing
 * - Enhanced content preview with better readability
 * - Improved date formatting and relative time display
 * - Better visual hierarchy and interaction states
 * - Enhanced badges and progress indicators
 */
const PastEntryItem: React.FC<PastEntryItemProps> = ({ entry, index, onPress }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const entryDate = entry.entry_date ? new Date(entry.entry_date) : new Date();
  const isRecent = index < 3;
  const statementCount = entry.statements?.length || 0;
  const { profile } = useUserProfile();
  const dailyGoal = profile?.daily_gratitude_goal ?? 3;
  const isGoalComplete = statementCount >= dailyGoal;

  const formatDate = (date: Date) =>
    date.toLocaleDateString(getCurrentLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });

  const getRelativeDate = (date: Date) => {
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('pastEntries.item.relative.today');
    }
    if (diffDays === 1) {
      return t('pastEntries.item.relative.yesterday');
    }
    if (diffDays < 7) {
      return t('pastEntries.item.relative.days', { count: diffDays });
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return t('pastEntries.item.relative.weeks', { count: weeks });
    }
    const months = Math.floor(diffDays / 30);
    return t('pastEntries.item.relative.months', { count: months });
  };

  const getEnhancedContentPreview = () => {
    if (!entry.statements || entry.statements.length === 0) {
      return {
        preview: t('pastEntries.item.previewEmpty'),
        hasMore: false,
        isEmpty: true,
      };
    }

    // Create a more engaging preview
    const firstStatement = entry.statements[0];
    const preview =
      firstStatement.length > 120 ? firstStatement.substring(0, 120) + '...' : firstStatement;

    return {
      preview,
      hasMore: entry.statements.length > 1,
      isEmpty: false,
    };
  };

  const { preview, hasMore, isEmpty } = getEnhancedContentPreview();

  const handlePress = () => {
    onPress(entry);
  };

  return (
    <View style={styles.itemContainer}>
      <ThemedCard variant="elevated" density="comfortable" elevation="xs" style={styles.entryCard}>
        <TouchableOpacity
          onPress={handlePress}
          style={styles.cardContent}
          activeOpacity={0.8}
          accessibilityLabel={t('shared.statement.a11y.memoryLabel', {
            text: getRelativeDate(entryDate),
          })}
          accessibilityHint={t('shared.statement.a11y.tapToView')}
        >
          {/* Enhanced Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.dateSection}>
              <View style={styles.dateHeader}>
                <View style={styles.dateDisplayBadge}>
                  <Text style={styles.dayNumber}>{entryDate.getDate()}</Text>
                  <Text style={styles.monthText}>
                    {entryDate
                      .toLocaleDateString(getCurrentLocale(), { month: 'short' })
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.dateInfo}>
                  <Text style={[styles.relativeDate, isRecent && styles.recentText]}>
                    {getRelativeDate(entryDate)}
                  </Text>
                  <Text style={styles.fullDate}>{formatDate(entryDate)}</Text>
                  {isRecent && (
                    <View style={styles.recentBadge}>
                      <Icon name="clock-fast" size={12} color={theme.colors.primary} />
                      <Text style={styles.recentBadgeText}>{t('pastEntries.item.new')}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.statsSection}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{statementCount}</Text>
              </View>
              <Text style={styles.statLabel}> </Text>
            </View>
          </View>

          {/* Enhanced StatementCard Preview Section */}
          <View style={styles.contentSection}>
            {!isEmpty ? (
              <>
                <View style={styles.contentHeader}>
                  <Icon name="format-quote-open" size={16} color={theme.colors.primary + '60'} />
                  <Text style={styles.contentLabel}>{t('pastEntries.item.first')}</Text>
                </View>

                {/* 🚀 ENHANCED Statement Card Preview - READ-ONLY MODE */}
                <StatementCard
                  statement={entry.statements[0]}
                  variant="minimal"
                  showQuotes={false} // Already have quote icon above
                  animateEntrance={false}
                  numberOfLines={2}
                  onPress={() => onPress(entry)}
                  // ✨ Accessibility & Feedback
                  accessibilityLabel={t('shared.statement.a11y.preview', {
                    text: entry.statements[0],
                  })}
                  hapticFeedback={false} // Simplified feedback
                  style={styles.previewCard}
                  date={entry.entry_date}
                  moodEmoji={
                    ((entry.moods as Record<string, string> | undefined)?.['0'] as unknown as
                      | import('@/types/mood.types').MoodEmoji
                      | undefined) ?? null
                  }
                />

                {hasMore && (
                  <View style={styles.contentMeta}>
                    <Icon name="plus-circle-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.moreText}>+{statementCount - 1}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyContentPreview} numberOfLines={2}>
                {preview}
              </Text>
            )}
          </View>

          {/* Enhanced Footer Section */}
          <View style={styles.footerSection}>
            <View style={styles.progressContainer}>
              <View style={styles.progressLine}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min((statementCount / Math.max(dailyGoal, 1)) * 100, 100)}%`,
                      backgroundColor: isGoalComplete ? theme.colors.success : theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {isGoalComplete
                  ? t('pastEntries.item.goal.completeDay')
                  : t('pastEntries.item.goal.remaining', {
                      count: Math.max(dailyGoal - statementCount, 0),
                    })}
              </Text>
            </View>

            <View style={styles.actionContainer}>
              {isGoalComplete && (
                <View style={styles.achievementBadge}>
                  <Icon name="star" size={12} color={theme.colors.warning} />
                </View>
              )}
              <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </View>
          </View>
        </TouchableOpacity>
      </ThemedCard>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Edge-to-Edge Item Container
    itemContainer: {
      marginBottom: theme.spacing.sm,
    },
    entryCard: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.outline + '10',
      paddingVertical: 0,
      ...getPrimaryShadow.card(theme),
    },
    cardContent: {
      // Padding now handled by density="comfortable"
    },

    // Enhanced Header Section
    headerSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    dateSection: {
      flex: 1,
    },
    dateHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    dateDisplayBadge: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      ...getPrimaryShadow.small(theme),
    },
    dayNumber: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
      fontSize: 16,
      lineHeight: 18,
    },
    monthText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '600',
      fontSize: 8,
      letterSpacing: 0.8,
    },
    dateInfo: {
      flex: 1,
    },
    relativeDate: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      letterSpacing: -0.2,
      marginBottom: theme.spacing.xxs,
    },
    recentText: {
      color: theme.colors.primary,
      fontWeight: '700',
    },
    fullDate: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      letterSpacing: 0.1,
      marginBottom: theme.spacing.xs,
    },
    recentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.borderRadius.full,
      gap: theme.spacing.xs,
      alignSelf: 'flex-start',
      ...getPrimaryShadow.small(theme),
    },
    recentBadgeText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '700',
      fontSize: 9,
      letterSpacing: 0.8,
    },

    // Enhanced Stats Section
    statsSection: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    statBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.full,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
    statNumber: {
      ...theme.typography.titleMedium,
      color: theme.colors.onPrimary,
      fontWeight: '800',
      fontSize: 14,
    },
    statLabel: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },

    // Enhanced Content Section
    contentSection: {
      marginBottom: theme.spacing.md,
    },
    contentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    contentLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
    contentPreview: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      lineHeight: 22,
      fontWeight: '500',
      marginBottom: theme.spacing.sm,
    },
    previewCard: {
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.xs,
    },
    emptyContentPreview: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
      lineHeight: 22,
      marginBottom: theme.spacing.sm,
    },
    contentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    moreText: {
      ...theme.typography.labelMedium,
      color: theme.colors.primary,
      fontWeight: '600',
    },

    // Enhanced Footer Section
    footerSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.outline + '20',
    },
    progressContainer: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    progressLine: {
      height: 3,
      backgroundColor: theme.colors.primaryContainer + '40',
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      marginBottom: theme.spacing.xs,
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
    progressText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      fontSize: 11,
    },
    actionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    achievementBadge: {
      backgroundColor: theme.colors.warningContainer,
      borderRadius: theme.borderRadius.full,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      ...getPrimaryShadow.small(theme),
    },
  });

export default PastEntryItem;
