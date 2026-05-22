import { z } from 'zod';
import i18n from '@/i18n';

const getInvalidEmailMessage = () =>
  i18n.t('validation.email.invalidAddress', { defaultValue: 'Invalid email address.' });

const isEmailFormat = (value: string): boolean => z.string().email().safeParse(value).success;

// Helper function to create email schema with localized messages
const createEmailSchema = () => {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (!isEmailFormat(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: getInvalidEmailMessage(),
        });
      }
    })
    .transform((val) => val.toLowerCase());
};

// Email validation schema
export const emailSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (!isEmailFormat(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: getInvalidEmailMessage(),
      });
    }
  });

// Email validation helper for consistent validation across the app
export const createEmailValidationSchema = () => {
  return emailSchema;
};

// Helper for validating email format
export const isValidEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

// Export createEmailSchema for potential external use
export { createEmailSchema };
