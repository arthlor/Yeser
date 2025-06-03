import { rawStreakSchema, streakSchema, type Streak } from '../schemas/streakSchema';
import { supabase } from '../utils/supabaseClient';

import type { Tables } from '../types/supabase.types';

// Function to get the user's current streak
export const fetchUserStreak = async (): Promise<number> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }

  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session for streak fetching');
  }

  try {
    // Ensure you have an RPC function in Supabase named 'calculate_streak'
    // that accepts 'p_user_id' and returns the streak count as a number.
    const { data, error } = await supabase.rpc('calculate_streak', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error fetching user streak:', error);
      throw error;
    }

    if (typeof data === 'number') {
      return data;
    }

    // If your RPC returns an object, e.g., { streak_count: 5 }, adjust like this:
    // if (data && typeof (data as any).streak_count === 'number') {
    //   return (data as any).streak_count;
    // }

    console.warn('Unexpected data format from calculate_streak RPC:', data);
    throw new Error('Unexpected data format for streak.');
  } catch (error) {
    console.error('Catch block error fetching user streak:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching streak.');
  }
};

// Function to get the user's full streak data object
export const getStreakData = async (): Promise<Streak | null> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }

  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session for fetching streak data');
  }

  try {
    const { data, error, status } = await supabase
      .from('streaks')
      .select(
        'id, user_id, current_streak, longest_streak, last_entry_date, created_at, updated_at'
      )
      .eq('user_id', user.id)
      .single();

    if (error && status !== 406) {
      // 406 status means no rows found, which is a valid case (user might not have a streak record yet)
      console.error('Error fetching streak data:', error);
      throw error;
    }

    if (data) {
      // Validate raw data from Supabase using rawStreakSchema
      // Cast 'data' to the expected Supabase row type for 'streaks' before validation
      const rawValidationResult = rawStreakSchema.safeParse(data as Tables<'streaks'>);
      if (!rawValidationResult.success) {
        console.error(
          'Raw streak data validation failed on fetch:',
          rawValidationResult.error.flatten()
        );
        throw new Error(`Invalid raw streak data from DB: ${rawValidationResult.error.toString()}`);
      }
      // Now, parse the raw (but validated) data through streakSchema to transform dates
      const finalValidationResult = streakSchema.safeParse(rawValidationResult.data);
      if (!finalValidationResult.success) {
        console.error(
          'Streak data transformation/validation failed:',
          finalValidationResult.error.flatten()
        );
        throw new Error(
          `Invalid streak data after transformation: ${finalValidationResult.error.toString()}`
        );
      }
      return finalValidationResult.data;
    }
    return null; // No streak data found for the user
  } catch (error) {
    console.error('Catch block error fetching streak data:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching streak data.');
  }
};
