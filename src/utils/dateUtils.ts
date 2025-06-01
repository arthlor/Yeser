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
  formatString: string = 'yyyy-MM-dd',
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
export const getCurrentFormattedDate = (): string => {
  return formatDate(new Date());
};
