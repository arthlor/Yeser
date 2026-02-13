import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import type { MoodEmoji } from '@/types/mood.types';
import { AppTheme } from '@/themes/types';

interface HomeGratitudeListItemProps {
  statement: string;
  moodEmoji: MoodEmoji | null;
  onPress: () => void;
}

const HomeGratitudeListItem: React.FC<HomeGratitudeListItemProps> = React.memo(
  ({ statement, moodEmoji, onPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={styles.container}
        accessibilityRole="button"
        accessibilityLabel={t('home.todayList.itemA11y', {
          defaultValue: 'Today gratitude entry. {{statement}}',
          statement,
        })}
        accessibilityHint={t('home.todayList.itemHint', {
          defaultValue: 'Opens today entry details',
        })}
      >
        {/* Accent Bar */}
        <View style={styles.accentBar} />

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Quote with styled background */}
          <View style={styles.quoteWrapper}>
            <Icon name="format-quote-open" size={14} color={theme.colors.primary} />
            <Text style={styles.quoteText} numberOfLines={2}>
              {statement}
            </Text>
          </View>

          {/* Footer Row */}
          <View style={styles.footer}>
            <View style={styles.todayBadge}>
              <Icon name="clock-outline" size={12} color={theme.colors.primary} />
              <Text style={styles.todayText}>{t('pastEntries.item.relative.today')}</Text>
            </View>
            <View style={styles.rightSection}>
              {moodEmoji && <Text style={styles.moodEmoji}>{moodEmoji}</Text>}
              <Icon name="chevron-right" size={18} color={theme.colors.outline} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

HomeGratitudeListItem.displayName = 'HomeGratitudeListItem';

export default HomeGratitudeListItem;

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '20',
      overflow: 'hidden',
      marginBottom: theme.spacing.sm,
    },
    accentBar: {
      width: 4,
      backgroundColor: theme.colors.primary,
    },
    mainContent: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    quoteWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    quoteText: {
      flex: 1,
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      lineHeight: 22,
      fontStyle: 'italic',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    todayBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryContainer + '40',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
      gap: 4,
    },
    todayText: {
      ...theme.typography.labelSmall,
      color: theme.colors.primary,
      fontWeight: '700',
      fontSize: 10,
      letterSpacing: 0.5,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    moodEmoji: {
      fontSize: 18,
    },
  });
