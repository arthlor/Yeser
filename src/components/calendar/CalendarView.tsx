import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

import CalendarDay from './CalendarDay';
import CalendarHeader from './CalendarHeader';
import { CalendarThemeConfig, CalendarViewProps } from './types';
import { getNextMonth, getPreviousMonth, TURKISH_LOCALIZATION } from './utils';
import { useTheme } from '../../providers/ThemeProvider';
import { getPrimaryShadow } from '../../themes/utils';
import type { AppTheme } from '../../themes/types';

// Configure Turkish locale for react-native-calendars
LocaleConfig.locales.tr = {
  monthNames: TURKISH_LOCALIZATION.months,
  monthNamesShort: [
    'Oca',
    'Şub',
    'Mar',
    'Nis',
    'May',
    'Haz',
    'Tem',
    'Ağu',
    'Eyl',
    'Eki',
    'Kas',
    'Ara',
  ],
  dayNames: TURKISH_LOCALIZATION.days,
  dayNamesShort: TURKISH_LOCALIZATION.daysShort,
};
LocaleConfig.defaultLocale = 'tr';

const CalendarView: React.FC<CalendarViewProps> = ({
  markedDates,
  currentMonth,
  onMonthChange,
  onDayPress,
  isLoading = false,
  isFutureMonth = false,
}) => {
  const { theme } = useTheme();

  // Calendar theme configuration
  const calendarTheme: CalendarThemeConfig = useMemo(
    () => ({
      calendarBackground: 'transparent',
      textSectionTitleColor: theme.colors.onSurfaceVariant,
      selectedDayBackgroundColor: theme.colors.primary,
      selectedDayTextColor: theme.colors.onPrimary,
      todayTextColor: theme.colors.primary,
      dayTextColor: theme.colors.onSurface,
      textDisabledColor: theme.colors.surfaceDisabled ?? `${theme.colors.onSurface}40`,
      dotColor: theme.colors.primary,
      selectedDotColor: theme.colors.onPrimary,
      arrowColor: theme.colors.primary,
      monthTextColor: theme.colors.onSurface,
      indicatorColor: theme.colors.primary,
      textDayFontFamily: 'System',
      textMonthFontFamily: 'System',
      textDayHeaderFontFamily: 'System',
      textDayFontSize: 16,
      textMonthFontSize: 18,
      textDayHeaderFontSize: 14,
      monthNames: TURKISH_LOCALIZATION.months,
      dayNames: TURKISH_LOCALIZATION.days,
      dayNamesShort: TURKISH_LOCALIZATION.daysShort,
    }),
    [theme]
  );

  const handlePreviousMonth = () => {
    const prevMonth = getPreviousMonth(currentMonth);
    onMonthChange({
      timestamp: prevMonth.getTime(),
      dateString: prevMonth.toISOString().split('T')[0],
      day: prevMonth.getDate(),
      month: prevMonth.getMonth() + 1,
      year: prevMonth.getFullYear(),
    });
  };

  const handleNextMonth = () => {
    const nextMonth = getNextMonth(currentMonth);
    onMonthChange({
      timestamp: nextMonth.getTime(),
      dateString: nextMonth.toISOString().split('T')[0],
      day: nextMonth.getDate(),
      month: nextMonth.getMonth() + 1,
      year: nextMonth.getFullYear(),
    });
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  const todayString = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <CalendarHeader
        currentMonth={currentMonth}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        isLoading={isLoading}
        isNextMonthDisabled={isFutureMonth}
      />

      <Calendar
        key={currentMonth.toISOString()}
        current={currentMonth.toISOString().split('T')[0]}
        onMonthChange={onMonthChange}
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={calendarTheme}
        enableSwipeMonths
        hideExtraDays={false}
        firstDay={1}
        style={styles.calendar}
        hideArrows
        disableMonthChange
        renderHeader={() => null}
        dayComponent={({ date, state }) => (
          <CalendarDay
            date={date ?? null}
            state={state === 'disabled' || state === 'today' ? state : undefined}
            marking={markedDates[date?.dateString ?? ''] ?? {}}
            onPress={onDayPress}
            maxDate={todayString}
          />
        )}
      />
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // Edge-to-Edge Calendar Container
    container: {
      borderRadius: 0,
      backgroundColor: theme.colors.surface,
      borderWidth: 0,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: theme.colors.outline + '10',
      borderBottomColor: theme.colors.outline + '10',
      marginBottom: theme.spacing.md,
      overflow: 'hidden',
      ...getPrimaryShadow.card(theme),
    },
    calendar: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
  });

export default CalendarView;
