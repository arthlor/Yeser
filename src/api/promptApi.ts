import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';

// Assuming your generated types are in a root types folder or similar
// Adjust the path if your Database type is located elsewhere, e.g., '../types/database.types'
// Based on MEMORY[9e4600ce-d55e-4f48-b57c-729e6f5349a1], it's likely '../types/database.types.ts'

export interface DailyPrompt {
  id: string;
  prompt_text_tr: string;
  prompt_text_en?: string | null;
  category?: string | null;
}

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
      const prompt = data[0] as DailyPrompt;
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
export const getMultipleRandomActivePrompts = async (limit: number = 10): Promise<DailyPrompt[]> => {
  try {
    const { data, error } = await supabase
      .from('daily_prompts')
      .select('id, prompt_text_tr, prompt_text_en, category')
      .eq('is_active', true);

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch multiple random active prompts');
    }

    if (data && Array.isArray(data) && data.length > 0) {
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return shuffled.slice(0, limit) as DailyPrompt[];
    }

    logger.warn('No random active prompts found or unexpected response format.');
    return [];
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch multiple random active prompts');
  }
};
