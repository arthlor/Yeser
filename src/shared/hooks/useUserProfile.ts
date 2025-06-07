import { getProfile, updateProfile } from '@/api/profileApi';
import { queryKeys } from '@/api/queryKeys';
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
    staleTime: 1000 * 60 * 10, // Profile data stays fresh for 10 minutes
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

  return {
    profile,
    isLoadingProfile: isLoading,
    profileError: error,
    isProfileError: isError,
    refetchProfile: refetch,
    updateProfile: updateProfileMutation,
    isUpdatingProfile,
    updateProfileError: updateError,
  };
};
