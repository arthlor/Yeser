import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi.'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.'),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır.').regex(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı yalnızca harf, sayı ve alt çizgi içerebilir.'),
    email: z.string().email('Geçersiz e-posta adresi.'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.'),
    confirmPassword: z.string().min(6, 'Şifre onayı en az 6 karakter olmalıdır.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'], // Path to field to display the error
  });

export type SignupFormInputs = z.infer<typeof signupSchema>;
