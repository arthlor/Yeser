import { rawStreakSchema, type Streak, streakSchema } from '../schemas/streakSchema';
import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';

import type { Tables } from '../types/supabase.types';

// Legacy function - REMOVED: Use getStreakData() instead
// This function was unused and redundant with our main streak system

// Function to get the user's full streak data object
export const getStreakData = async (): Promise<Streak | null> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session for fetching streak data');
    }
    const { data, error, status } = await supabase
      .from('streaks')
      .select(
        'id, user_id, current_streak, longest_streak, last_entry_date, created_at, updated_at'
      )
      .eq('user_id', user.id)
      .single();

    if (error && status !== 406) {
      throw handleAPIError(new Error(error.message), 'fetch streak data');
    }

    if (data) {
      // Validate raw data from Supabase using rawStreakSchema
      // Cast 'data' to the expected Supabase row type for 'streaks' before validation
      const rawValidationResult = rawStreakSchema.safeParse(data as Tables<'streaks'>);
      if (!rawValidationResult.success) {
        logger.error('Raw streak data validation failed on fetch:', {
          extra: rawValidationResult.error.flatten(),
        });
        throw new Error(`Invalid raw streak data from DB: ${rawValidationResult.error.toString()}`);
      }
      // Now, parse the raw (but validated) data through streakSchema to transform dates
      const finalValidationResult = streakSchema.safeParse(rawValidationResult.data);
      if (!finalValidationResult.success) {
        logger.error('Streak data transformation/validation failed:', {
          extra: finalValidationResult.error.flatten(),
        });
        throw new Error(
          `Invalid streak data after transformation: ${finalValidationResult.error.toString()}`
        );
      }
      return finalValidationResult.data;
    }
    return null; // No streak data found for the user
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch streak data');
  }
};

/**
 * 🔧 FIX: Recalculate user's streak data based on their gratitude entries
 * Calls the `recalculate_user_streak` RPC function to update streak in database
 */
export const recalculateUserStreak = async (): Promise<void> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session for streak recalculation');
    }

    logger.debug('Recalculating streak for user:', { userId: user.id });

    const { error } = await supabase.rpc('recalculate_user_streak', {
      p_user_id: user.id,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'recalculate user streak');
    }

    logger.debug('Streak recalculation completed successfully');
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    // ⚠️ Important: Don't throw here to avoid blocking gratitude operations
    // Log the error but allow gratitude operations to continue
    logger.error('Streak recalculation failed (non-blocking):', error);
    throw handleAPIError(error, 'recalculate user streak');
  }
};

/**
 * 🔧 FIX: Calculate current streak value for a user
 * Calls the `calculate_streak` RPC function to get current streak count
 */
export const calculateStreakValue = async (): Promise<number> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session for streak calculation');
    }

    const { data, error } = await supabase.rpc('calculate_streak', {
      p_user_id: user.id,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'calculate streak value');
    }

    return data || 0;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'calculate streak value');
  }
};
