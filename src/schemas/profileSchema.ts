import { z } from 'zod';

// Schema for raw data directly from the 'profiles' Supabase table
export const rawProfileDataSchema = z.object({
  id: z.string().uuid('Invalid UUID format for id'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username cannot exceed 50 characters').nullable(),
  onboarded: z.boolean(),
  reminder_enabled: z.boolean(),
  reminder_time: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
        return timeRegex.test(val) ? val : null;
      }
      return val; // Pass through non-string values (e.g., null, undefined)
    },
    z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format, expected HH:MM:SS').nullable()
  ),
  throwback_reminder_enabled: z.boolean(),
  throwback_reminder_frequency: z.enum(['daily', 'weekly', 'monthly', 'disabled']),
  updated_at: z.string().datetime({ offset: true, message: 'Invalid datetime format for updated_at' }),
  daily_gratitude_goal: z.number().int().positive().nullable(), // Assuming DB column can be null
});

export type RawProfileData = z.infer<typeof rawProfileDataSchema>;

// Schema for the application-level Profile object (after potential transformations)
export const profileSchema = z.object({
  id: z.string().uuid('Invalid UUID format for id'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username cannot exceed 50 characters').optional().nullable(),
  onboarded: z.boolean().optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_time: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
        return timeRegex.test(val) ? val : null;
      }
      return val; // Pass through non-string values (e.g., null, undefined)
    },
    z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format, expected HH:MM:SS').optional().nullable()
  ),
  throwback_reminder_enabled: z.boolean().optional(),
  throwback_reminder_frequency: z.enum(['daily', 'weekly', 'monthly', 'disabled']).optional(),
  created_at: z.string().datetime({ offset: true, message: 'Invalid datetime format for created_at' }),
  updated_at: z.string().datetime({ offset: true, message: 'Invalid datetime format for updated_at' }),
  daily_gratitude_goal: z.number().int().positive().optional().nullable(),
});

export type Profile = z.infer<typeof profileSchema>;

// Schema for updating a profile, all fields are optional
// Ensure this aligns with the fields that can actually be updated in the 'profiles' table
export const updateProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username cannot exceed 50 characters').optional().nullable(),
  onboarded: z.boolean().optional(),
  reminder_enabled: z.boolean().optional(),
  // For reminder_time, allowing null means the user wants to clear it.
  // If undefined, it means no change. If a string, it's an update.
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format, expected HH:MM:SS').nullable().optional(),
  throwback_reminder_enabled: z.boolean().optional(),
  throwback_reminder_frequency: z.enum(['daily', 'weekly', 'monthly', 'disabled']).optional(),
  daily_gratitude_goal: z.number().int().positive().optional(),
});

export type UpdateProfilePayload = z.infer<typeof updateProfileSchema>;

