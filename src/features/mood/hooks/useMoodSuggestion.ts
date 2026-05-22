import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { useSubscription } from '@/hooks/useSubscription';
import type { MoodEmoji } from '@/types/mood.types';
import type { SupportedLanguage } from '@/store/languageStore';

interface MoodSuggestionResult {
  moods?: MoodEmoji[];
  primary?: MoodEmoji;
  remaining: number;
  resetInSeconds?: number;
  error?: string;
}

interface UseMoodSuggestionOptions {
  debounceMs?: number;
  minLength?: number;
  language?: SupportedLanguage;
}

interface UseMoodSuggestionReturn {
  suggestedMoods: MoodEmoji[];
  primaryMood: MoodEmoji | null;
  remaining: number | null;
  resetInSeconds: number | null;
  isLoading: boolean;
  error: string | null;
  suggestMood: (statement: string) => void;
  clearSuggestions: () => void;
}

export const useMoodSuggestion = (
  options: UseMoodSuggestionOptions = {}
): UseMoodSuggestionReturn => {
  const { debounceMs = 500, minLength = 10, language = 'en' } = options;

  const [suggestedMoods, setSuggestedMoods] = useState<MoodEmoji[]>([]);
  const [primaryMood, setPrimaryMood] = useState<MoodEmoji | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetInSeconds, setResetInSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isPro } = useSubscription();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatement = useRef<string>('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestedMoods([]);
    setPrimaryMood(null);
    setResetInSeconds(null);
    setError(null);
  }, []);

  const fetchSuggestion = useCallback(
    async (statement: string) => {
      // Don't fetch if not PRO
      if (!isPro) {
        return;
      }

      // Don't fetch for short statements
      if (statement.trim().length < minLength) {
        clearSuggestions();
        return;
      }

      // Don't re-fetch for same statement
      if (statement === lastStatement.current) {
        return;
      }

      lastStatement.current = statement;
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke<MoodSuggestionResult>(
          'suggest-mood',
          {
            body: { statement, language },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        if (data) {
          if (data.error) {
            if (isMountedRef.current) {
              setRemaining(data.remaining);
              if (data.resetInSeconds) {
                setResetInSeconds(data.resetInSeconds);
              }
              setSuggestedMoods([]);
              setPrimaryMood(null);
            }
            return;
          }

          if (isMountedRef.current) {
            if (data.moods) {
              setSuggestedMoods(data.moods as MoodEmoji[]);
            }
            if (data.primary) {
              setPrimaryMood(data.primary as MoodEmoji);
            }
            setRemaining(data.remaining);
            if (data.resetInSeconds) {
              setResetInSeconds(data.resetInSeconds);
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to suggest mood';
        logger.warn('[useMoodSuggestion] Error:', { error: errorMessage });
        if (isMountedRef.current) {
          setError(errorMessage);
          clearSuggestions();
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [isPro, minLength, language, clearSuggestions]
  );

  const suggestMood = useCallback(
    (statement: string) => {
      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new debounced call
      debounceTimer.current = setTimeout(() => {
        void fetchSuggestion(statement);
      }, debounceMs);
    },
    [debounceMs, fetchSuggestion]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    suggestedMoods,
    primaryMood,
    remaining,
    resetInSeconds,
    isLoading,
    error,
    suggestMood,
    clearSuggestions,
  };
};
