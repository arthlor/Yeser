import { deleteUserAccount, getProfile, updateProfile } from '@/api/profileApi';
import { useEffect } from 'react';
import { queryKeys } from '@/api/queryKeys';
import { QUERY_STALE_TIMES } from '@/api/queryClient';
import { Profile, UpdateProfilePayload } from '@/schemas/profileSchema';
import {
  clearAvatarSignedUrlSizedCacheForPath,
  createAvatarSignedUrl,
  createAvatarSignedUrlSized,
  deleteAvatarAtPath,
  uploadAvatarFromUri,
} from '@/api/avatarApi';
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

  const { mutateAsync: uploadAvatar } = useMutation<{ path: string }, Error, string>({
    mutationFn: uploadAvatarFromUri,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id) });
      // Clear sized URL cache for this user's avatar path to avoid stale images
      if (user?.id) {
        const currentPath = queryClient.getQueryData<Profile | null>(
          queryKeys.profile(user?.id)
        )?.avatar_path;
        clearAvatarSignedUrlSizedCacheForPath(currentPath ?? null);
      }
    },
  });

  const { mutateAsync: deleteAvatar } = useMutation<void, Error, string | null | undefined>({
    mutationFn: deleteAvatarAtPath,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user?.id) });
    },
  });

  const { mutateAsync: getAvatarUrl } = useMutation<
    string | null,
    Error,
    string | null | undefined
  >({
    mutationFn: (path) => createAvatarSignedUrl(path ?? null),
  });

  // Sized avatar URL helper for specific UI slots (e.g., header 44px, settings 48px)
  const { mutateAsync: getSizedAvatarUrl } = useMutation<
    string | null,
    Error,
    { path: string | null | undefined; size: number }
  >({
    mutationFn: ({ path, size }) => createAvatarSignedUrlSized(path ?? null, size),
  });

  // Prefetch a couple of common avatar sizes to reduce perceived latency
  useEffect(() => {
    const run = async (): Promise<void> => {
      const path = profile?.avatar_path ?? null;
      if (!path) {
        return;
      }
      try {
        await Promise.all([
          createAvatarSignedUrlSized(path, 64),
          createAvatarSignedUrlSized(path, 96),
        ]);
      } catch {
        // Best effort prefetch; ignore errors
      }
    };
    void run();
  }, [profile?.avatar_path]);

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
    uploadAvatar,
    deleteAvatar,
    getAvatarUrl,
    getSizedAvatarUrl,
  };
};
