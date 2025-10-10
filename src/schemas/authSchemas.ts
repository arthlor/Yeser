import { z } from 'zod';
import i18n from '@/i18n';

// Helper function to create schemas with localized messages
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

// Magic link authentication schema - only requires email
export const createMagicLinkSchema = () =>
  z.object({
    email: createEmailSchema(),
  });

// Static schema for backward compatibility (uses default message)
export const magicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .email(
      i18n.isInitialized ? i18n.t('validation.email.invalidAddress') : 'Invalid email address.'
    )
    .transform((val) => val.toLowerCase()),
});

export type MagicLinkFormInputs = z.infer<typeof magicLinkSchema>;

// Keep this for backward compatibility during transition
export const loginSchema = magicLinkSchema;
export type LoginFormInputs = MagicLinkFormInputs;

// Email validation helper for consistent validation across the app
export const createEmailValidationSchema = () => {
  return z
    .string()
    .email(
      i18n.isInitialized ? i18n.t('validation.email.invalidAddress') : 'Invalid email address.'
    );
};
export const emailSchema = z
  .string()
  .email(i18n.isInitialized ? i18n.t('validation.email.invalidAddress') : 'Invalid email address.');

// Helper for validating email format
export const isValidEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};
