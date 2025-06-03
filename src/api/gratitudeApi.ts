import * as z from 'zod';

import {
  gratitudeEntrySchema,
  type GratitudeEntry, // This is now the primary type for a daily entry
  addStatementPayloadSchema,
  editStatementPayloadSchema,
  deleteStatementPayloadSchema,
} from '../schemas/gratitudeEntrySchema';

// Base type from generated Supabase types for a row in gratitude_entries
// This can still be useful for understanding the raw DB structure before validation/mapping
import { rawGratitudeEntrySchema, type RawGratitudeEntry } from '../schemas/gratitudeEntrySchema';
import { supabase } from '../utils/supabaseClient';

import type { Database, Json } from '../types/supabase.types'; // Keep Json for raw Supabase data if needed

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
    console.error('Invalid input for addStatement:', validationResult.error.flatten());
    // Optionally, throw a custom error or return a specific error object
    throw new Error(
      `Invalid input: ${validationResult.error.flatten().fieldErrors.statement?.[0] || validationResult.error.flatten().fieldErrors.entry_date?.[0] || 'Validation failed'}`
    );
  }

  const { error } = await supabase.rpc('add_gratitude_statement', {
    p_entry_date: entryDate,
    p_statement: statementText,
  });

  if (error) {
    console.error('Error adding gratitude statement:', error);
    throw error;
  }

  // If RPC is successful, fetch and return the updated entry
  return getGratitudeDailyEntryByDate(entryDate);
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
  // Validate inputs for the RPC call (client-side)
  const validationResult = editStatementPayloadSchema.safeParse({
    entry_date: entryDate,
    statement_index: statementIndex,
    updated_statement: updatedStatementText,
  });

  if (!validationResult.success) {
    console.error('Invalid input for editStatement:', validationResult.error.flatten());
    throw new Error('Invalid input for editing statement.');
  }

  const { error } = await supabase.rpc('edit_gratitude_statement', {
    p_entry_date: entryDate,
    p_statement_index: statementIndex,
    p_updated_statement: updatedStatementText,
  });

  if (error) {
    console.error('Error editing gratitude statement:', error);
    throw error;
  }
};

/**
 * Deletes a gratitude statement at a specific index for a given date.
 * Calls the `delete_gratitude_statement` RPC.
 * The RPC will also delete the parent `gratitude_entries` row if it becomes empty.
 */
export const deleteStatement = async (entryDate: string, statementIndex: number): Promise<void> => {
  // Validate inputs for the RPC call (client-side)
  const validationResult = deleteStatementPayloadSchema.safeParse({
    entry_date: entryDate,
    statement_index: statementIndex,
  });

  if (!validationResult.success) {
    console.error('Invalid input for deleteStatement:', validationResult.error.flatten());
    throw new Error('Invalid input for deleting statement.');
  }

  const { error } = await supabase.rpc('delete_gratitude_statement', {
    p_entry_date: entryDate,
    p_statement_index: statementIndex,
  });

  if (error) {
    console.error('Error deleting gratitude statement:', error);
    throw error;
  }
};

// --- Updated functions to fetch gratitude data --- //

/**
 * Helper function to map a raw gratitude entry (with Json statements)
 * to a GratitudeDailyEntry (with string[] statements).
 * Accepts data that might or might not have the 'content' field.
 */
const mapAndValidateRawEntry = (
  rawEntryData: any // Data directly from Supabase
): GratitudeEntry => {
  // First, validate the raw structure. Supabase client should parse JSONB to JS array for 'statements'.
  const rawValidationResult = rawGratitudeEntrySchema.safeParse(rawEntryData);

  if (!rawValidationResult.success) {
    console.error(
      'Failed to validate raw gratitude entry data from DB:',
      rawValidationResult.error.flatten()
    );
    // console.error('Problematic raw entry data:', rawEntryData);
    throw new Error('Invalid raw data structure received from database for gratitude entry.');
  }

  // If raw validation is successful, then parse against the application-level schema.
  // This step ensures any transformations or stricter rules in gratitudeEntrySchema are met.
  // Given current schemas, this might seem redundant, but it's a good practice for future-proofing.
  try {
    const appLevelEntry = gratitudeEntrySchema.parse(rawValidationResult.data);
    return appLevelEntry;
  } catch (error) {
    console.error(
      'Failed to parse validated raw entry against application schema:',
      error instanceof z.ZodError ? error.flatten() : error
    );
    // console.error('Data that failed application schema parsing:', rawValidationResult.data);
    throw new Error('Validated raw data failed application-level schema parsing.');
  }
};

