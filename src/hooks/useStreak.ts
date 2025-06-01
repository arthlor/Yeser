import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

import { getStreak } from '../api/gratitudeApi';
import { useProfileStore } from '../store/profileStore';

interface UseStreakReturn {
  streak: number | null;
  isLoading: boolean;
  error: string | null;
  fetchStreak: () => Promise<void>;
}

const useStreak = (): UseStreakReturn => {
  const setGlobalStreak = useProfileStore(state => state.setStreak);
  const setGlobalStreakLoading = useProfileStore(
    state => state.setStreakLoading
  );
  const setGlobalStreakError = useProfileStore(state => state.setStreakError);
  const [streak, setStreak] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Local loading for initial fetch or direct hook usage
  const [error, setError] = useState<string | null>(null); // Local error for direct hook usage

  const fetchStreakData = useCallback(async () => {
    setIsLoading(true);
    setGlobalStreakLoading(true);
    setError(null);
    setGlobalStreakError(null);
    try {
      const currentStreak = await getStreak();
      setStreak(currentStreak);
      setGlobalStreak(currentStreak);
    } catch (e: unknown) {
      console.error('Error fetching streak:', e);
      let errorMessage = 'Seri bilgisi alınamadı.';
      if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        typeof (e as { message: unknown }).message === 'string'
      ) {
        errorMessage = (e as { message: string }).message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      setError(errorMessage);
      setGlobalStreakError(errorMessage);
      setStreak(0); // Default to 0 on error for local state
      setGlobalStreak(0); // Default to 0 on error for global state
    } finally {
      setIsLoading(false);
      setGlobalStreakLoading(false);
    }
  }, [setGlobalStreak, setGlobalStreakLoading, setGlobalStreakError]);

  useFocusEffect(
    useCallback(() => {
      fetchStreakData();
    }, [fetchStreakData])
  );

  return { streak, isLoading, error, fetchStreak: fetchStreakData };
};

export default useStreak;
