import { z } from 'zod';

export const rawProfileDataSchema = z.object({
  id: z.string().uuid('Invalid UUID format for id'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .nullable(),
  onboarded: z.boolean(),
  created_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for created_at' }),
  updated_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for updated_at' }),
  daily_gratitude_goal: z.number().int().positive().nullable(),
  use_varied_prompts: z.boolean().default(false),
  enable_reminders: z.boolean().default(true),
  notification_time: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
});

export type RawProfileData = z.infer<typeof rawProfileDataSchema>;

export const profileSchema = rawProfileDataSchema.transform((data) => ({
  ...data,
  // Handle snake_case to camelCase conversion
  useVariedPrompts: data.use_varied_prompts,
  enableReminders: data.enable_reminders,
  // Keep both for backward compatibility if needed
  use_varied_prompts: data.use_varied_prompts,
  enable_reminders: data.enable_reminders,
  // Make fields optional for application layer flexibility
  username: data.username ?? undefined,
  onboarded: data.onboarded ?? false,
  daily_gratitude_goal: data.daily_gratitude_goal ?? undefined,
  notification_time: data.notification_time ?? undefined,
  timezone: data.timezone ?? undefined,
}));

export type Profile = z.infer<typeof profileSchema>;

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .optional()
    .nullable(),
  onboarded: z.boolean().optional(),
  daily_gratitude_goal: z.number().int().positive().optional().nullable(),
  useVariedPrompts: z.boolean().optional(),
  enableReminders: z.boolean().optional(),
  notification_time: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
