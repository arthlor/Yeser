import { z } from 'zod';

// ✅ SIMPLIFIED: Base schema for new database structure (post-notification refactor)
export const rawProfileDataSchema = z.object({
  id: z.string().uuid('Invalid UUID format for id'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .nullable(),
  onboarded: z.boolean(),
  // ✅ SIMPLIFIED: Single notification toggle (replaces 5 complex fields)
  notifications_enabled: z.boolean().default(false),
  expo_push_token: z.string().nullable(),
  push_token_updated_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for push_token_updated_at' })
    .nullable(),
  push_notification_failures: z.number().int().min(0).default(0),
  created_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for created_at' }),
  updated_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for updated_at' }),
  daily_gratitude_goal: z.number().int().positive().nullable(),
  use_varied_prompts: z.boolean().default(false),
});

export type RawProfileData = z.infer<typeof rawProfileDataSchema>;

// ✅ SIMPLIFIED: Application schema for new structure (post-notification refactor)
export const profileSchema = rawProfileDataSchema.transform((data) => ({
  ...data,
  // Handle snake_case to camelCase conversion
  useVariedPrompts: data.use_varied_prompts,
  // Keep both for backward compatibility if needed
  use_varied_prompts: data.use_varied_prompts,
  // Make fields optional for application layer flexibility
  username: data.username ?? undefined,
  onboarded: data.onboarded ?? false,
  // ✅ SIMPLIFIED: Only the new notification fields (old complex fields removed)
  notifications_enabled: data.notifications_enabled ?? false,
  expo_push_token: data.expo_push_token ?? undefined,
  push_token_updated_at: data.push_token_updated_at ?? undefined,
  push_notification_failures: data.push_notification_failures ?? 0,
  daily_gratitude_goal: data.daily_gratitude_goal ?? undefined,
}));

export type Profile = z.infer<typeof profileSchema>;

// ✅ SIMPLIFIED: Update schema for new structure (post-notification refactor)
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .optional()
    .nullable(),
  onboarded: z.boolean().optional(),
  // ✅ SIMPLIFIED: Only the new notification fields (old complex fields removed)
  notifications_enabled: z.boolean().optional(),
  expo_push_token: z.string().optional().nullable(),
  push_token_updated_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for push_token_updated_at' })
    .optional()
    .nullable(),
  push_notification_failures: z.number().int().min(0).optional(),
  daily_gratitude_goal: z.number().int().positive().optional().nullable(),
  useVariedPrompts: z.boolean().optional(),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
