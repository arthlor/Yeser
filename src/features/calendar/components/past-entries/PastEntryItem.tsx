import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { AppTheme } from '@/themes/types';
import { useTheme } from '@/providers/ThemeProvider';
import { getCurrentLocale } from '@/utils/localeUtils';

interface PastEntryItemProps {
  entry: GratitudeEntry;
  index: number;
  onPress: (entry: GratitudeEntry) => void;
}

const PastEntryItem: React.FC<PastEntryItemProps> = ({ entry, index, onPress }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const entryDate = entry.entry_date ? new Date(entry.entry_date) : new Date();
  const isRecent = index < 3;
  const statementCount = entry.statements?.length || 0;

  const getRelativeDate = (date: Date) => {
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

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
      return t('pastEntries.item.relative.weeks', { count: Math.floor(diffDays / 7) });
    }
    return t('pastEntries.item.relative.months', { count: Math.floor(diffDays / 30) });
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(getCurrentLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });

  const firstStatement = entry.statements?.[0] || '';
  const hasMore = statementCount > 1;

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <TouchableOpacity style={styles.headerRow} onPress={() => onPress(entry)} activeOpacity={0.7}>
        <View style={styles.dateContainer}>
          <Text style={styles.dayNumber}>{entryDate.getDate()}</Text>
          <Text style={styles.monthText}>
            {entryDate.toLocaleDateString(getCurrentLocale(), { month: 'short' }).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.relativeDate, isRecent && styles.recentText]}>
            {getRelativeDate(entryDate)}
          </Text>
          <Text style={styles.fullDate}>{formatDate(entryDate)}</Text>
          {isRecent && (
            <View style={styles.recentBadge}>
              <Icon name="clock-fast" size={10} color={theme.colors.primary} />
              <Text style={styles.recentBadgeText}>{t('pastEntries.item.new')}</Text>
            </View>
          )}
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{statementCount}</Text>
        </View>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Quote Row */}
      {firstStatement ? (
        <TouchableOpacity
          style={styles.quoteRow}
          onPress={() => onPress(entry)}
          activeOpacity={0.7}
        >
          <Icon
            name="format-quote-open"
            size={14}
            color={theme.colors.outline}
            style={styles.quoteIcon}
          />
          <View style={styles.quoteContent}>
            <Text style={styles.quoteText} numberOfLines={2}>
              {firstStatement}
            </Text>
            {hasMore && <Text style={styles.moreText}>+{statementCount - 1}</Text>}
          </View>
          <Icon name="chevron-right" size={20} color={theme.colors.outline} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dateContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumber: {
      ...theme.typography.titleSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '800',
      fontSize: 14,
      lineHeight: 16,
    },
    monthText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '600',
      fontSize: 8,
      letterSpacing: 0.5,
    },
    headerTextContainer: {
      flex: 1,
    },
    relativeDate: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    recentText: {
      color: theme.colors.primary,
    },
    fullDate: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    recentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
      gap: 4,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    recentBadgeText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onPrimaryContainer,
      fontWeight: '700',
      fontSize: 9,
    },
    countBadge: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onPrimary,
      fontWeight: '800',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginLeft: theme.spacing.md + 40 + theme.spacing.sm,
    },
    quoteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    quoteIcon: {
      marginTop: 3,
    },
    quoteContent: {
      flex: 1,
    },
    quoteText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontStyle: 'italic',
      lineHeight: 22,
    },
    moreText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '600',
      marginTop: 4,
    },
  });

export default PastEntryItem;
