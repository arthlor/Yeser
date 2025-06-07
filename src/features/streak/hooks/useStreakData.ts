import { queryKeys } from '@/api/queryKeys';
import { getStreakData } from '@/api/streakApi';
import { Streak } from '@/schemas/streakSchema';
import useAuthStore from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export const useStreakData = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery<Streak | null, Error>({
    queryKey: queryKeys.streaks(user?.id),
    queryFn: getStreakData,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in newer versions)
  });
};

// Enhanced hook that provides streak status and grace period information
export interface StreakStatus {
  streak: Streak | null;
  isLoading: boolean;
  status: 'active' | 'at_risk' | 'grace_period' | 'broken' | 'new';
  timeUntilMidnight: number; // milliseconds
  daysUntilRisk: number;
  statusMessage: string;
  canExtendToday: boolean;
}

export const useStreakStatus = (): StreakStatus => {
  const { data: streak, isLoading } = useStreakData();

  return useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    if (!streak) {
      return {
        streak: null,
        isLoading,
        status: 'new',
        timeUntilMidnight,
        daysUntilRisk: 0,
        statusMessage: 'Yeni bir seri başlatabilirsin!',
        canExtendToday: true,
      };
    }

    const lastEntryDate = streak.last_entry_date ? streak.last_entry_date.toISOString().split('T')[0] : null;
    const currentStreak = streak.current_streak;

    // Calculate status based on last entry date and current streak
    let status: StreakStatus['status'];
    let statusMessage: string;
    let daysUntilRisk: number;
    let canExtendToday: boolean;

    if (lastEntryDate === today) {
      // Entry made today - streak is active
      status = 'active';
      statusMessage = `Harika! ${currentStreak} günlük serin devam ediyor.`;
      daysUntilRisk = 1; // Risk tomorrow if no entry
      canExtendToday = false; // Already extended today
    } else if (lastEntryDate === getYesterday()) {
      // Last entry was yesterday - in grace period
      status = 'grace_period';
      const hours = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
      statusMessage = `Serin devam etmesi için bugün bir giriş yapman gerek! (${hours}s ${minutes}dk kaldı)`;
      daysUntilRisk = 0; // At risk now
      canExtendToday = true;
    } else if (currentStreak === 0) {
      status = 'broken';
      statusMessage = 'Serin sıfırlandı. Yeni bir başlangıç için bugün bir giriş yap!';
      daysUntilRisk = 0;
      canExtendToday = true;
    } else {
      // Should not happen with our grace period logic, but handle edge case
      status = 'at_risk';
      statusMessage = `Serin tehlikede! Bugün bir giriş yapmazsan ${currentStreak} günlük serin sıfırlanacak.`;
      daysUntilRisk = 0;
      canExtendToday = true;
    }

    return {
      streak,
      isLoading,
      status,
      timeUntilMidnight,
      daysUntilRisk,
      statusMessage,
      canExtendToday,
    };
  }, [streak, isLoading]);
};

// Helper function to get yesterday's date string
const getYesterday = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
};


