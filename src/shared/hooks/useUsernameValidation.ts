import { useCallback, useEffect, useState } from 'react';
import { checkUsernameAvailability } from '@/api/profileApi';
import { logger } from '@/utils/debugConfig';

interface UseUsernameValidationResult {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
  checkUsername: (username: string) => void;
}

const DEBOUNCE_DELAY = 500; // 500ms debounce

export const useUsernameValidation = (): UseUsernameValidationResult => {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (username: string) => {
    // Clear previous timer using current ref value
    setDebounceTimer((prevTimer) => {
      if (prevTimer) {
        clearTimeout(prevTimer);
      }
      return null;
    });

    // Reset states
    setError(null);
    setIsAvailable(null);

    // Basic validation first
    if (!username || username.length < 3) {
      return; // Don't check if username is too short
    }

    if (username.length > 50) {
      setError('Kullanıcı adı en fazla 50 karakter olabilir');
      return;
    }

    // Set up debounced check
    const timer = setTimeout(async () => {
      setIsChecking(true);
      logger.debug(`Checking username availability for: "${username}"`);

      try {
        const available = await checkUsernameAvailability(username);
        logger.debug(`Username "${username}" availability result:`, { available });

        setIsAvailable(available);

        if (!available) {
          setError('Bu kullanıcı adı zaten kullanılıyor');
          logger.debug(`Setting error: username "${username}" is not available`);
        } else {
          logger.debug(`Username "${username}" is available`);
        }
      } catch (err) {
        logger.error('Username availability check failed:', err as Error);
        setError('Kullanıcı adı kontrol edilirken bir hata oluştu');
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, DEBOUNCE_DELAY);

    setDebounceTimer(timer);
  }, []); // Remove debounceTimer dependency to break the cycle

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    isChecking,
    isAvailable,
    error,
    checkUsername,
  };
};
