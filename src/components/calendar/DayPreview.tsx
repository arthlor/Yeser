import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { DayPreviewProps } from './types';
import { formatDateLocalized } from './utils';
import { StatementCard } from '@/shared/components/ui';
import { useTheme } from '../../providers/ThemeProvider';
import { getPrimaryShadow } from '../../themes/utils';
import { useTranslation } from 'react-i18next';

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

  const actionFooterStyle = React.useMemo(
    () => ({
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopColor: theme.colors.outline + '10',
    }),
    [theme]
  );

  if (!selectedDate) {
    return null;
  }

  return (
    <View
      style={[
        styles.previewCard,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline + '10',
          borderBottomColor: theme.colors.outline + '10',
          ...getPrimaryShadow.card(theme),
        },
      ]}
    >
      <View
        style={[
          styles.previewHeader,
          {
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outline + '15',
          },
        ]}
      >
        <Text
          style={[
            styles.previewDate,
            theme.typography.titleMedium,
            { color: theme.colors.onSurface },
          ]}
        >
          {formatDateLocalized(selectedDate)}
        </Text>
      </View>

      <View style={styles.contentSection}>
        {error ? (
          <View
            style={[
              styles.errorContainer,
              {
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                gap: theme.spacing.sm,
              },
            ]}
          >
            <Icon name="alert-circle" size={20} color={theme.colors.error} />
            <Text
              style={[styles.errorText, theme.typography.bodyMedium, { color: theme.colors.error }]}
            >
              {error}
            </Text>
          </View>
        ) : isLoading ? (
          <View
            style={[
              styles.loadingContainer,
              {
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
                gap: theme.spacing.sm,
              },
            ]}
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text
              style={[
                styles.loadingText,
                theme.typography.bodyMedium,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t('calendar.dayPreview.loading')}
            </Text>
          </View>
        ) : selectedEntry ? (
          <View style={styles.statementContainer}>
            <StatementCard
              statement={selectedEntry.statements[0]}
              variant="minimal"
              showQuotes={false}
              animateEntrance={false}
              numberOfLines={2}
              onPress={onViewEntry}
              style={styles.statementCardStyle}
              date={selectedDate}
              moodEmoji={
                ((selectedEntry.moods as Record<string, string> | undefined)?.['0'] as unknown as
                  | import('@/types/mood.types').MoodEmoji
                  | undefined) ?? null
              }
            />
            <TouchableOpacity
              onPress={onViewEntry}
              style={[styles.actionFooter, actionFooterStyle]}
            >
              <View style={[styles.actionContainer, { gap: theme.spacing.xs }]}>
                <Text
                  style={[
                    styles.actionText,
                    theme.typography.labelLarge,
                    { color: theme.colors.primary },
                  ]}
                >
                  {selectedEntry.statements.length > 1
                    ? t('calendar.dayPreview.viewMore', {
                        count: selectedEntry.statements.length - 1,
                      })
                    : t('calendar.dayPreview.details')}
                </Text>
                <Icon name="chevron-right" size={16} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onAddEntry}
            style={[
              styles.previewContent,
              {
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
              },
            ]}
          >
            <View style={[styles.emptyContainer, { gap: theme.spacing.sm }]}>
              <Icon name="plus-circle-outline" size={24} color={theme.colors.onSurfaceVariant} />
              <Text
                style={[
                  styles.emptyText,
                  theme.typography.bodyMedium,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t('calendar.dayPreview.addForDate')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  previewHeader: {},
  previewDate: {
    fontWeight: '600',
  },
  contentSection: {},
  statementContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statementCardStyle: {
    marginVertical: 0,
    borderWidth: 0,
  },
  actionFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewContent: {},
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionText: {
    fontWeight: '600',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyText: {
    flex: 1,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    lineHeight: 20,
  },
});

export default DayPreview;
