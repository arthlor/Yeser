import { supabase } from '@/utils/supabaseClient';
import type { GratitudeBenefit } from '@/features/whyGratitude/types';
import { logger } from '@/utils/debugConfig';

/**
 * Fetches the list of active gratitude benefits from the database.
 * The content is for the "Why Gratitude Matters" screen.
 *
 * @returns Promise<GratitudeBenefit[]> Array of active gratitude benefits ordered by display_order
 * @throws {Error} When database query fails or user is not authenticated
 */
export const getGratitudeBenefits = async (): Promise<GratitudeBenefit[]> => {
  try {
    logger.debug('Fetching gratitude benefits from database');

    // Using any for now since the table isn't in the generated types yet
    // After migration, this will be properly typed
    const { data, error } = await (supabase as any)
      .from('gratitude_benefits')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      logger.error('Error fetching gratitude benefits:', { error: error.message });
      throw new Error(`Failed to fetch benefits: ${error.message}`);
    }

    if (!data) {
      logger.warn('No gratitude benefits data returned from database');
      return [];
    }

    logger.debug(`Successfully fetched ${data.length} gratitude benefits`);
    return data as GratitudeBenefit[];
  } catch (error) {
    logger.error('Unexpected error in getGratitudeBenefits:', { error });
    throw error;
  }
};

/**
 * Fetches a single gratitude benefit by ID (for future use)
 *
 * @param id - The ID of the benefit to fetch
 * @returns Promise<GratitudeBenefit | null> Single benefit or null if not found
 * @throws {Error} When database query fails
 */
export const getGratitudeBenefitById = async (id: number): Promise<GratitudeBenefit | null> => {
  try {
    logger.debug(`Fetching gratitude benefit with ID: ${id}`);

    // Using any for now since the table isn't in the generated types yet
    const { data, error } = await (supabase as any)
      .from('gratitude_benefits')
      .select('*')
      .eq('id', id.toString())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        logger.debug(`No gratitude benefit found with ID: ${id}`);
        return null;
      }
      logger.error(`Error fetching gratitude benefit ${id}:`, { error: error.message });
      throw new Error(`Failed to fetch benefit: ${error.message}`);
    }

    logger.debug(`Successfully fetched gratitude benefit: ${id}`);
    return data as GratitudeBenefit;
  } catch (error) {
    logger.error(`Unexpected error in getGratitudeBenefitById for ID ${id}:`, { error });
    throw error;
  }
};
