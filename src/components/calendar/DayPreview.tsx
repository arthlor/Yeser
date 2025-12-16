import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { DayPreviewProps } from './types';
import { formatDateLocalized } from './utils';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

const DayPreview: React.FC<DayPreviewProps> = ({
  selectedDate,
  selectedEntry,
  isLoading,
  error,
  onViewEntry,
  onAddEntry,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!selectedDate) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.dateIconContainer}>
          <Icon name="calendar" size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.dateText}>{formatDateLocalized(selectedDate)}</Text>
          <Text style={styles.dateSubtext}>
            {selectedEntry ? t('calendar.day.hasEntry') : t('calendar.day.noEntry')}
          </Text>
        </View>
      </View>

      {/* Content */}
      {error ? (
        <>
          <View style={styles.divider} />
          <View style={styles.contentRow}>
            <Icon name="alert-circle" size={18} color={theme.colors.error} />
            <Text style={[styles.contentText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        </>
      ) : isLoading ? (
        <>
          <View style={styles.divider} />
          <View style={styles.contentRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.contentText}>{t('calendar.dayPreview.loading')}</Text>
          </View>
        </>
      ) : selectedEntry ? (
        <>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.quoteRow} onPress={onViewEntry} activeOpacity={0.7}>
            <Icon
              name="format-quote-open"
              size={14}
              color={theme.colors.outline}
              style={styles.quoteIcon}
            />
            <View style={styles.quoteContent}>
              <Text style={styles.quoteText} numberOfLines={2}>
                {selectedEntry.statements[0]}
              </Text>
              {selectedEntry.statements.length > 1 && (
                <Text style={styles.moreText}>+{selectedEntry.statements.length - 1}</Text>
              )}
            </View>
            <Icon name="chevron-right" size={20} color={theme.colors.outline} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.addRow} onPress={onAddEntry} activeOpacity={0.7}>
            <View style={styles.addIconContainer}>
              <Icon name="plus" size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.addText}>{t('calendar.dayPreview.addForDate')}</Text>
            <Icon name="chevron-right" size={20} color={theme.colors.outline} />
          </TouchableOpacity>
        </>
      )}
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
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    dateIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTextContainer: {
      flex: 1,
    },
    dateText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    dateSubtext: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginLeft: theme.spacing.md + 32 + theme.spacing.sm,
    },
    contentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    contentText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
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
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    addIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 1,
    },
  });

export default DayPreview;
