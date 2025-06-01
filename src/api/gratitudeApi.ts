import { supabase } from '../utils/supabaseClient';

export interface GratitudeEntry {
  id?: string; // UUID, optional for new entries
  user_id: string;
  content: string; // Changed from entry_text
  entry_date: string; // YYYY-MM-DD
  created_at?: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
}

// Function to add a new gratitude entry
export const addGratitudeEntry = async (entry: {
  content: string;
  entry_date: string;
}): Promise<GratitudeEntry | null> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
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
      .upsert(
        {
          user_id: user.id,
          content: entry.content, // Changed from entry_text
          entry_date: entry.entry_date,
        },
        {
          onConflict: 'user_id, entry_date',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error adding gratitude entry:', error);
      throw error;
    }
    return data as GratitudeEntry;
  } catch (error) {
    console.error('Catch block error adding gratitude entry:', error);
    throw error;
  }
};

// Function to fetch gratitude entries for the current user (e.g., paginated or all)
// For simplicity, this fetches all entries, ordered by date.
export const getGratitudeEntries = async (): Promise<GratitudeEntry[]> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
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
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching gratitude entries:', error);
      throw error;
    }
    return data as GratitudeEntry[];
  } catch (error) {
    console.error('Catch block error fetching gratitude entries:', error);
    throw error;
  }
};

// Placeholder for calling calculate_streak RPC
export const getStreak = async (): Promise<number> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }
  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session');
  }

  try {
    const { data, error } = await supabase.rpc('calculate_streak', {
      p_user_id: user.id,
    });
    if (error) {
      console.error('Error calling calculate_streak RPC:', error);
      throw error;
    }
    return data as number;
  } catch (error) {
    console.error('Catch block error calling calculate_streak RPC:', error);
    throw error;
  }
};

// Function to update an existing gratitude entry
export const updateGratitudeEntry = async (
  entryId: string,
  updates: { content?: string; entry_date?: string } // Changed from entry_text
): Promise<GratitudeEntry | null> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }
  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session');
  }

  const validUpdates: Partial<GratitudeEntry> = {};
  if (updates.content !== undefined) validUpdates.content = updates.content; // Changed from entry_text
  if (updates.entry_date !== undefined)
    validUpdates.entry_date = updates.entry_date;
  validUpdates.updated_at = new Date().toISOString();

  // Ensure there's something to update beyond just the updated_at timestamp
  if (
    Object.keys(validUpdates).length === 1 &&
    validUpdates.updated_at &&
    !updates.content &&
    !updates.entry_date
  ) {
    // Changed from entry_text
    console.warn(
      'Update called without changes to content or entry_date. No update performed.'
    );
    // Optionally, could return the original entry or throw an error if this case is problematic
    // For now, returning null as if the update didn't proceed meaningfully.
    // Or, fetch and return the current state of the entry if required by UI.
    const existingEntry = await supabase
      .from('gratitude_entries')
      .select()
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();
    if (existingEntry.data) return existingEntry.data as GratitudeEntry;
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('gratitude_entries')
      .update(validUpdates)
      .eq('id', entryId)
      .eq('user_id', user.id) // Ensure the user owns the entry
      .select()
      .single();

    if (error) {
      console.error('Error updating gratitude entry:', error);
      throw error;
    }
    return data as GratitudeEntry;
  } catch (error) {
    console.error('Catch block error updating gratitude entry:', error);
    throw error;
  }
};

// Function to delete a gratitude entry
export const deleteGratitudeEntry = async (entryId: string): Promise<void> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }
  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session');
  }

  try {
    const { error } = await supabase
      .from('gratitude_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id); // Ensure the user owns the entry

    if (error) {
      console.error('Error deleting gratitude entry:', error);
      throw error;
    }
  } catch (error) {
    console.error('Catch block error deleting gratitude entry:', error);
    throw error;
  }
};

// Function to get a specific gratitude entry by date
export const getGratitudeEntryByDate = async (
  entryDate: string
): Promise<GratitudeEntry | null> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    console.error(
      'Error getting session or no user for getGratitudeEntryByDate:',
      sessionError
    );
    throw (
      sessionError ||
      new Error('No active session or user for getGratitudeEntryByDate')
    );
  }
  const { user } = sessionData.session;

  try {
    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', entryDate)
      .maybeSingle(); // Returns a single record or null, doesn't error if no rows

    if (error) {
      console.error('Error fetching gratitude entry by date:', error);
      throw error;
    }
    return data as GratitudeEntry | null;
  } catch (error) {
    console.error('Catch block error fetching gratitude entry by date:', error);
    throw error;
  }
};

// Function to get dates with entries for a given month and year (for calendar view)
export const getEntryDatesForMonth = async (
  year: number,
  month: number
): Promise<string[]> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    console.error(
      'Error getting session or no user for getEntryDatesForMonth:',
      sessionError
    );
    throw (
      sessionError ||
      new Error('No active session or user for getEntryDatesForMonth')
    );
  }
  const { user } = sessionData.session;

  try {
    const { data, error } = await supabase.rpc('get_entry_dates_for_month', {
      p_user_id: user.id,
      p_year: year,
      p_month: month, // Assuming RPC expects 1-indexed month
    });

    if (error) {
      console.error('Error calling get_entry_dates_for_month RPC:', error);
      throw error;
    }
    // The RPC is expected to return an array of date strings, e.g., ['2023-10-01', '2023-10-15']
    // If it returns objects like [{entry_date: '...'}, ...], adjust accordingly.
    // Assuming it returns string[] directly as per typical design for such an RPC.
    return data || [];
  } catch (error) {
    console.error(
      'Catch block error calling get_entry_dates_for_month RPC:',
      error
    );
    throw error;
  }
};

// Function to get a random gratitude entry for the "Spark of Memory" feature
export const getRandomGratitudeEntry =
  async (): Promise<GratitudeEntry | null> => {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      console.error(
        'Error getting session or no active session for getRandomGratitudeEntry:',
        sessionError
      );
      throw (
        sessionError ||
        new Error('No active session for getRandomGratitudeEntry')
      );
    }
    const { user } = sessionData.session;
    if (!user) {
      console.error('No user found in session for getRandomGratitudeEntry');
      throw new Error('No user found in session for getRandomGratitudeEntry');
    }

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_random_gratitude_entry',
        { p_user_id: user.id }
      );

      if (rpcError) {
        console.error(
          'Error calling get_random_gratitude_entry RPC:',
          rpcError
        );
        throw rpcError;
      }

      // The RPC returns SETOF gratitude_entries, so rpcData is an array.
      // It will be empty if no entries are found.
      if (!rpcData || rpcData.length === 0) {
        return null; // No random entry found
      }

      return rpcData[0] as GratitudeEntry; // Return the first (and only) entry
    } catch (error) {
      console.error('Catch block error in getRandomGratitudeEntry:', error);
      throw error;
    }
  };
