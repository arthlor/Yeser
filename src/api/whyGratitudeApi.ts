import { supabase } from '@/utils/supabaseClient';
import { gratitudeBenefitSchema } from '@/schemas/gratitudeBenefitSchema';
import { logger } from '@/utils/debugConfig';

import type { GratitudeBenefit } from '@/schemas/gratitudeBenefitSchema';

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

    const { data, error } = await supabase
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

    // Validate each benefit object against the schema
    const validatedBenefits = data.map((benefit) => gratitudeBenefitSchema.parse(benefit));
    logger.debug(
      `Successfully fetched and validated ${validatedBenefits.length} gratitude benefits`
    );
    return validatedBenefits;
  } catch (error) {
    logger.error('Unexpected error in getGratitudeBenefits:', { error });
    throw error;
  }
};
