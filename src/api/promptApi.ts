import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';
import { dailyPromptSchema, localizedDailyPromptSchema } from '@/schemas/gratitudeEntrySchema';
import { localizeDailyPrompt } from '@/utils/localizationHelpers';

import type { DailyPrompt, LocalizedDailyPrompt } from '@/schemas/gratitudeEntrySchema';
import type { SupportedLanguage } from '@/store/languageStore';

/**
 * Fetches a single random active daily prompt from the backend.
 * **NETWORK RESILIENCE**: Enhanced error handling for network failures
 * @returns A DailyPrompt object or null if no prompt is found or an error occurs.
 */
export const getRandomActivePrompt = async (): Promise<DailyPrompt | null> => {
  try {
    const { data, error } = await supabase.rpc('get_random_active_prompt');

    if (error) {
      // **ENHANCED ERROR HANDLING**: Better error categorization
      if (
        error.message?.includes('function get_random_active_prompt') &&
        error.message?.includes('does not exist')
      ) {
        logger.warn('Database function get_random_active_prompt does not exist - using fallback');
        return null;
      }

      // **NETWORK RESILIENCE**: Return null for network errors instead of throwing
      if (
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Network request failed')
      ) {
        logger.warn('Network connectivity issue for prompt fetch - graceful fallback', {
          error: error.message,
        });
        return null;
      }

      throw handleAPIError(new Error(error.message), 'fetch random active prompt');
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const prompt = dailyPromptSchema.parse(data[0]);
      return prompt;
    }

    logger.warn('No random active prompt found or unexpected response format.');
    return null;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    // **NETWORK RESILIENCE**: Handle network errors gracefully
    if (
      error.message?.includes('Network request failed') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('TypeError: Network request failed')
    ) {
      logger.warn('Network connectivity issue for prompt fetch - graceful fallback', {
        error: error.message,
        type: error.name,
      });
      return null; // Return null instead of throwing for network issues
    }

    throw handleAPIError(error, 'fetch random active prompt');
  }
};

/**
 * Fetches multiple random active daily prompts from the backend.
 * @param limit Number of prompts to fetch (default: 10)
 * @returns Array of DailyPrompt objects or empty array if none found
 */
export const getMultipleRandomActivePrompts = async (
  limit: number = 10
): Promise<DailyPrompt[]> => {
  try {
    // Use server-side RPC function for optimal performance and scalability
    const { data, error } = await supabase.rpc('get_multiple_random_active_prompts', {
      p_limit: limit,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch multiple random active prompts');
    }

    if (data && Array.isArray(data) && data.length > 0) {
      logger.debug('Server-side prompt fetching completed', {
        requested: limit,
        returned: data.length,
      });

      // Validate each prompt using Zod schema
      const validatedPrompts = data.map((prompt) => dailyPromptSchema.parse(prompt));
      return validatedPrompts;
    }

    logger.warn('No random active prompts found or unexpected response format.');
    return [];
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch multiple random active prompts');
  }
};

/**
 * Fetches a single random active daily prompt with localized content.
 * @param language - The target language for localization ('tr' | 'en')
 * @returns A LocalizedDailyPrompt object or null if no prompt is found or an error occurs.
 */
export const getLocalizedRandomActivePrompt = async (
  language: SupportedLanguage = 'tr'
): Promise<LocalizedDailyPrompt | null> => {
  try {
    logger.debug('Fetching localized random active prompt', { language });

    // Fetch raw prompt data with BOTH language columns directly from table
    const { data, error } = await supabase
      .from('daily_prompts')
      .select('id, prompt_text_tr, prompt_text_en, category')
      .eq('is_active', true)
      .limit(20); // Fetch multiple to randomize on client side

    if (error) {
      logger.warn('Error fetching prompt from daily_prompts table:', {
        error: error.message,
        language,
      });
      return null;
    }

    if (!data || !data.length) {
      logger.warn('No prompt data returned from daily_prompts table');
      return null;
    }

    // Randomly select one prompt from the fetched results
    const randomIndex = Math.floor(Math.random() * data.length);
    const selectedPrompt = data[randomIndex];

    // Transform to localized format using both language columns
    const localizedPrompt = localizeDailyPrompt(selectedPrompt as DailyPrompt, language);

    // Validate the localized prompt
    const validatedPrompt = localizedDailyPromptSchema.parse(localizedPrompt);

    logger.debug('Successfully localized daily prompt', {
      language,
      promptId: validatedPrompt.id,
      promptText: validatedPrompt.prompt_text,
    });

    return validatedPrompt;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Error in getLocalizedRandomActivePrompt:', { error: error.message, language });

    // **GRACEFUL DEGRADATION**: Return null instead of throwing for consistency
    return null;
  }
};

/**
 * Fetches multiple random active daily prompts with localized content.
 * @param limit Number of prompts to fetch (default: 10)
 * @param language - The target language for localization ('tr' | 'en')
 * @returns Array of LocalizedDailyPrompt objects or empty array if none found
 */
export const getLocalizedMultipleRandomActivePrompts = async (
  limit: number = 10,
  language: SupportedLanguage = 'tr'
): Promise<LocalizedDailyPrompt[]> => {
  try {
    logger.debug('Fetching multiple localized random active prompts', { limit, language });

    // Fetch raw prompt data with BOTH language columns directly from table
    const { data, error } = await supabase
      .from('daily_prompts')
      .select('id, prompt_text_tr, prompt_text_en, category')
      .eq('is_active', true)
      .limit(Math.max(limit * 2, 20)); // Fetch more to randomize on client side

    if (error) {
      throw handleAPIError(
        new Error(error.message),
        'fetch multiple localized random active prompts'
      );
    }

    if (!data || !data.length) {
      logger.warn('No prompt data returned from daily_prompts table');
      return [];
    }

    // Randomly shuffle and select the requested number of prompts
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const selectedPrompts = shuffled.slice(0, limit);

    // Transform to localized format using both language columns
    const localizedPrompts = selectedPrompts.map((prompt) =>
      localizeDailyPrompt(prompt as DailyPrompt, language)
    );

    // Validate each localized prompt
    const validatedPrompts = localizedPrompts.map((prompt) =>
      localizedDailyPromptSchema.parse(prompt)
    );

    logger.debug('Successfully localized multiple daily prompts', {
      language,
      count: validatedPrompts.length,
    });

    return validatedPrompts;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch multiple localized random active prompts');
  }
};
