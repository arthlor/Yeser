import { useCallback, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { useSubscription } from '@/hooks/useSubscription';
import type { SupportedLanguage } from '@/store/languageStore';

type EnhanceStyle = 'poetic' | 'detailed' | 'mindful';

interface EnhanceEntryResult {
  enhanced?: string;
  original?: string;
  remaining: number;
  resetInSeconds?: number;
  error?: string;
}

interface UseEntryEnhancementOptions {
  language?: SupportedLanguage;
}

interface UseEntryEnhancementReturn {
  enhancedText: string | null;
  remaining: number | null;
  resetInSeconds: number | null;
  isLoading: boolean;
  error: string | null;
  enhanceEntry: (statement: string, style?: EnhanceStyle) => Promise<string | null>;
  clearEnhancement: () => void;
}

export const useEntryEnhancement = (
  options: UseEntryEnhancementOptions = {}
): UseEntryEnhancementReturn => {
  const { language = 'en' } = options;

  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resetInSeconds, setResetInSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isPro } = useSubscription();

  const clearEnhancement = useCallback(() => {
    setEnhancedText(null);
    setError(null);
  }, []);

  const enhanceEntry = useCallback(
    async (statement: string, style: EnhanceStyle = 'detailed'): Promise<string | null> => {
      if (!isPro) {
        setError('PRO subscription required');
        return null;
      }

      if (!statement || statement.trim().length < 5) {
        setError('Statement too short');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke<EnhanceEntryResult>(
          'enhance-entry',
          {
            body: { statement, language, style },
          }
        );

        if (invokeError) {
          throw new Error(invokeError.message);
        }

        if (data) {
          if (data.error) {
            // Limit exhausted handling (UI shows indicator, no toast needed)
            setRemaining(data.remaining);
            if (data.resetInSeconds) {
              setResetInSeconds(data.resetInSeconds);
            }
            return null;
          }
          if (data.enhanced) {
            setEnhancedText(data.enhanced);
            setRemaining(data.remaining);
            if (data.resetInSeconds) {
              setResetInSeconds(data.resetInSeconds);
            }
            return data.enhanced;
          }
        }

        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to enhance entry';
        logger.warn('[useEntryEnhancement] Error:', { error: errorMessage });
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isPro, language]
  );

  return {
    enhancedText,
    remaining,
    resetInSeconds,
    isLoading,
    error,
    enhanceEntry,
    clearEnhancement,
  };
};
