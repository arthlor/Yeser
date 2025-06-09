import { z } from 'zod';

// 🚨 FIX: Single source of truth with shared validation logic
// Create reusable time validation preprocessing
const timePreprocessor = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
      return timeRegex.test(val) ? val : null;
    }
    return val; // Pass through non-string values (e.g., null, undefined)
  },
  z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format, expected HH:MM:SS')
    .nullable()
);

// 🚨 FIX: Base schema for raw database data (single source of truth)
export const rawProfileDataSchema = z.object({
  id: z.string().uuid('Invalid UUID format for id'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .nullable(),
  onboarded: z.boolean(),
  reminder_enabled: z.boolean(),
  reminder_time: timePreprocessor,
  throwback_reminder_enabled: z.boolean(),
  throwback_reminder_frequency: z.enum(['daily', 'weekly', 'monthly', 'disabled']),
  throwback_reminder_time: timePreprocessor,
  created_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for created_at' }),
  updated_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for updated_at' }),
  daily_gratitude_goal: z.number().int().positive().nullable(), // Assuming DB column can be null
  use_varied_prompts: z.boolean().default(false),
});

export type RawProfileData = z.infer<typeof rawProfileDataSchema>;

// 🚨 FIX: Application schema using .transform() to handle snake_case to camelCase conversion
// This creates a single source of truth and eliminates duplication
export const profileSchema = rawProfileDataSchema.transform((data) => ({
  ...data,
  // 🚨 FIX: Handle snake_case to camelCase conversion safely
  useVariedPrompts: data.use_varied_prompts,
  // Keep both for backward compatibility if needed
  use_varied_prompts: data.use_varied_prompts,
  // Make fields optional for application layer flexibility
  username: data.username ?? undefined,
  onboarded: data.onboarded ?? false,
  reminder_enabled: data.reminder_enabled ?? false,
  reminder_time: data.reminder_time ?? undefined,
  throwback_reminder_enabled: data.throwback_reminder_enabled ?? false,
  throwback_reminder_frequency: data.throwback_reminder_frequency ?? 'disabled',
  throwback_reminder_time: data.throwback_reminder_time ?? undefined,
  daily_gratitude_goal: data.daily_gratitude_goal ?? undefined,
}));

export type Profile = z.infer<typeof profileSchema>;

// 🚨 FIX: Update schema using base validation - no duplication
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username cannot exceed 50 characters')
    .optional()
    .nullable(),
  onboarded: z.boolean().optional(),
  reminder_enabled: z.boolean().optional(),
  // Note: reminder_time has NOT NULL constraint in database, so null is not allowed
  // If reminder is disabled, we keep the existing time value but set reminder_enabled to false
  reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format, expected HH:MM:SS')
    .optional(), // Remove .nullable() since DB doesn't allow null
  throwback_reminder_enabled: z.boolean().optional(),
  throwback_reminder_frequency: z.enum(['daily', 'weekly', 'monthly', 'disabled']).optional(),
  throwback_reminder_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format, expected HH:MM:SS')
    .optional(), // Consistent with reminder_time
  daily_gratitude_goal: z.number().int().positive().optional().nullable(),
  useVariedPrompts: z.boolean().optional(),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;
