import * as z from 'zod';
import {
  addStatementPayloadSchema,
  deleteStatementPayloadSchema,
  editStatementPayloadSchema,
  gratitudeEntrySchema,
  rawGratitudeEntrySchema,
} from '../schemas/gratitudeEntrySchema';
import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';

import type { GratitudeEntry } from '../schemas/gratitudeEntrySchema';
import type { Database } from '../types/supabase.types';

export type GratitudeEntryRow = Database['public']['Tables']['gratitude_entries']['Row'];

// RawSelectedGratitudeEntryData is no longer needed, RawGratitudeEntry from Zod schema will be used.

// --- New RPC-based functions for managing individual statements --- //

/**
 * Adds a new gratitude statement to a specific date.
 * Calls the `add_gratitude_statement` RPC.
 */
export const addStatement = async (
  entryDate: string,
  statementText: string
): Promise<GratitudeEntry | null> => {
  // Validate inputs for the RPC call (client-side)
  const validationResult = addStatementPayloadSchema.safeParse({
    entry_date: entryDate,
    statement: statementText,
  });

  if (!validationResult.success) {
    logger.error('Invalid input for addStatement:', {
      extra: validationResult.error.flatten(),
    });
    // Optionally, throw a custom error or return a specific error object
    throw new Error(
      `Invalid input: ${validationResult.error.flatten().fieldErrors.statement?.[0] || validationResult.error.flatten().fieldErrors.entry_date?.[0] || 'Validation failed'}`
    );
  }

  try {
    const { error } = await supabase.rpc('add_gratitude_statement', {
      p_entry_date: entryDate,
      p_statement: statementText,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'add gratitude statement');
    }

    return getGratitudeDailyEntryByDate(entryDate);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'add gratitude statement');
  }
};

/**
 * Edits an existing gratitude statement at a specific index for a given date.
 * Calls the `edit_gratitude_statement` RPC.
 */
export const editStatement = async (
  entryDate: string,
  statementIndex: number,
  updatedStatementText: string
): Promise<void> => {
  try {
    const validationResult = editStatementPayloadSchema.safeParse({
      entry_date: entryDate,
      statement_index: statementIndex,
      updated_statement: updatedStatementText,
    });

    if (!validationResult.success) {
      logger.error('Invalid input for editStatement:', {
        extra: validationResult.error.flatten(),
      });
      throw new Error('Invalid input for editing statement.');
    }

    const { error } = await supabase.rpc('edit_gratitude_statement', {
      p_entry_date: entryDate,
      p_statement_index: statementIndex,
      p_updated_statement: updatedStatementText,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'edit gratitude statement');
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'edit gratitude statement');
  }
};

/**
 * Deletes a gratitude statement at a specific index for a given date.
 * Calls the `delete_gratitude_statement` RPC.
 * The RPC will also delete the parent `gratitude_entries` row if it becomes empty.
 */
export const deleteStatement = async (entryDate: string, statementIndex: number): Promise<void> => {
  try {
    const validationResult = deleteStatementPayloadSchema.safeParse({
      entry_date: entryDate,
      statement_index: statementIndex,
    });

    if (!validationResult.success) {
      logger.error('Invalid input for deleteStatement:', {
        extra: validationResult.error.flatten(),
      });
      throw new Error('Invalid input for deleting statement.');
    }

    const { error } = await supabase.rpc('delete_gratitude_statement', {
      p_entry_date: entryDate,
      p_statement_index: statementIndex,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'delete gratitude statement');
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'delete gratitude statement');
  }
};

/**
 * Deletes an entire gratitude entry by date (atomic operation)
 * This is more efficient than deleting individual statements when removing a whole entry
 * Calls the `delete_gratitude_entry_by_date` RPC.
 */
export const deleteEntireEntry = async (entryDate: string): Promise<void> => {
  try {
    // Validate the date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(entryDate)) {
      throw new Error('Invalid date format, expected YYYY-MM-DD');
    }

    const { error } = await supabase.rpc('delete_gratitude_entry_by_date', {
      p_entry_date: entryDate,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'delete entire gratitude entry');
    }

    logger.debug('Successfully deleted entire entry', { entryDate });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'delete entire gratitude entry');
  }
};

// --- Updated functions to fetch gratitude data --- //

/**
 * Helper function to map a raw gratitude entry (with Json statements)
 * to a GratitudeDailyEntry (with string[] statements).
 * Accepts data that might or might not have the 'content' field.
 */
