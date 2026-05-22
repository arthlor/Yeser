import { z } from 'zod';
import i18n from '@/i18n';

const t = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback });

const nonBlankStatementSchema = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    if (value.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.statement.empty', 'Statement cannot be empty'),
      });
    }
  });

// 🚨 FIX: Single source of truth schema (DRY principle)
// Base schema that defines the core structure once
export const attachmentSchema = z.object({
  id: z.string().uuid(),
  statement_index: z.number().int().min(0),
  kind: z.enum(['image', 'audio']),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  bytes: z.number().int().positive(),
  duration_ms: z.number().int().positive().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  transcript: z.string().nullable().optional(),
  created_at: z.string(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

const baseGratitudeEntrySchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID for id' }),
  user_id: z.string().uuid({ message: 'Invalid UUID for user_id' }),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  // statements are stored as JSONB in the DB, typically fetched as a parsed object or array by Supabase client.
  // Assuming it's an array of strings post-fetch.
  statements: z.array(nonBlankStatementSchema),
  // New optional moods map: index (string) -> emoji string
  moods: z.record(z.string(), z.string()).optional(),
  // Optional media attachments. Populated by paginated RPC or by a side-fetch.
  attachments: z.array(attachmentSchema).optional(),
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
  statements: z.array(nonBlankStatementSchema).superRefine((value, ctx) => {
    if (value.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: t('validation.statement.required', 'At least one statement is required'),
      });
    }
  }),
});

export type GratitudeEntry = z.infer<typeof gratitudeEntrySchema>;

// Schema for data used by add_gratitude_statement RPC
export const addStatementPayloadSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  statement: nonBlankStatementSchema,
  mood: z.string().nullable().optional(),
  // user_id is implicit from the session when calling the RPC
});

export type AddStatementPayload = z.infer<typeof addStatementPayloadSchema>;

// Schema for payload to edit_gratitude_statement RPC
export const editStatementPayloadSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  statement_index: z.number().int().min(0, 'Statement index must be non-negative'),
  updated_statement: nonBlankStatementSchema,
  mood: z.string().nullable().optional(),
});

export type EditStatementPayload = z.infer<typeof editStatementPayloadSchema>;

// Schema for payload to delete_gratitude_statement RPC
export const deleteStatementPayloadSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  statement_index: z.number().int().min(0, 'Statement index must be non-negative'),
});

export const setStatementMoodPayloadSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  statement_index: z.number().int().min(0, 'Statement index must be non-negative'),
  mood: z.string().nullable(),
});

export type SetStatementMoodPayload = z.infer<typeof setStatementMoodPayloadSchema>;

export type DeleteStatementPayload = z.infer<typeof deleteStatementPayloadSchema>;

// Schema for DailyPrompt from the daily_prompts table
export const dailyPromptSchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID for prompt id' }),
  prompt_text_tr: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.prompt.turkishRequired', 'Turkish prompt text is required'),
        });
      }
    }),
  prompt_text_en: z.string().nullable().optional(),
  prompt_text_es: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

/**
 * Schema for localized DailyPrompt data with selected language content.
 * This is used when returning language-specific content to the client.
 */
export const localizedDailyPromptSchema = z.object({
  id: z.string().uuid({ message: 'Invalid UUID for prompt id' }),
  prompt_text: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('validation.prompt.textRequired', 'Prompt text is required'),
        });
      }
    }),
  category: z.string().nullable().optional(),
});

export type DailyPrompt = z.infer<typeof dailyPromptSchema>;
export type LocalizedDailyPrompt = z.infer<typeof localizedDailyPromptSchema>;
