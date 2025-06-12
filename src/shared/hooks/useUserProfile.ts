import { deleteUserAccount, getProfile, updateProfile } from '@/api/profileApi';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_STALE_TIMES } from '@/api/queryClient';
import { Profile, UpdateProfilePayload } from '@/schemas/profileSchema';
import useAuthStore from '@/store/authStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { logger } from '@/utils/debugConfig';

export const useUserProfile = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { handleMutationError } = useGlobalError();

  const {
    data: profile,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery<Profile | null, Error>({
    queryKey: queryKeys.profile(user?.id),
    queryFn: getProfile,
    enabled: !!user?.id,
    staleTime: QUERY_STALE_TIMES.profile, // 8 minutes - optimized for settings changes
    gcTime: 20 * 60 * 1000, // 20 minutes for better UX
  });

  const {
    mutate: updateProfileMutation,
    isPending: isUpdatingProfile,
    error: updateError,
  } = useMutation<Profile | null, Error, UpdateProfilePayload>({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      // Update cache directly for instant feedback
      queryClient.setQueryData(queryKeys.profile(user?.id), data);

      // Optionally invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.streaks(user?.id),
        exact: false,
      });
    },
    onError: (error) => {
      logger.error('Profile update failed:', error);
      handleMutationError(error, 'update profile');
    },
  });

  const {
    mutate: deleteAccountMutation,
    isPending: isDeletingAccount,
    error: deleteAccountError,
  } = useMutation<{ success: boolean; message: string }, Error, void>({
    mutationFn: deleteUserAccount,
    onSuccess: (data) => {
      // Clear all cache data
      queryClient.clear();

      // Force logout after successful deletion
      useAuthStore.getState().logout();

      logger.debug('Account deletion successful:', data);
    },
    onError: (error) => {
      logger.error('Account deletion failed:', error);
      handleMutationError(error, 'delete account');
    },
  });

  return {
    profile,
    isLoadingProfile: isLoading,
    profileError: error,
    isProfileError: isError,
    refetchProfile: refetch,
    updateProfile: updateProfileMutation,
    isUpdatingProfile,
    updateProfileError: updateError,
    deleteAccount: deleteAccountMutation,
    isDeletingAccount,
    deleteAccountError,
  };
};
