import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';

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
  const styles = createStyles(theme);

  const formatMainDate = (date: Date) =>
    date.toLocaleDateString('tr-TR', {
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
    if (isToday()) return 'Bugün';
    if (isYesterday()) return 'Dün';
    return entryDate.toLocaleDateString('tr-TR', { weekday: 'long' });
  };

  const year = formatYear(entryDate);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPressChangeDate}
        style={[styles.dateCard, isToday() && styles.todayCard]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Tarih seç: ${getDateLabel()}, ${formatMainDate(entryDate)}`}
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
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    dateCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.outline + '30',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    todayCard: {
      borderColor: theme.colors.primary + '30',
      backgroundColor: theme.colors.surface,
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
      marginBottom: 2,
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
