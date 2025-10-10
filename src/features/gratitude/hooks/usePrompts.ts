import {
  getLocalizedMultipleRandomActivePrompts,
  getLocalizedRandomActivePrompt,
} from '@/api/promptApi';
import type { LocalizedDailyPrompt } from '@/schemas/gratitudeEntrySchema';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_STALE_TIMES } from '@/api/queryClient';
import useAuthStore from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import i18n from '@/i18n';

// Localized static prompt texts - Centralized here
export const getStaticDefaultPrompt = (language: 'tr' | 'en'): string => {
  const t = i18n.getFixedT(language);
  return t('gratitude.prompt.fallbackText');
};

// Legacy constant for backward compatibility
export const STATIC_DEFAULT_PROMPT = getStaticDefaultPrompt('tr');

/**
 * Hook to get current daily prompt with localization support
 * **NETWORK RESILIENCE**: Enhanced error handling and fallback strategies
 */
export const useCurrentPrompt = () => {
  const user = useAuthStore((state) => state.user);
  const language = useLanguageStore((state) => state.language);

  return useQuery({
    queryKey: [...queryKeys.currentPrompt(user?.id), 'localized', language],
    queryFn: async () => {
      try {
        const prompt = await getLocalizedRandomActivePrompt(language);
        return prompt;
      } catch (error) {
        logger.warn('Localized prompt API failed, returning null for graceful fallback:', {
          error: error instanceof Error ? error.message : String(error),
          language,
        });
        // Return null instead of throwing to prevent cascade failures
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.prompts, // 15 minutes - varied but not critical
    gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep for session
    retry: (failureCount, error) => {
      // **NETWORK RESILIENCE**: Stop retrying on network errors after 1 attempt
      if (error.message?.includes('Network request failed')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
    // **GRACEFUL DEGRADATION**: Don't throw on error, use fallback instead
    throwOnError: false,
  });
};

/**
 * Hook to get multiple random prompts for varied inspiration with localization
 * **NETWORK RESILIENCE**: Enhanced with graceful fallback to empty array
 */
export const useMultiplePrompts = (limit: number = 10) => {
  const user = useAuthStore((state) => state.user);
  const language = useLanguageStore((state) => state.language);

  return useQuery({
    queryKey: [...queryKeys.currentPrompt(user?.id), 'multiple', limit, 'localized', language],
    queryFn: async () => {
      try {
        const prompts = await getLocalizedMultipleRandomActivePrompts(limit, language);
        return prompts;
      } catch (error) {
        logger.warn(
          'Multiple localized prompts API failed, returning empty array for graceful fallback:',
          {
            error: error instanceof Error ? error.message : String(error),
            language,
          }
        );
        // Return empty array instead of throwing
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.prompts, // 15 minutes - refresh for variety
    gcTime: 90 * 60 * 1000, // 90 minutes - keep for session variety
    retry: (failureCount, error) => {
      // **NETWORK RESILIENCE**: Reduced retries for network failures
      if (error.message?.includes('Network request failed')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
    // **GRACEFUL DEGRADATION**: Don't throw on error
    throwOnError: false,
  });
};

/**
 * Hook to get a fresh random prompt
 * Use this when user wants a new prompt
 */
export const usePromptMutations = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { handleMutationError } = useGlobalError();

  const language = useLanguageStore((state) => state.language);

  const fetchNewPrompt = useMutation({
    mutationFn: async (): Promise<LocalizedDailyPrompt | null> => {
      const prompt = await getLocalizedRandomActivePrompt(language);
      return prompt;
    },

    onSuccess: (newPrompt) => {
      // Update the current prompt cache with new data
      queryClient.setQueryData(
        [...queryKeys.currentPrompt(user?.id), 'localized', language],
        newPrompt
      );
    },

    onError: (error) => {
      logger.error('[usePromptMutations] Error fetching new prompt:', error);
      handleMutationError(error, 'fetch new prompt');
    },
  });

  const fetchMultiplePrompts = useMutation({
    mutationFn: async (limit: number = 10): Promise<LocalizedDailyPrompt[]> => {
      const prompts = await getLocalizedMultipleRandomActivePrompts(limit, language);
      return prompts;
    },

    onSuccess: (newPrompts, limit) => {
      // Update the multiple prompts cache with new data
      queryClient.setQueryData(
        [...queryKeys.currentPrompt(user?.id), 'multiple', limit, 'localized', language],
        newPrompts
      );
    },

    onError: (error) => {
      logger.error('[usePromptMutations] Error fetching multiple prompts:', error);
      handleMutationError(error, 'fetch multiple prompts');
    },
  });

  const resetToDefaultPrompt = () => {
    // Clear the prompt cache to show default
    queryClient.setQueryData([...queryKeys.currentPrompt(user?.id), 'localized', language], null);
  };

  return {
    fetchNewPrompt: fetchNewPrompt.mutate,
    isFetchingNewPrompt: fetchNewPrompt.isPending,
    fetchNewPromptError: fetchNewPrompt.error,
    fetchMultiplePrompts: fetchMultiplePrompts.mutate,
    isFetchingMultiplePrompts: fetchMultiplePrompts.isPending,
    fetchMultiplePromptsError: fetchMultiplePrompts.error,
    resetToDefaultPrompt,
  };
};

/**
 * Utility hook that combines prompt data with localized default behavior
 * Returns the current prompt or localized default text
 */
export const usePromptText = () => {
  const { data: currentPrompt, isLoading, error } = useCurrentPrompt();
  const language = useLanguageStore((state) => state.language);

  const promptText =
    (currentPrompt as LocalizedDailyPrompt)?.prompt_text || getStaticDefaultPrompt(language);
  const isUsingDefault = !currentPrompt;

  return {
    promptText,
    isUsingDefault,
    isLoading,
    error,
    currentPrompt,
  };
};

/**
 * Hook for managing prompts in settings/preferences
 * Includes utility functions for prompt management
 */
export const usePromptSettings = () => {
  const { fetchNewPrompt, isFetchingNewPrompt, resetToDefaultPrompt } = usePromptMutations();

  const { promptText, isUsingDefault, currentPrompt } = usePromptText();

  const refreshPrompt = () => {
    fetchNewPrompt();
  };

  const useDefault = () => {
    resetToDefaultPrompt();
  };

  return {
    promptText,
    isUsingDefault,
    currentPrompt,
    refreshPrompt,
    useDefault,
    isRefreshing: isFetchingNewPrompt,
  };
};
