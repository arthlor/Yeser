import { CalendarLocalization, CalendarStatsData, CustomMarkedDates } from './types';
import i18n from '@/i18n';

// Turkish localization constants from i18n
export const TURKISH_LOCALIZATION: CalendarLocalization = {
  months: i18n.t('shared.calendar.months', { returnObjects: true, lng: 'tr' }) as string[],
  days: i18n.t('shared.calendar.days', { returnObjects: true, lng: 'tr' }) as string[],
  daysShort: i18n.t('shared.calendar.daysShort', { returnObjects: true, lng: 'tr' }) as string[],
};

// English localization constants from i18n
export const ENGLISH_LOCALIZATION: CalendarLocalization = {
  months: i18n.t('shared.calendar.months', { returnObjects: true, lng: 'en' }) as string[],
  days: i18n.t('shared.calendar.days', { returnObjects: true, lng: 'en' }) as string[],
  daysShort: i18n.t('shared.calendar.daysShort', { returnObjects: true, lng: 'en' }) as string[],
};

// Dynamic localization using i18n
export const getCalendarLocalization = (): CalendarLocalization => {
  if (!i18n.isInitialized) {
    // Fallback to English localization if i18n is not ready
    return ENGLISH_LOCALIZATION;
  }

  return {
    months: i18n.t('shared.calendar.months', { returnObjects: true }) as string[],
    days: i18n.t('shared.calendar.days', { returnObjects: true }) as string[],
    daysShort: i18n.t('shared.calendar.daysShort', { returnObjects: true }) as string[],
  };
};

/**
 * Format date string to Turkish locale
 */
export const formatDateLocalized = (dateString: string, locale?: string): string => {
  const date = new Date(dateString);
  const resolved =
    locale || (i18n.isInitialized ? i18n.language : Intl.DateTimeFormat().resolvedOptions().locale);
  const map = resolved === 'en' ? 'en-US' : resolved === 'tr' ? 'tr-TR' : resolved;
  return date.toLocaleDateString(map, { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Format month and year using current locale
 */
export const formatMonthYear = (date: Date): string => {
  const localization = getCalendarLocalization();
  return `${localization.months[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Calculate number of entries in current month
 */
export const calculateEntryCount = (markedDates: CustomMarkedDates): number =>
  Object.keys(markedDates).filter((date) => markedDates[date].marked).length;

/**
 * Calculate longest streak in current month
 */
export const calculateMonthlyStreak = (markedDates: CustomMarkedDates): number => {
  const dates = Object.keys(markedDates)
    .filter((date) => markedDates[date].marked)
    .sort();

  if (dates.length === 0) {
    return 0;
  }

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const currentDate = new Date(dates[i]);
    const prevDate = new Date(dates[i - 1]);

    const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
};

/**
 * Calculate calendar statistics for current month
 */
export const calculateCalendarStats = (
  markedDates: CustomMarkedDates,
  currentMonth: Date
): CalendarStatsData => {
  const entryCount = calculateEntryCount(markedDates);
  const monthlyStreak = calculateMonthlyStreak(markedDates);

  // Calculate total days in current month
  const totalDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  // Calculate completion rate
  const completionRate = totalDays > 0 ? (entryCount / totalDays) * 100 : 0;

  return {
    entryCount,
    monthlyStreak,
    totalDays,
    completionRate,
  };
};

/**
 * Check if a date is today
 */
export const isToday = (dateString: string): boolean =>
  dateString === new Date().toISOString().split('T')[0];

/**
 * Get date string in YYYY-MM-DD format
 */
export const getDateString = (date: Date): string => date.toISOString().split('T')[0];

/**
 * Navigate to previous month
 */
export const getPreviousMonth = (currentMonth: Date): Date => {
  const newDate = new Date(currentMonth);
  newDate.setMonth(newDate.getMonth() - 1);
  return newDate;
};

/**
 * Navigate to next month
 */
export const getNextMonth = (currentMonth: Date): Date => {
  const newDate = new Date(currentMonth);
  newDate.setMonth(newDate.getMonth() + 1);
  return newDate;
};

/**
 * Update marked dates with selection
 */
export const updateMarkedDatesWithSelection = (
  markedDates: CustomMarkedDates,
  selectedDate: string,
  selectionColor: string,
  selectionTextColor: string,
  dotColor: string
): CustomMarkedDates => {
  const updatedMarkedDates = { ...markedDates };

  // Remove previous selection
  Object.keys(updatedMarkedDates).forEach((date) => {
    if (updatedMarkedDates[date].selected) {
      updatedMarkedDates[date] = {
        ...updatedMarkedDates[date],
        selected: false,
      };
    }
  });

  // Add new selection
  const existingEntry = updatedMarkedDates[selectedDate];
  updatedMarkedDates[selectedDate] = {
    ...existingEntry,
    selected: true,
    selectedColor: selectionColor,
    selectedTextColor: selectionTextColor,
    marked: existingEntry?.marked ?? false,
    dotColor: existingEntry?.marked ? dotColor : undefined,
  };

  return updatedMarkedDates;
};
