import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';
import { dailyPromptSchema } from '@/schemas/gratitudeEntrySchema';

import type { DailyPrompt } from '@/schemas/gratitudeEntrySchema';

/**
 * Fetches a single random active daily prompt from the backend.
 * @returns A DailyPrompt object or null if no prompt is found or an error occurs.
 */
export const getRandomActivePrompt = async (): Promise<DailyPrompt | null> => {
  try {
    const { data, error } = await supabase.rpc('get_random_active_prompt');

    if (error) {
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
