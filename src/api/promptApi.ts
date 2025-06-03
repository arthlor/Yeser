import { supabase } from '../utils/supabaseClient';

// Assuming your generated types are in a root types folder or similar
// Adjust the path if your Database type is located elsewhere, e.g., '../types/database.types'
// Based on MEMORY[9e4600ce-d55e-4f48-b57c-729e6f5349a1], it's likely '../types/database.types.ts'
import type { Database } from '../types/supabase.types'; // Updated path

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
  // Explicitly type the expected structure of the RPC arguments and response
  // For 'get_random_active_prompt', Args is empty, and Returns is an array of DailyPrompt-like objects.
  const { data, error } = await supabase.rpc('get_random_active_prompt');

  if (error) {
    console.error('Error fetching random active prompt:', error.message);
    // It's often better to throw a new error with a more specific message or context,
    // or the original error if the store/UI layer is equipped to handle Supabase errors directly.
    throw new Error(`Failed to fetch random prompt: ${error.message}`);
  }

  // The RPC `get_random_active_prompt` returns `TABLE(...)`, which Supabase client typically
  // returns as an array of objects. Since we expect at most one prompt (or none if table is empty/no active ones),
  // we check if the array is non-empty and take the first element.
  if (data && Array.isArray(data) && data.length > 0) {
    // The actual type of elements in `data` will be inferred by Supabase based on the RPC definition.
    // We cast it to DailyPrompt for use in our application code.
    const prompt = data[0] as DailyPrompt;
    return prompt;
  }

  // No active prompt found, or an unexpected response format (e.g., data is null or not an array)
  console.warn('No random active prompt found or unexpected response format.');
  return null;
};
