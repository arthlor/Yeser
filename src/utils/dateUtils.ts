import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Formats a date string or Date object into a specified string format.
 * @param date The date to format (string or Date object).
 * @param formatString The desired output format (e.g., 'yyyy-MM-dd', 'PPP').
 * @param localeString The locale to use (e.g., 'en-US', 'tr'). Defaults to 'tr'.
 * @returns The formatted date string.
 */
export const formatDate = (
  date: string | Date,
  formatString = 'yyyy-MM-dd',
  localeString: 'tr' | 'en-US' = 'tr'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = localeString === 'tr' ? tr : undefined; // date-fns uses undefined for default English
  return format(dateObj, formatString, { locale });
};

/**
 * Gets the current date formatted as YYYY-MM-DD.
 * @returns The current date string.
 */
export const getCurrentFormattedDate = (): string => formatDate(new Date());

/**
 * Parses a time string (HH:MM:SS) into a Date object.
 * If the string is invalid or null/undefined, it defaults to 20:00:00 of the current day.
 * @param timeStr The time string to parse (e.g., "14:30:00").
 * @returns A Date object representing the parsed time.
 */
export const parseTimeStringToValidDate = (timeStr: string | null | undefined): Date => {
  const defaultTime = new Date();
  defaultTime.setHours(20, 0, 0, 0); // Default to 20:00:00

  if (timeStr) {
    // Regex to validate HH:MM:SS format
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (timeRegex.test(timeStr)) {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      const date = new Date(); // Use current date and set time
      date.setHours(hours, minutes, seconds, 0);
      // Check if the date is valid after setting hours, minutes, seconds
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  return defaultTime;
};
