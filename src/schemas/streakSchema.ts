import * as z from 'zod';

// Corresponds to the raw data structure from the 'streaks' table
export const rawStreakSchema = z.object({
  id: z.string().uuid({ message: 'Invalid streak ID format' }),
  user_id: z.string().uuid({ message: 'Invalid user ID format' }),
  current_streak: z
    .number()
    .int({ message: 'Current streak must be an integer' })
    .min(0, { message: 'Current streak cannot be negative' }),
  longest_streak: z
    .number()
    .int({ message: 'Longest streak must be an integer' })
    .min(0, { message: 'Longest streak cannot be negative' }),
  last_entry_date: z
    .string()
    .nullable()
    .refine((val) => val === null || /^\d{4}-\d{2}-\d{2}$/.test(val), {
      message: 'Invalid date format for last entry date, expected YYYY-MM-DD or null',
    }),
  // Use z.coerce.date() to handle various datetime formats from PostgreSQL/Supabase
  // This is more flexible than z.string().datetime() and can parse timestamps without strict ISO 8601 format
  created_at: z.coerce.date({ message: 'Invalid datetime format for created_at' }),
  updated_at: z.coerce.date({ message: 'Invalid datetime format for updated_at' }),
});

export type RawStreak = z.infer<typeof rawStreakSchema>;

// Helper to parse YYYY-MM-DD string to a Date object (UTC midnight)
// Preprocesses the input: if it's a YYYY-MM-DD string, it converts to Date. Otherwise, passes through.
// Then, z.date() validates if the result is a Date object.
const yyyyMmDdStringToDateSchema = z.preprocess((arg) => {
  if (typeof arg === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(arg)) {
    // Appending T00:00:00Z ensures it's parsed as UTC midnight,
    // avoiding timezone issues that `new Date('YYYY-MM-DD')` can have.
    const date = new Date(arg + 'T00:00:00Z');
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return arg; // Return original value to let z.date() fail with proper error
    }
    return date;
  }
  return arg; // Pass through other types (like null or already a Date) for further validation
}, z.date());

// Application-level schema for a streak.
// Transforms date strings from rawStreakSchema into Date objects.
export const streakSchema = rawStreakSchema.extend({
  last_entry_date: yyyyMmDdStringToDateSchema.nullable(), // Transforms valid YYYY-MM-DD string or null to Date or null
  // created_at and updated_at are already Date objects from rawStreakSchema, no need to transform again
});
// When streakSchema.parse(data) is called:
// 1. `data` is first validated against `rawStreakSchema`.
// 2. Then, the specified fields (`last_entry_date`) are processed by their new schemas in the `extend` call, performing the transformation.
// 3. created_at and updated_at remain as Date objects from the raw schema validation.

export type Streak = z.infer<typeof streakSchema>; // `last_entry_date`, `created_at`, `updated_at` are now Date objects or null

// Schema for updating a streak (payload to an API, likely expects string dates)
export const updateStreakSchema = z.object({
  current_streak: z.number().int().min(0).optional(),
  longest_streak: z.number().int().min(0).optional(),
  last_entry_date: z
    .string()
    .refine(
      // API likely expects YYYY-MM-DD string
      (val) => /^\d{4}-\d{2}-\d{2}$/.test(val),
      { message: 'Invalid date format, expected YYYY-MM-DD' }
    )
    .nullable()
    .optional(), // .optional() means the key can be absent, .nullable() means its value can be null
});

export type UpdateStreakPayload = z.infer<typeof updateStreakSchema>;

// Schema for creating a streak
export const createStreakSchema = z.object({
  user_id: z.string().uuid(),
  // current_streak: z.number().int().min(0).optional().default(0), // Example if creation allows setting these
  // longest_streak: z.number().int().min(0).optional().default(0),
  // last_entry_date: z.string().refine(
  //   (val) => /^\d{4}-\d{2}-\d{2}$/.test(val),
  //   { message: 'Invalid date format, expected YYYY-MM-DD' }
  // ).nullable().optional(),
});

export type CreateStreakPayload = z.infer<typeof createStreakSchema>;
