import { supabase } from '@/utils/supabaseClient';
import {
  gratitudeBenefitSchema,
  localizedGratitudeBenefitSchema,
} from '@/schemas/gratitudeBenefitSchema';
import { localizeGratitudeBenefit } from '@/utils/localizationHelpers';
import { logger } from '@/utils/debugConfig';

import type { GratitudeBenefit, LocalizedGratitudeBenefit } from '@/schemas/gratitudeBenefitSchema';
import type { SupportedLanguage } from '@/store/languageStore';

/**
 * Fetches the list of active gratitude benefits from the database with all language columns.
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

/**
 * Fetches the list of active gratitude benefits from the database and returns localized content.
 * The content is for the "Why Gratitude Matters" screen.
 *
 * @param language - The target language for localization ('tr' | 'en')
 * @returns Promise<LocalizedGratitudeBenefit[]> Array of active gratitude benefits with localized content
 * @throws {Error} When database query fails or user is not authenticated
 */
export const getLocalizedGratitudeBenefits = async (
  language: SupportedLanguage = 'tr'
): Promise<LocalizedGratitudeBenefit[]> => {
  try {
    logger.debug('Fetching localized gratitude benefits from database', { language });

    const rawBenefits = await getGratitudeBenefits();

    // Transform to localized format
    const localizedBenefits = rawBenefits.map((benefit) =>
      localizeGratitudeBenefit(benefit, language)
    );

    // Validate each localized benefit
    const validatedBenefits = localizedBenefits.map((benefit) =>
      localizedGratitudeBenefitSchema.parse(benefit)
    );

    logger.debug(
      `Successfully localized ${validatedBenefits.length} gratitude benefits for language: ${language}`
    );

    return validatedBenefits;
  } catch (error) {
    logger.error('Unexpected error in getLocalizedGratitudeBenefits:', { error });
    throw error;
  }
};
