import { z } from 'zod';

// Password complexity validation function
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi.'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.'),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır.')
      .regex(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı yalnızca harf, sayı ve alt çizgi içerebilir.'),
    email: z.string().email('Geçersiz e-posta adresi.'),
    password: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalıdır.')
      .regex(
        passwordComplexityRegex,
        'Şifre en az bir küçük harf, büyük harf, rakam ve özel karakter (@$!%*?&) içermelidir.'
      ),
    confirmPassword: z.string().min(8, 'Şifre onayı en az 8 karakter olmalıdır.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'], // Path to field to display the error
  });

export type SignupFormInputs = z.infer<typeof signupSchema>;

// Password strength helper for UI feedback
export const resetPasswordSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi.'),
});

export type ResetPasswordFormInputs = z.infer<typeof resetPasswordSchema>;

export const setNewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalıdır.')
      .regex(
        passwordComplexityRegex,
        'Şifre en az bir küçük harf, büyük harf, rakam ve özel karakter (@$!%*?&) içermelidir.'
      ),
    confirmPassword: z.string().min(8, 'Şifre onayı en az 8 karakter olmalıdır.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });

export type SetNewPasswordFormInputs = z.infer<typeof setNewPasswordSchema>;

export const getPasswordStrength = (password: string) => {
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[@$!%*?&]/.test(password);

  const requirements = [
    { met: hasMinLength, text: 'En az 8 karakter' },
    { met: hasLowercase, text: 'Küçük harf (a-z)' },
    { met: hasUppercase, text: 'Büyük harf (A-Z)' },
    { met: hasDigit, text: 'Rakam (0-9)' },
    { met: hasSymbol, text: 'Özel karakter (@$!%*?&)' },
  ];

  const metCount = requirements.filter((req) => req.met).length;

  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  if (metCount >= 5) {
    strength = 'strong';
  } else if (metCount >= 4) {
    strength = 'good';
  } else if (metCount >= 3) {
    strength = 'fair';
  }

  return { strength, requirements, score: metCount };
};