const mapAndValidateRawEntry = (
  rawEntryData: GratitudeEntryRow // Data directly from Supabase
): GratitudeEntry => {
  // First, validate the raw structure. Supabase client should parse JSONB to JS array for 'statements'.
  const rawValidationResult = rawGratitudeEntrySchema.safeParse(rawEntryData);

  if (!rawValidationResult.success) {
    logger.error('Failed to validate raw gratitude entry data from DB:', {
      extra: rawValidationResult.error.flatten(),
    });
    // logger.error('Problematic raw entry data:', rawEntryData);
    throw new Error('Invalid raw data structure received from database for gratitude entry.');
  }

  // If raw validation is successful, then parse against the application-level schema.
  // This step ensures any transformations or stricter rules in gratitudeEntrySchema are met.
  // Given current schemas, this might seem redundant, but it's a good practice for future-proofing.
  try {
    const appLevelEntry = gratitudeEntrySchema.parse(rawValidationResult.data);
    return appLevelEntry;
  } catch (error) {
    logger.error('Failed to parse validated raw entry against application schema:', {
      extra: error instanceof z.ZodError ? error.flatten() : { error: String(error) },
    });
    // logger.error('Data that failed application schema parsing:', rawValidationResult.data);
    throw new Error('Validated raw data failed application-level schema parsing.');
  }
};

/**
 * Fetches all gratitude daily entries for the current user, ordered by date.
 * Each entry contains an array of gratitude statements.
 */
export const getGratitudeDailyEntries = async (): Promise<GratitudeEntry[]> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }
    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }
    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('id, user_id, entry_date, statements, created_at, updated_at')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch gratitude daily entries');
    }
    if (!data) {
      return [];
    }
    return data.map(mapAndValidateRawEntry);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch gratitude daily entries');
  }
};

/**
 * Fetches paginated gratitude daily entries for the current user, ordered by date.
 * Each entry contains an array of gratitude statements.
 *
 * @param page - Page number (0-based)
 * @param limit - Number of entries per page (default: 20)
 * @returns Promise containing entries and pagination metadata
 */
export const getGratitudeDailyEntriesPaginated = async (
  page: number = 0,
  limit: number = 20
): Promise<{
  entries: GratitudeEntry[];
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }
    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }

    const offset = page * limit;

    // Get total count for pagination metadata using existing function
    const totalCount = await getTotalGratitudeEntriesCount();

    // Get paginated entries
    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('id, user_id, entry_date, statements, created_at, updated_at')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch paginated gratitude daily entries');
    }

    const entries = data ? data.map(mapAndValidateRawEntry) : [];
    const hasMore = totalCount ? offset + entries.length < totalCount : false;

    return {
      entries,
      hasMore,
      totalCount: totalCount || 0,
      currentPage: page,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch paginated gratitude daily entries');
  }
};

/**
 * Fetches a specific gratitude daily entry by date for the current user.
 */
export const getGratitudeDailyEntryByDate = async (
  entryDate: string
): Promise<GratitudeEntry | null> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }
    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }
    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('id, user_id, entry_date, statements, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('entry_date', entryDate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No entry for this date
      }
      throw handleAPIError(new Error(error.message), 'fetch gratitude daily entry by date');
    }
    return data ? mapAndValidateRawEntry(data as GratitudeEntryRow) : null;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch gratitude daily entry by date');
  }
};

/**
 * Fetches distinct entry dates for a given month and year for the current user.
 * Calls the `get_entry_dates_for_month` Supabase RPC.
 */
export const getEntryDatesForMonth = async (year: number, month: number): Promise<string[]> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }
    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }
    const { data, error } = await supabase.rpc('get_entry_dates_for_month', {
      p_user_id: user.id,
      p_year: year,
      p_month: month,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch entry dates for month');
    }

    return data || [];
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch entry dates for month');
  }
};

/**
 * Fetches a single random gratitude daily entry for the current user.
 * Calls the `get_random_gratitude_entry` SQL function.
 */
export const getRandomGratitudeEntry = async (): Promise<GratitudeEntry | null> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }
    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }

    // The SQL function 'get_random_gratitude_entry' expects p_user_id
    // and returns SETOF gratitude_entries.
    // We call it as an RPC that returns an array, and we take the first element.
    const { data, error } = await supabase.rpc('get_random_gratitude_entry', {
      p_user_id: user.id,
    });

    if (error) {
      throw handleAPIError(error, 'fetch random gratitude entry');
    }

    // The RPC returns an array, so we take the first element
    if (data && data.length > 0) {
      return mapAndValidateRawEntry(data[0] as GratitudeEntryRow);
    }

    return null;
  } catch (error) {
    throw handleAPIError(error as Error, 'fetch random gratitude entry');
  }
};

// --- Function to get total entry count --- //

/**
 * Fetches the total count of gratitude entries for the current user.
 * Uses optimized RPC function for better performance than SELECT(*) with count.
 */
export const getTotalGratitudeEntriesCount = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_user_gratitude_entries_count');

    if (error) {
      throw handleAPIError(new Error(error.message), 'fetch total gratitude entries count');
    }

    return data || 0;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch total gratitude entries count');
  }
};
