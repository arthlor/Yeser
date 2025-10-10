import { z } from 'zod';

/**
 * Zod schema for validating the GratitudeBenefit data received from the database.
 * This corresponds to the `gratitude_benefits` table with localization support.
 */
export const gratitudeBenefitSchema = z.object({
  id: z.number().int(),
  icon: z.string(),
  title_tr: z.string(),
  title_en: z.string().nullable(),
  description_tr: z.string(),
  description_en: z.string().nullable(),
  stat_tr: z.string().nullable(),
  stat_en: z.string().nullable(),
  cta_prompt_tr: z.string().nullable(),
  cta_prompt_en: z.string().nullable(),
  display_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

/**
 * Zod schema for localized GratitudeBenefit data with selected language content.
 * This is used when returning language-specific content to the client.
 */
export const localizedGratitudeBenefitSchema = z.object({
  id: z.number().int(),
  icon: z.string(),
  title: z.string(),
  description: z.string(),
  stat: z.string().nullable(),
  cta_prompt: z.string().nullable(),
  display_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

/**
 * The inferred TypeScript type from the raw database schema.
 * This includes all language columns.
 */
export type GratitudeBenefit = z.infer<typeof gratitudeBenefitSchema>;

/**
 * The inferred TypeScript type for localized content.
 * This includes only the selected language content.
 */
export type LocalizedGratitudeBenefit = z.infer<typeof localizedGratitudeBenefitSchema>;
