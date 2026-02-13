import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';

import CalendarDay from './CalendarDay';
import CalendarHeader from './CalendarHeader';
import { CalendarThemeConfig, CalendarViewProps } from './types';
import {
  ENGLISH_LOCALIZATION,
  getNextMonth,
  getPreviousMonth,
  SPANISH_LOCALIZATION,
  TURKISH_LOCALIZATION,
} from './utils';
import { useTheme } from '@/providers/ThemeProvider';
import { alpha, getPrimaryShadow } from '@/themes/utils';
import type { AppTheme } from '@/themes/types';

// Initialize all locales from static constants immediately
LocaleConfig.locales.tr = {
  monthNames: TURKISH_LOCALIZATION.months,
  monthNamesShort: TURKISH_LOCALIZATION.months.map((m) => m.slice(0, 3)),
  dayNames: TURKISH_LOCALIZATION.days,
  dayNamesShort: TURKISH_LOCALIZATION.daysShort,
};
LocaleConfig.locales.en = {
  monthNames: ENGLISH_LOCALIZATION.months,
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ],
  dayNames: ENGLISH_LOCALIZATION.days,
  dayNamesShort: ENGLISH_LOCALIZATION.daysShort,
};
LocaleConfig.locales.es = {
  monthNames: SPANISH_LOCALIZATION.months,
  monthNamesShort: SPANISH_LOCALIZATION.months.map((m) => m.slice(0, 3)),
  dayNames: SPANISH_LOCALIZATION.days,
  dayNamesShort: SPANISH_LOCALIZATION.daysShort,
};

const CalendarView: React.FC<CalendarViewProps> = ({
  markedDates,
  currentMonth,
  onMonthChange,
  onDayPress,
  isLoading = false,
  isFutureMonth = false,
  hideHeader = false,
}) => {
  const { i18n } = useTranslation();
  const { theme } = useTheme();

  // Update default locale when language changes
  useEffect(() => {
    const lang = i18n.language;

    if (lang === 'en' || lang === 'tr' || lang === 'es') {
      // Explicitly re-set the locale configuration for the current language
      // to ensure any potential race conditions are resolved
      if (lang === 'tr') {
        LocaleConfig.locales.tr = {
          monthNames: TURKISH_LOCALIZATION.months,
          monthNamesShort: TURKISH_LOCALIZATION.months.map((m) => m.slice(0, 3)),
          dayNames: TURKISH_LOCALIZATION.days,
          dayNamesShort: TURKISH_LOCALIZATION.daysShort,
        };
      } else if (lang === 'es') {
        LocaleConfig.locales.es = {
          monthNames: SPANISH_LOCALIZATION.months,
          monthNamesShort: SPANISH_LOCALIZATION.months.map((m) => m.slice(0, 3)),
          dayNames: SPANISH_LOCALIZATION.days,
          dayNamesShort: SPANISH_LOCALIZATION.daysShort,
        };
      }

      LocaleConfig.defaultLocale = lang;
    } else {
      LocaleConfig.defaultLocale = 'en';
    }
  }, [i18n.language]);

  // Calendar theme configuration
  const calendarTheme: CalendarThemeConfig = useMemo(
    () => ({
      calendarBackground: 'transparent',
      textSectionTitleColor: theme.colors.onSurfaceVariant,
      selectedDayBackgroundColor: theme.colors.primary,
      selectedDayTextColor: theme.colors.onPrimary,
      todayTextColor: theme.colors.primary,
      dayTextColor: theme.colors.onSurface,
      textDisabledColor: alpha(theme.colors.onSurface, 0.4),
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
      // Use static constants for theme prop as well
      monthNames:
        i18n.language === 'en'
          ? ENGLISH_LOCALIZATION.months
          : i18n.language === 'es'
            ? SPANISH_LOCALIZATION.months
            : TURKISH_LOCALIZATION.months,
      dayNames:
        i18n.language === 'en'
          ? ENGLISH_LOCALIZATION.days
          : i18n.language === 'es'
            ? SPANISH_LOCALIZATION.days
            : TURKISH_LOCALIZATION.days,
      dayNamesShort:
        i18n.language === 'en'
          ? ENGLISH_LOCALIZATION.daysShort
          : i18n.language === 'es'
            ? SPANISH_LOCALIZATION.daysShort
            : TURKISH_LOCALIZATION.daysShort,
    }),
    [theme, i18n.language]
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
      {!hideHeader && (
        <CalendarHeader
          currentMonth={currentMonth}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          isLoading={isLoading}
          isNextMonthDisabled={isFutureMonth}
        />
      )}

      <Calendar
        key={`${currentMonth.toISOString()}-${i18n.language}`}
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
