import { z } from 'zod';
import i18n from '@/i18n';
import { GRATITUDE_MAX_LENGTH } from '@/constants/gratitude';

const t = (key: string, fallback: string, options?: Record<string, unknown>) =>
  i18n.t(key, { defaultValue: fallback, ...options });

// Schema for validating a single gratitude statement
export const gratitudeStatementSchema = z
  .string({ required_error: 'Gratitude statement is required.' })
  .trim()
  .superRefine((value, ctx) => {
    if (value.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.gratitude.empty', 'Gratitude statement cannot be empty.'),
      });
    }

    if (value.length > GRATITUDE_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t(
          'validation.gratitude.tooLong',
          `Gratitude statement must be ${GRATITUDE_MAX_LENGTH} characters or less.`,
          { max: GRATITUDE_MAX_LENGTH }
        ),
      });
    }
  });

export type GratitudeStatementFormData = z.infer<typeof gratitudeStatementSchema>;

// If we need to validate an array of statements (e.g., for a form that submits multiple at once):
export const gratitudeEntrySchema = z.object({
  statements: z.array(gratitudeStatementSchema).superRefine((value, ctx) => {
    if (value.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t(
          'validation.gratitude.required',
          'At least one gratitude statement is required.'
        ),
      });
    }
  }),
});

export type GratitudeEntryFormData = z.infer<typeof gratitudeEntrySchema>;
