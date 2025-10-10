import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import ThemedCard from '@/shared/components/ui/ThemedCard';

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getCurrentLocale } from '@/utils/localeUtils';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DailyEntryDatePickerProps {
  entryDate: Date;
  onPressChangeDate: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
}

const DailyEntryDatePicker: React.FC<DailyEntryDatePickerProps> = ({
  entryDate,
  onPressChangeDate,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const formatMainDate = (date: Date) =>
    date.toLocaleDateString(getCurrentLocale(), {
      day: 'numeric',
      month: 'long',
    });

  const formatYear = (date: Date) => {
    const currentYear = new Date().getFullYear();
    const dateYear = date.getFullYear();
    return dateYear !== currentYear ? dateYear.toString() : '';
  };

  const isToday = () => {
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  };

  const isYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return entryDate.toDateString() === yesterday.toDateString();
  };

  const getDateLabel = () => {
    if (isToday()) {
      return t('gratitude.labels.today');
    }
    if (isYesterday()) {
      return t('gratitude.labels.yesterday');
    }
    return entryDate.toLocaleDateString(getCurrentLocale(), { weekday: 'long' });
  };

  const year = formatYear(entryDate);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPressChangeDate}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('shared.ui.accessibility.selectDate', {
          date: getDateLabel(),
          formatted: formatMainDate(entryDate),
        })}
      >
        <ThemedCard
          variant={isToday() ? 'elevated' : 'default'}
          padding="compact"
          style={isToday() ? styles.todayCard : undefined}
        >
          <View style={styles.dateContent}>
            <View style={styles.mainContent}>
              <View style={styles.dateInfo}>
                <Text style={[styles.dateLabel, isToday() && styles.todayLabel]}>
                  {getDateLabel()}
                </Text>
                <View style={styles.dateRow}>
                  <Text style={[styles.mainDate, isToday() && styles.todayMainDate]}>
                    {formatMainDate(entryDate)}
                  </Text>
                  {year && <Text style={styles.yearText}>{year}</Text>}
                </View>
              </View>

              <View style={styles.iconContainer}>
                <Icon
                  name="calendar-month"
                  size={20}
                  color={isToday() ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              </View>
            </View>
          </View>
        </ThemedCard>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.sm,
    },
    dateCard: {
      // ThemedCard handles padding via density prop
    },
    todayCard: {
      borderColor: theme.colors.primary + '30',
      borderWidth: StyleSheet.hairlineWidth,
    },
    dateContent: {
      width: '100%',
    },
    mainContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateInfo: {
      flex: 1,
    },
    dateLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      letterSpacing: 0.3,
      marginBottom: theme.spacing.xxs,
    },
    todayLabel: {
      color: theme.colors.primary,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    mainDate: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.onSurface,
      letterSpacing: -0.2,
    },
    todayMainDate: {
      color: theme.colors.primary,
    },
    yearText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
    },
    iconContainer: {
      padding: theme.spacing.xs,
      opacity: 0.7,
    },
  });

export default DailyEntryDatePicker;
