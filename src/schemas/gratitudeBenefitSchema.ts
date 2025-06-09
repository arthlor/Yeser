import { z } from 'zod';

/**
 * Zod schema for validating the GratitudeBenefit data received from the database.
 * This corresponds to the `gratitude_benefits` table.
 */
export const gratitudeBenefitSchema = z.object({
  id: z.number().int(),
  icon: z.string(),
  title_tr: z.string(),
  description_tr: z.string(),
  stat_tr: z.string().nullable(),
  cta_prompt_tr: z.string().nullable(),
  display_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

/**
 * The inferred TypeScript type from the schema.
 * This can be used in the application to ensure type safety.
 */
export type GratitudeBenefit = z.infer<typeof gratitudeBenefitSchema>;
