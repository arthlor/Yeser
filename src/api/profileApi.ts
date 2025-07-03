import {
  Profile,
  profileSchema,
  RawProfileData, // Added import
  rawProfileDataSchema, // Added import
  UpdateProfilePayload,
  updateProfileSchema,
} from '../schemas/profileSchema';
import { TablesUpdate } from '../types/supabase.types';
import { supabase } from '../utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';

// Removed local RawProfileData interface, will use inferred type from Zod schema

const mapAndValidateRawProfile = (validatedRawData: RawProfileData): Profile => {
  // Map DB's updated_at to created_at for Zod schema compatibility, as 'profiles' table lacks a dedicated created_at.
  // updated_at itself will also be from validatedRawData.updated_at.
  const dataForZod = {
    ...validatedRawData, // validatedRawData now only has updated_at from the DB for timestamps
    // Map snake_case database field to camelCase app field
    useVariedPrompts: validatedRawData.use_varied_prompts,
    // updated_at is already present in validatedRawData and will be passed through
  };

  const validationResult = profileSchema.safeParse(dataForZod);
  if (!validationResult.success) {
    logger.error('Profile data validation failed:', {
      extra: validationResult.error.flatten(),
    });
    // It's often better to throw the specific ZodError for more detailed context upstream
    throw new Error(`Invalid profile data: ${validationResult.error.toString()}`);
  }
  return validationResult.data;
};

// Function to check if a username is available
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    logger.debug(`Checking username availability for: "${username}"`);

    // Use the database function that bypasses RLS
    const { data, error } = await supabase.rpc('check_username_availability', {
      p_username: username,
    });

    if (error) {
      throw handleAPIError(new Error(error.message), 'check username availability');
    }

    // The function returns true if available, false if taken
    return Boolean(data);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'check username availability');
  }
};

// Function to get the user's profile
export const getProfile = async (): Promise<Profile | null> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }
    const { data, error, status } = await supabase
      .from('profiles')
      .select(
        'id, username, onboarded, notifications_enabled, created_at, updated_at, daily_gratitude_goal, use_varied_prompts'
      )
      .eq('id', user.id)
      .single();

    if (error && status !== 406) {
      throw handleAPIError(new Error(error.message), 'fetch profile');
    }

    if (data) {
      const rawValidationResult = rawProfileDataSchema.safeParse(data);
      if (!rawValidationResult.success) {
        logger.error('Raw profile data validation failed on fetch:', {
          extra: rawValidationResult.error.flatten(),
        });
        throw new Error(
          `Invalid raw profile data from DB: ${rawValidationResult.error.toString()}`
        );
      }
      return mapAndValidateRawProfile(rawValidationResult.data);
    }
    return null;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'fetch profile');
  }
};

// Function to update the user's profile
export const updateProfile = async (
  profileUpdates: UpdateProfilePayload
): Promise<Profile | null> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }

    // Validate the input payload first
    const validationResult = updateProfileSchema.safeParse(profileUpdates);
    if (!validationResult.success) {
      logger.error('Update profile payload validation failed:', {
        extra: validationResult.error.flatten(),
      });
      throw new Error(`Invalid update profile payload: ${validationResult.error.toString()}`);
    }
    const { useVariedPrompts, ...otherValidatedUpdates } = validationResult.data;

    const payloadForSupabase: TablesUpdate<'profiles'> = {
      ...otherValidatedUpdates,
    };

    if (useVariedPrompts !== undefined) {
      payloadForSupabase.use_varied_prompts = useVariedPrompts;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(payloadForSupabase)
      .eq('id', user.id)
      .select(
        'id, username, onboarded, notifications_enabled, created_at, updated_at, daily_gratitude_goal, use_varied_prompts'
      )
      .single();

    if (error) {
      if (error.code === '23505' && error.message.includes('profiles_username_key')) {
        throw new Error(
          'Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı seçin.'
        );
      }
      throw handleAPIError(new Error(error.message), 'update profile');
    }

    if (data) {
      // Validate raw data from Supabase first
      const rawValidationResult = rawProfileDataSchema.safeParse(data);
      if (!rawValidationResult.success) {
        logger.error('Raw profile data validation failed on update:', {
          extra: rawValidationResult.error.flatten(),
        });
        throw new Error(
          `Invalid raw profile data from DB after update: ${rawValidationResult.error.toString()}`
        );
      }
      return mapAndValidateRawProfile(rawValidationResult.data);
    }
    return null;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'update profile');
  }
};

// Function name constant for the delete user account edge function
const DELETE_USER_ACCOUNT_FUNCTION_NAME = 'delete-user';

/**
 * Deletes user account and all associated data (KVKV compliance)
 * This function permanently removes all user data from the system AND the authentication user
 *
 * 🚨 FIXED: Now properly deletes both database data AND authentication user
 * Previous bug: Users could log back in after "deletion" because auth user wasn't deleted
 */
export const deleteUserAccount = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      throw new Error('No active session');
    }

    const { user } = sessionData.session;
    if (!user) {
      throw new Error('No user found in session');
    }

    logger.debug('Starting account deletion process', { extra: { userId: user.id } });

    // Call the Supabase Edge Function that handles both database and auth user deletion
    // This requires service_role permissions which can only be used server-side
    const { data, error: invokeError } = await supabase.functions.invoke(
      DELETE_USER_ACCOUNT_FUNCTION_NAME,
      {
        method: 'POST',
      }
    );

    if (invokeError) {
      logger.error('Edge function invocation error:', { error: invokeError });
      throw handleAPIError(
        new Error(invokeError.message || 'Failed to invoke delete user account function'),
        'invoke delete user account function'
      );
    }

    // Check if the edge function returned an error in the response
    if (data && !data.success) {
      logger.error('Edge function returned error:', { error: data.error, message: data.message });
      throw new Error(data.message || data.error || 'Account deletion failed');
    }

    logger.debug('Account deletion completed successfully', {
      extra: { userId: user.id, response: data },
    });

    return {
      success: true,
      message: data?.message || 'Hesabınız ve tüm verileriniz kalıcı olarak silindi.',
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Unexpected error in deleteUserAccount:', { extra: { error: error.message } });
    throw handleAPIError(error, 'delete user account');
  }
};
