import { z } from 'zod';
import i18n from '@/i18n';

// Helper function to create email schema with localized messages
const createEmailSchema = () => {
  const errorMessage = i18n.isInitialized
    ? i18n.t('validation.email.invalidAddress')
    : 'Invalid email address.';
  return z
    .string()
    .trim()
    .email(errorMessage)
    .transform((val) => val.toLowerCase());
};

// Email validation schema
export const emailSchema = z
  .string()
  .email(i18n.isInitialized ? i18n.t('validation.email.invalidAddress') : 'Invalid email address.');

// Email validation helper for consistent validation across the app
export const createEmailValidationSchema = () => {
  return z
    .string()
    .email(
      i18n.isInitialized ? i18n.t('validation.email.invalidAddress') : 'Invalid email address.'
    );
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
