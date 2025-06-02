import * as z from 'zod';
import { supabase } from '../utils/supabaseClient';
import {
  profileSchema,
  Profile,
  updateProfileSchema,
  UpdateProfilePayload,
  rawProfileDataSchema, // Added import
  RawProfileData,       // Added import
} from '../schemas/profileSchema';
import { TablesUpdate, Tables } from '../types/supabase.types';
import { rawStreakSchema, streakSchema, Streak } from '../schemas/streakSchema';

// Removed local RawProfileData interface, will use inferred type from Zod schema

const mapAndValidateRawProfile = (validatedRawData: RawProfileData): Profile => {
  // Map DB's updated_at to created_at for Zod schema compatibility, as 'profiles' table lacks a dedicated created_at.
  // updated_at itself will also be from validatedRawData.updated_at.
  const dataForZod = {
    ...validatedRawData, // validatedRawData now only has updated_at from the DB for timestamps
    created_at: validatedRawData.updated_at, // Use updated_at as the source for created_at
    // updated_at is already present in validatedRawData and will be passed through
  };
  // No need to delete 'inserted_at' as it's no longer part of RawProfileData
  const validationResult = profileSchema.safeParse(dataForZod);
  if (!validationResult.success) {
    console.error('Profile data validation failed:', validationResult.error.flatten());
    // It's often better to throw the specific ZodError for more detailed context upstream
    throw new Error(`Invalid profile data: ${validationResult.error.toString()}`);
  }
  return validationResult.data;
};

// Function to get the user's profile
export const getProfile = async (): Promise<Profile | null> => {
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
    const { data, error, status } = await supabase
      .from('profiles')
      .select(
        'id, username, onboarded, reminder_enabled, reminder_time, throwback_reminder_enabled, throwback_reminder_frequency, updated_at, daily_gratitude_goal'
      )
      .eq('id', user.id)
      .single();

    if (error && status !== 406) {
      // 406 status means no rows found, which is a valid case for a new user
      console.error('Error fetching profile:', error);
      throw error;
    }

    if (data) {
      // Validate raw data from Supabase first
      const rawValidationResult = rawProfileDataSchema.safeParse(data);
      if (!rawValidationResult.success) {
        console.error('Raw profile data validation failed on fetch:', rawValidationResult.error.flatten());
        throw new Error(`Invalid raw profile data from DB: ${rawValidationResult.error.toString()}`);
      }
      return mapAndValidateRawProfile(rawValidationResult.data);
    }
    return null; // No profile found, could be a new user
  } catch (error) {
    console.error('Catch block error fetching profile:', error);
    throw error;
  }
};

// Function to update the user's profile
export const updateProfile = async (
  profileUpdates: UpdateProfilePayload
): Promise<Profile | null> => {
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

  // Validate the input payload first
  const validationResult = updateProfileSchema.safeParse(profileUpdates);
  if (!validationResult.success) {
    console.error('Update profile payload validation failed:', validationResult.error.flatten());
    throw new Error(`Invalid update profile payload: ${validationResult.error.toString()}`);
  }
  const { reminder_time, ...otherValidatedUpdates } = validationResult.data;

  // Prepare the payload for Supabase, explicitly typing to match Supabase's expected Update type.
  const payloadForSupabase: TablesUpdate<'profiles'> & { updated_at: string } = {
    ...otherValidatedUpdates, // Spread fields that are compatible
    updated_at: new Date().toISOString(),
  };

  // Handle reminder_time separately due to null vs undefined mismatch with Supabase types
  if (reminder_time !== undefined) {
    if (reminder_time === null) {
      // Supabase client expects `string | undefined`, but DB allows null.
      // Cast to `any` for this specific assignment if reminder_time is null.
      (payloadForSupabase as any).reminder_time = null;
    } else {
      // If it's a string, assign it directly.
      payloadForSupabase.reminder_time = reminder_time;
    }
  }
  // If reminder_time was undefined from validationResult.data, it's correctly omitted.

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(payloadForSupabase)
      .eq('id', user.id)
      .select(
        'id, username, onboarded, reminder_enabled, reminder_time, throwback_reminder_enabled, throwback_reminder_frequency, updated_at, daily_gratitude_goal'
      )
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    if (data) {
      // Validate raw data from Supabase first
      const rawValidationResult = rawProfileDataSchema.safeParse(data);
      if (!rawValidationResult.success) {
        console.error('Raw profile data validation failed on update:', rawValidationResult.error.flatten());
        throw new Error(`Invalid raw profile data from DB after update: ${rawValidationResult.error.toString()}`);
      }
      return mapAndValidateRawProfile(rawValidationResult.data);
    }
    return null;
  } catch (error) {
    console.error('Catch block error updating profile:', error);
    throw error;
  }
};

// Function to get the user's current streak
export const fetchUserStreak = async (): Promise<number> => {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    console.error('Error getting session or no active session:', sessionError);
    throw sessionError || new Error('No active session');
  }

  const { user } = sessionData.session;
  if (!user) {
    throw new Error('No user found in session for streak fetching');
  }

  try {
    // Ensure you have an RPC function in Supabase named 'get_user_streak'
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

    console.warn('Unexpected data format from get_user_streak RPC:', data);
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
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
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
      .select('id, user_id, current_streak, longest_streak, last_entry_date, created_at, updated_at')
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
        console.error('Raw streak data validation failed on fetch:', rawValidationResult.error.flatten());
        throw new Error(`Invalid raw streak data from DB: ${rawValidationResult.error.toString()}`);
      }
      // Now, parse the raw (but validated) data through streakSchema to transform dates
      const finalValidationResult = streakSchema.safeParse(rawValidationResult.data);
      if (!finalValidationResult.success) {
        console.error('Streak data transformation/validation failed:', finalValidationResult.error.flatten());
        throw new Error(`Invalid streak data after transformation: ${finalValidationResult.error.toString()}`);
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
