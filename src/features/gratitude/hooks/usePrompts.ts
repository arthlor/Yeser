import { type DailyPrompt, getMultipleRandomActivePrompts, getRandomActivePrompt } from '@/api/promptApi';
import { queryKeys } from '@/api/queryKeys';
import useAuthStore from '@/store/authStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';
import { useGlobalError } from '@/providers/GlobalErrorProvider';

// Default static prompt text (Turkish) - Centralized here
export const STATIC_DEFAULT_PROMPT = 'Bugün neler için minnettarsın?';

/**
 * Hook to get current daily prompt with TanStack Query
 * Automatically manages caching and background updates
 */
export const useCurrentPrompt = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.currentPrompt(user?.id),
    queryFn: async () => {
      const prompt = await getRandomActivePrompt();
      return prompt;
    },
    enabled: !!user?.id,
    staleTime: 60 * 60 * 1000, // 1 hour - prompts don't change frequently
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

/**
 * Hook to get multiple random prompts for varied inspiration
 */
export const useMultiplePrompts = (limit: number = 10) => {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: [...queryKeys.currentPrompt(user?.id), 'multiple', limit],
    queryFn: async () => {
      const prompts = await getMultipleRandomActivePrompts(limit);
      return prompts;
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutes - refresh more often for variety
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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

  const fetchNewPrompt = useMutation({
    mutationFn: async (): Promise<DailyPrompt | null> => {
      const prompt = await getRandomActivePrompt();
      return prompt;
    },

    onSuccess: (newPrompt) => {
      // Update the current prompt cache with new data
      queryClient.setQueryData(queryKeys.currentPrompt(user?.id), newPrompt);
    },

    onError: error => {
      logger.error('[usePromptMutations] Error fetching new prompt:', error);
      handleMutationError(error, 'fetch new prompt');
    },
  });

  const fetchMultiplePrompts = useMutation({
    mutationFn: async (limit: number = 10): Promise<DailyPrompt[]> => {
      const prompts = await getMultipleRandomActivePrompts(limit);
      return prompts;
    },

    onSuccess: (newPrompts, limit) => {
      // Update the multiple prompts cache with new data
      queryClient.setQueryData([...queryKeys.currentPrompt(user?.id), 'multiple', limit], newPrompts);
    },

    onError: error => {
      logger.error('[usePromptMutations] Error fetching multiple prompts:', error);
      handleMutationError(error, 'fetch multiple prompts');
    },
  });

  const resetToDefaultPrompt = () => {
    // Clear the prompt cache to show default
    queryClient.setQueryData(queryKeys.currentPrompt(user?.id), null);
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
 * Utility hook that combines prompt data with default behavior
 * Returns the current prompt or default text
 */
export const usePromptText = () => {
  const { data: currentPrompt, isLoading, error } = useCurrentPrompt();

  const promptText = (currentPrompt as DailyPrompt)?.prompt_text_tr || STATIC_DEFAULT_PROMPT;
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
