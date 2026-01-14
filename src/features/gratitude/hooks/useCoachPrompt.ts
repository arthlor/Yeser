import { useCallback, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { useSubscription } from '@/hooks/useSubscription';

type FocusArea = 'relationships' | 'growth' | 'nature' | 'health' | 'achievements' | 'general';

interface CoachPromptResult {
  prompt?: string;
  focusArea?: string;
  tip?: string;
  remaining: number;
  resetInSeconds?: number;
  error?: string;
}

interface UseCoachPromptOptions {
  language?: 'tr' | 'en';
}

interface UseCoachPromptReturn {
  coachPrompt: string | null;
  tip: string | null;
  focusArea: string | null;
  remaining: number | null;
  resetInSeconds: number | null;
  isLoading: boolean;
  error: string | null;
  generatePrompt: (recentEntries?: string[], focusArea?: FocusArea) => Promise<string | null>;
  clearPrompt: () => void;
}

export const useCoachPrompt = (options: UseCoachPromptOptions = {}): UseCoachPromptReturn => {
  const { language = 'en' } = options;

  const [coachPrompt, setCoachPrompt] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetInSeconds, setResetInSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isPro } = useSubscription();

  const clearPrompt = useCallback(() => {
    setCoachPrompt(null);
    setTip(null);
    setFocusArea(null);
    setError(null);
  }, []);

  const generatePrompt = useCallback(
    async (recentEntries: string[] = [], focus: FocusArea = 'general'): Promise<string | null> => {
      if (!isPro) {
        setError('PRO subscription required');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke<CoachPromptResult>(
          'coach-prompt',
          {
            body: { recentEntries, language, focusArea: focus },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        if (data) {
          if (data.error) {
            // showWarning(t('ai.usage.exhausted', 'Daily limit exhausted. Resets tomorrow!'));
            setRemaining(data.remaining);
            if (data.resetInSeconds) {
              setResetInSeconds(data.resetInSeconds);
            }
            return null;
          }

          if (data.prompt) {
            setCoachPrompt(data.prompt);
            setTip(data.tip || null);
            setFocusArea(data.focusArea || null);
            setRemaining(data.remaining);
            if (data.resetInSeconds) {
              setResetInSeconds(data.resetInSeconds);
            }
            return data.prompt;
          }
        }

        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate prompt';
        logger.warn('[useCoachPrompt] Error:', { error: errorMessage });
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isPro, language]
  );

  return {
    coachPrompt,
    tip,
    focusArea,
    remaining,
    resetInSeconds,
    isLoading,
    error,
    generatePrompt,
    clearPrompt,
  };
};