/**
 * Fetches all gratitude daily entries for the current user, ordered by date.
 * Each entry contains an array of gratitude statements.
 */
export const getGratitudeDailyEntries = async (): Promise<GratitudeEntry[]> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }
  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session');
  }

  try {
    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('id, user_id, entry_date, statements, created_at, updated_at')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching gratitude daily entries:', error);
      throw error;
    }
    // Data from select matches GratitudeEntryRow structure
    if (!data) {
      return []; // Return empty array if no data
    }
    // Each item needs to be mapped and validated
    return data.map(mapAndValidateRawEntry);
  } catch (error) {
    console.error('Catch block error fetching gratitude daily entries:', error);
    throw error;
  }
};

/**
 * Fetches a specific gratitude daily entry by date for the current user.
 */
export const getGratitudeDailyEntryByDate = async (
  entryDate: string
): Promise<GratitudeEntry | null> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }
  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session');
  }

  try {
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
      console.error('Error fetching gratitude daily entry by date:', error);
      throw error;
    }
    // Data from the direct select query is in the 'data' variable
    return data
      ? mapAndValidateRawEntry(data as GratitudeEntryRow) // Use GratitudeEntryRow as it includes all potential fields from the table
      : null;
  } catch (error) {
    console.error('Catch block error fetching gratitude daily entry by date:', error);
    throw error;
  }
};

/**
 * Fetches distinct entry dates for a given month and year for the current user.
 * Calls the `get_entry_dates_for_month` Supabase RPC.
 */
export const getEntryDatesForMonth = async (year: number, month: number): Promise<string[]> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }
  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session');
  }

  try {
    const { data, error } = await supabase.rpc('get_entry_dates_for_month', {
      p_user_id: user.id,
      p_year: year,
      p_month: month,
    });

    if (error) {
      console.error('Error fetching entry dates for month:', error);
      throw error;
    }

    // The RPC returns an array of date strings (e.g., "YYYY-MM-DD")
    return data || []; // Ensure it returns an empty array if data is null/undefined
  } catch (error) {
    console.error('Catch block error fetching entry dates for month:', error);
    throw error;
  }
};

/**
 * Fetches a single random gratitude daily entry for the current user.
 * Calls the `get_random_gratitude_entry` SQL function.
 */
export const getRandomGratitudeEntry = async (): Promise<GratitudeEntry | null> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }
  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session');
  }

  try {
    // The SQL function 'get_random_gratitude_entry' expects p_user_id
    // and returns SETOF gratitude_entries.
    // We call it as an RPC that returns an array, and we take the first element.
    const { data, error } = await supabase.rpc('get_random_gratitude_entry', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error fetching random gratitude entry:', error);
      throw error;
    }

    // The RPC call for a SETOF function returns an array of rows.
    // Since we LIMIT 1 in SQL, it should be an array with 0 or 1 elements.
    if (data && Array.isArray(data) && data.length > 0) {
      // Data is GratitudeEntryRow[] with one element
      const rawEntry = data[0] as GratitudeEntryRow; // Explicitly take the first element
      return mapAndValidateRawEntry(rawEntry); // Map the single entry
    }
    return null; // No entry found or unexpected data format
  } catch (error) {
    console.error('Catch block error fetching random gratitude entry:', error);
    throw error;
  }
};

// --- Function to get total entry count --- //

/**
 * Fetches the total count of gratitude entries for the current user.
 * Calls the `get_user_gratitude_entries_count` RPC.
 */
export const getTotalGratitudeEntriesCount = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_user_gratitude_entries_count');

  if (error) {
    console.error('Error fetching total gratitude entries count:', error);
    throw error;
  }

  // The RPC is expected to return an integer.
  // If data is null or not a number, default to 0 or handle as an error.
  if (typeof data === 'number') {
    return data;
  }

  console.warn('Received unexpected data type for total entries count:', data);
  return 0; // Fallback or consider throwing an error
};
