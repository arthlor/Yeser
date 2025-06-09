import { calculateCalendarStats, calculateMonthlyStreak, getDateString, isToday } from '../utils';
import type { CustomMarkedDates } from '../types';

describe('Calendar Utils', () => {
  describe('calculateMonthlyStreak', () => {
    it('should return 0 for empty marked dates', () => {
      const markedDates: CustomMarkedDates = {};
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(0);
    });

    it('should return 1 for single marked date', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-15': { marked: true },
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(1);
    });

    it('should calculate consecutive dates correctly', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-15': { marked: true },
        '2024-01-16': { marked: true },
        '2024-01-17': { marked: true },
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(3);
    });

    it('should handle non-consecutive dates', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-15': { marked: true },
        '2024-01-16': { marked: true },
        '2024-01-18': { marked: true }, // Gap of 1 day
        '2024-01-19': { marked: true },
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(2); // Should be the longest consecutive sequence
    });

    it('should find the longest streak among multiple streaks', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-01': { marked: true },
        '2024-01-02': { marked: true }, // Streak of 2
        '2024-01-05': { marked: true },
        '2024-01-06': { marked: true },
        '2024-01-07': { marked: true },
        '2024-01-08': { marked: true }, // Streak of 4 (longest)
        '2024-01-15': { marked: true }, // Single day
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(4);
    });

    it('should ignore unmarked dates', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-15': { marked: true },
        '2024-01-16': { marked: false }, // Not marked
        '2024-01-17': { marked: true },
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(1); // Two separate single days
    });

    it('should handle dates in random order', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-17': { marked: true },
        '2024-01-15': { marked: true },
        '2024-01-16': { marked: true },
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(3); // Should sort and calculate correctly
    });

    it('should handle month boundaries correctly', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-30': { marked: true },
        '2024-01-31': { marked: true },
        '2024-02-01': { marked: true }, // Different month but consecutive
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(3); // Should work across month boundaries
    });

    it('should handle leap year dates', () => {
      const markedDates: CustomMarkedDates = {
        '2024-02-28': { marked: true },
        '2024-02-29': { marked: true }, // Leap year day
        '2024-03-01': { marked: true },
      };
      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(3);
    });
  });

  describe('calculateCalendarStats', () => {
    const currentMonth = new Date(2024, 0, 15); // January 2024

    it('should calculate stats for empty month', () => {
      const markedDates: CustomMarkedDates = {};
      const stats = calculateCalendarStats(markedDates, currentMonth);

      expect(stats.entryCount).toBe(0);
      expect(stats.monthlyStreak).toBe(0);
      expect(stats.totalDays).toBe(31); // January has 31 days
      expect(stats.completionRate).toBe(0);
    });

    it('should calculate stats correctly with some entries', () => {
      const markedDates: CustomMarkedDates = {
        '2024-01-01': { marked: true },
        '2024-01-02': { marked: true },
        '2024-01-03': { marked: true },
        '2024-01-05': { marked: true },
        '2024-01-06': { marked: true },
      };
      const stats = calculateCalendarStats(markedDates, currentMonth);

      expect(stats.entryCount).toBe(5);
      expect(stats.monthlyStreak).toBe(3); // Longest consecutive sequence
      expect(stats.totalDays).toBe(31);
      expect(stats.completionRate).toBeCloseTo(16.13, 2); // 5/31 * 100
    });

    it('should handle full month completion', () => {
      const markedDates: CustomMarkedDates = {};
      // Mark all days in January 2024
      for (let day = 1; day <= 31; day++) {
        const dateStr = `2024-01-${day.toString().padStart(2, '0')}`;
        markedDates[dateStr] = { marked: true };
      }

      const stats = calculateCalendarStats(markedDates, currentMonth);

      expect(stats.entryCount).toBe(31);
      expect(stats.monthlyStreak).toBe(31);
      expect(stats.totalDays).toBe(31);
      expect(stats.completionRate).toBe(100);
    });

    it('should handle February correctly', () => {
      const februaryMonth = new Date(2024, 1, 15); // February 2024 (leap year)
      const markedDates: CustomMarkedDates = {
        '2024-02-01': { marked: true },
        '2024-02-15': { marked: true },
        '2024-02-29': { marked: true }, // Leap day
      };

      const stats = calculateCalendarStats(markedDates, februaryMonth);

      expect(stats.entryCount).toBe(3);
      expect(stats.totalDays).toBe(29); // Leap year February
      expect(stats.completionRate).toBeCloseTo(10.34, 2); // 3/29 * 100
    });

    it('should handle non-leap year February', () => {
      const februaryMonth = new Date(2023, 1, 15); // February 2023 (non-leap year)
      const markedDates: CustomMarkedDates = {
        '2023-02-01': { marked: true },
        '2023-02-15': { marked: true },
      };

      const stats = calculateCalendarStats(markedDates, februaryMonth);

      expect(stats.entryCount).toBe(2);
      expect(stats.totalDays).toBe(28); // Non-leap year February
      expect(stats.completionRate).toBeCloseTo(7.14, 2); // 2/28 * 100
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      // Mock Date.now to return a fixed date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true for today date', () => {
      const todayString = '2024-01-15';
      expect(isToday(todayString)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterdayString = '2024-01-14';
      expect(isToday(yesterdayString)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrowString = '2024-01-16';
      expect(isToday(tomorrowString)).toBe(false);
    });

    it('should return false for different month', () => {
      const differentMonth = '2024-02-15';
      expect(isToday(differentMonth)).toBe(false);
    });

    it('should return false for different year', () => {
      const differentYear = '2023-01-15';
      expect(isToday(differentYear)).toBe(false);
    });
  });

  describe('getDateString', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = getDateString(date);
      expect(result).toBe('2024-01-15');
    });

    it('should handle single digit dates', () => {
      const date = new Date('2024-01-05T12:00:00Z');
      const result = getDateString(date);
      expect(result).toBe('2024-01-05');
    });

    it('should handle single digit months', () => {
      const date = new Date('2024-03-15T12:00:00Z');
      const result = getDateString(date);
      expect(result).toBe('2024-03-15');
    });

    it('should handle end of year', () => {
      const date = new Date('2024-12-31T12:00:00Z');
      const result = getDateString(date);
      expect(result).toBe('2024-12-31');
    });

    it('should handle start of year', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const result = getDateString(date);
      expect(result).toBe('2024-01-01');
    });

    it('should ignore time component', () => {
      const date1 = new Date('2024-01-15T00:00:00Z');
      const date2 = new Date('2024-01-15T23:59:59Z');

      expect(getDateString(date1)).toBe('2024-01-15');
      expect(getDateString(date2)).toBe('2024-01-15');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle invalid date strings gracefully', () => {
      const markedDates: CustomMarkedDates = {
        'invalid-date': { marked: true },
        '2024-01-15': { marked: true },
      };

      // The function should not crash and should process valid dates
      expect(() => calculateMonthlyStreak(markedDates)).not.toThrow();
    });

    it('should handle very large date ranges', () => {
      const markedDates: CustomMarkedDates = {};
      // Create a large range of consecutive dates
      for (let i = 0; i < 100; i++) {
        const date = new Date(2024, 0, 1 + i);
        const dateStr = getDateString(date);
        markedDates[dateStr] = { marked: true };
      }

      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(100);
    });

    it('should handle year boundaries correctly', () => {
      const markedDates: CustomMarkedDates = {
        '2023-12-30': { marked: true },
        '2023-12-31': { marked: true },
        '2024-01-01': { marked: true },
        '2024-01-02': { marked: true },
      };

      const result = calculateMonthlyStreak(markedDates);
      expect(result).toBe(4); // Should work across year boundaries
    });
  });
});
