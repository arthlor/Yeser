import { z } from 'zod';

// Magic link authentication schema - only requires email
export const magicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Geçersiz e-posta adresi.')
    .transform((val) => val.toLowerCase()),
});

export type MagicLinkFormInputs = z.infer<typeof magicLinkSchema>;

// Keep this for backward compatibility during transition
export const loginSchema = magicLinkSchema;
export type LoginFormInputs = MagicLinkFormInputs;

// Email validation helper for consistent validation across the app
export const emailSchema = z.string().email('Geçersiz e-posta adresi.');

// Helper for validating email format
export const isValidEmail = (email: string): boolean => {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};
