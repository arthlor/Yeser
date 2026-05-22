import { useCallback, useEffect, useRef, useState } from 'react';
import { checkUsernameAvailability } from '@/features/settings/profileApi';
import i18n from '@/i18n';
import { logger } from '@/utils/debugConfig';

interface UseUsernameValidationResult {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
  checkUsername: (username: string) => void;
}

const DEBOUNCE_DELAY = 500; // 500ms debounce

const normalizeUsername = (value: string): string => value.trim().toLocaleLowerCase('tr-TR');

export const useUsernameValidation = (
  currentUsername?: string | null
): UseUsernameValidationResult => {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const checkUsername = useCallback(
    async (username: string) => {
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
      const normalizedUsername = normalizeUsername(username);
      const normalizedCurrentUsername = currentUsername ? normalizeUsername(currentUsername) : null;

      if (!username || username.length < 3) {
        return; // Don't check if username is too short
      }

      if (username.length > 50) {
        setError(
          i18n.t('validation.usernameTooLong', {
            defaultValue: 'Username can be at most 50 characters',
          })
        );
        return;
      }

      if (normalizedCurrentUsername && normalizedUsername === normalizedCurrentUsername) {
        setIsAvailable(true);
        return;
      }

      // Set up debounced check
      const timer = setTimeout(async () => {
        if (!isMountedRef.current) {
          return;
        }

        setIsChecking(true);
        logger.debug(`Checking username availability for: "${username}"`);

        try {
          const available = await checkUsernameAvailability(username);
          logger.debug(`Username "${username}" availability result:`, { available });

          if (!isMountedRef.current) {
            return;
          }

          setIsAvailable(available);

          if (!available) {
            setError(
              i18n.t('validation.usernameTaken', {
                defaultValue: 'This username is already taken',
              })
            );
            logger.debug(`Setting error: username "${username}" is not available`);
          } else {
            logger.debug(`Username "${username}" is available`);
          }
        } catch (err) {
          if (!isMountedRef.current) {
            return;
          }

          logger.error('Username availability check failed:', err as Error);
          setError(
            i18n.t('validation.usernameCheckError', {
              defaultValue: 'An error occurred while checking username',
            })
          );
          setIsAvailable(null);
        } finally {
          if (isMountedRef.current) {
            setIsChecking(false);
          }
        }
      }, DEBOUNCE_DELAY);

      setDebounceTimer(timer);
    },
    [currentUsername]
  ); // Remove debounceTimer dependency to break the cycle

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup timer when it changes or on unmount
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
