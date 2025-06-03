import { z } from 'zod';

// Schema for the raw data structure directly from the 'gratitude_entries' table
// This should align with the columns defined in the database.
export const rawGratitudeEntrySchema = z.object({
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

export type RawGratitudeEntry = z.infer<typeof rawGratitudeEntrySchema>;

// Application-level schema for a Gratitude Entry.
// This schema should reflect the actual fields of the 'gratitude_entries' table.
// Fields like mood, tags, is_public, image_url are not part of the current gratitude_entries table.
export const gratitudeEntrySchema = z.object({
  id: z.string().uuid('Invalid UUID format for id'),
  user_id: z.string().uuid('Invalid UUID format for user_id'),
  statements: z
    .array(z.string().min(1, 'Statement cannot be empty'))
    .min(1, 'At least one statement is required'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  created_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for created_at' }),
  updated_at: z
    .string()
    .datetime({ offset: true, message: 'Invalid datetime format for updated_at' }),
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
