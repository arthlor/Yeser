import { z } from 'zod';

// Schema for validating a single gratitude statement
export const gratitudeStatementSchema = z
  .string({
    required_error: 'Gratitude statement is required.',
  })
  .trim()
  .min(1, { message: 'Gratitude statement cannot be empty.' });

export type GratitudeStatementFormData = z.infer<typeof gratitudeStatementSchema>;

// If we need to validate an array of statements (e.g., for a form that submits multiple at once):
export const gratitudeEntrySchema = z.object({
  statements: z
    .array(gratitudeStatementSchema)
    .min(1, { message: 'At least one gratitude statement is required.' }),
});

export type GratitudeEntryFormData = z.infer<typeof gratitudeEntrySchema>;
