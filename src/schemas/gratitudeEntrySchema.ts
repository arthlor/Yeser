import { z } from 'zod';

// 🚨 FIX: Single source of truth schema (DRY principle)
// Base schema that defines the core structure once
const baseGratitudeEntrySchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID for id' }),
  user_id: z.string().uuid({ message: 'Invalid UUID for user_id' }),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  // statements are stored as JSONB in the DB, typically fetched as a parsed object or array by Supabase client.
  // Assuming it's an array of strings post-fetch.
  statements: z.array(z.string().min(1, 'Statement cannot be empty')),
  created_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for created_at' }),
  updated_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for updated_at' }),
});

// 🚨 FIX: Raw schema extends base schema - no duplication
export const rawGratitudeEntrySchema = baseGratitudeEntrySchema;

export type RawGratitudeEntry = z.infer<typeof rawGratitudeEntrySchema>;

// 🚨 FIX: Application schema extends base with additional validation
// If they're identical, just reuse the base. If different, use .extend()
export const gratitudeEntrySchema = baseGratitudeEntrySchema.extend({
  // Enhanced validation for application layer
  statements: z
    .array(z.string().min(1, 'Statement cannot be empty'))
    .min(1, 'At least one statement is required'),
});

export type GratitudeEntry = z.infer<typeof gratitudeEntrySchema>;

// Schema for data used by add_gratitude_statement RPC
export const addStatementPayloadSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  statement: z.string().min(1, 'Statement cannot be empty'),
  // user_id is implicit from the session when calling the RPC
});

export type AddStatementPayload = z.infer<typeof addStatementPayloadSchema>;

// Schema for payload to edit_gratitude_statement RPC
export const editStatementPayloadSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  statement_index: z.number().int().min(0, 'Statement index must be non-negative'),
  updated_statement: z.string().min(1, 'Statement cannot be empty'),
});

export type EditStatementPayload = z.infer<typeof editStatementPayloadSchema>;

// Schema for payload to delete_gratitude_statement RPC
export const deleteStatementPayloadSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  statement_index: z.number().int().min(0, 'Statement index must be non-negative'),
});

export type DeleteStatementPayload = z.infer<typeof deleteStatementPayloadSchema>;

// Schema for DailyPrompt from the daily_prompts table
export const dailyPromptSchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID for prompt id' }),
  prompt_text_tr: z.string().min(1, 'Turkish prompt text is required'),
  prompt_text_en: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

export type DailyPrompt = z.infer<typeof dailyPromptSchema>;
