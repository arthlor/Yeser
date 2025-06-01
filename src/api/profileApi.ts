import type { ProfileState } from '../store/profileStore';
import { supabase } from '../utils/supabaseClient';

export type ProfileResponse = Omit<ProfileState, 'loading' | 'error'>;

// Function to get the user's profile
export const getProfile = async (): Promise<ProfileResponse | null> => {
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
        'id, username, reminder_enabled, reminder_time, onboarded, throwback_reminder_enabled, throwback_reminder_frequency'
      )
      .eq('id', user.id)
      .single();

    if (error && status !== 406) {
      // 406 status means no rows found, which is a valid case for a new user
      console.error('Error fetching profile:', error);
      throw error;
    }

    if (data) {
      return data as ProfileResponse;
    }
    return null; // No profile found, could be a new user
  } catch (error) {
    console.error('Catch block error fetching profile:', error);
    throw error;
  }
};

// Function to update the user's profile
export const updateProfile = async (
  profileUpdates: Partial<ProfileResponse>
): Promise<ProfileResponse | null> => {
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
      .from('profiles')
      .update({
        ...(({ id: _unusedId, ...rest }) => rest)(profileUpdates), // Exclude 'id' from the update payload
        updated_at: new Date().toISOString(), // Ensure updated_at is set
      })
      .eq('id', user.id)
      .select(
        'id, username, reminder_enabled, reminder_time, onboarded, throwback_reminder_enabled, throwback_reminder_frequency'
      )
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }

    if (data) {
      return data as ProfileResponse;
    }
    return null;
  } catch (error) {
    console.error('Catch block error updating profile:', error);
    throw error;
  }
};
