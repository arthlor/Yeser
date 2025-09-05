import { CalendarLocalization, CalendarStatsData, CustomMarkedDates } from './types';

// Turkish localization constants
export const TURKISH_LOCALIZATION: CalendarLocalization = {
  months: [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ],
  days: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  daysShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
};

// English localization constants
export const ENGLISH_LOCALIZATION: CalendarLocalization = {
  months: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/**
 * Format date string to Turkish locale
 */
export const formatDateToTurkish = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format month and year to Turkish
 */
export const formatMonthYear = (date: Date): string =>
  `${TURKISH_LOCALIZATION.months[date.getMonth()]} ${date.getFullYear()}`;

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
