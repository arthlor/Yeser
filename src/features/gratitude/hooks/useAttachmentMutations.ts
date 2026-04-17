import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type AttachmentKind,
  deleteAttachment as deleteAttachmentApi,
  uploadAudioAttachment,
  uploadImageAttachment,
} from '@/features/gratitude/mediaApi';
import { queryKeys } from '@/shared/query/queryKeys';
import { useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import type { Attachment, GratitudeEntry } from '@/schemas/gratitudeEntrySchema';

interface UploadImageVars {
  entryDate: string;
  statementIndex: number;
  uri: string;
  mimeType?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

interface UploadAudioVars {
  entryDate: string;
  statementIndex: number;
  uri: string;
  mimeType?: string;
  bytes?: number;
  durationMs?: number;
}

interface DeleteAttachmentVars {
  entryDate: string;
  attachmentId: string;
}

export interface AttachmentUploadResult {
  attachmentId: string;
  storagePath: string;
  kind: AttachmentKind;
}

const buildOptimisticAttachment = (
  overrides: Partial<Attachment> & { kind: AttachmentKind; statement_index: number }
): Attachment => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  storage_path: overrides.storage_path ?? '',
  mime_type: overrides.mime_type ?? (overrides.kind === 'image' ? 'image/jpeg' : 'audio/m4a'),
  bytes: overrides.bytes ?? 0,
  duration_ms: overrides.duration_ms ?? null,
  width: overrides.width ?? null,
  height: overrides.height ?? null,
  transcript: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const useAttachmentMutations = () => {
  const user = useCoreAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { handleMutationError } = useGlobalError();

  const patchEntryCache = (
    entryDate: string,
    updater: (attachments: Attachment[]) => Attachment[]
  ) => {
    if (!user?.id) {
      return;
    }
    queryClient.setQueryData<GratitudeEntry | null>(
      queryKeys.gratitudeEntry(user.id, entryDate),
      (old) => {
        if (!old) {
          return old;
        }
        return {
          ...old,
          attachments: updater((old.attachments as Attachment[] | undefined) ?? []),
          updated_at: new Date().toISOString(),
        };
      }
    );
  };

  const uploadImageMutation = useMutation<AttachmentUploadResult, Error, UploadImageVars>({
    mutationFn: async (vars) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      const { attachmentId, storagePath } = await uploadImageAttachment(vars);
      return { attachmentId, storagePath, kind: 'image' };
    },
    onSuccess: (result, vars) => {
      patchEntryCache(vars.entryDate, (current) => [
        ...current,
        buildOptimisticAttachment({
          id: result.attachmentId,
          statement_index: vars.statementIndex,
          kind: 'image',
          storage_path: result.storagePath,
          mime_type: vars.mimeType ?? 'image/jpeg',
          bytes: vars.bytes ?? 0,
          width: vars.width ?? null,
          height: vars.height ?? null,
        }),
      ]);
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.gratitudeEntriesPaginated(user.id),
        });
      }
    },
    onError: (err) => handleMutationError(err, 'upload image attachment'),
  });

  const uploadAudioMutation = useMutation<AttachmentUploadResult, Error, UploadAudioVars>({
    mutationFn: async (vars) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      const { attachmentId, storagePath } = await uploadAudioAttachment(vars);
      return { attachmentId, storagePath, kind: 'audio' };
    },
    onSuccess: (result, vars) => {
      patchEntryCache(vars.entryDate, (current) => [
        ...current,
        buildOptimisticAttachment({
          id: result.attachmentId,
          statement_index: vars.statementIndex,
          kind: 'audio',
          storage_path: result.storagePath,
          mime_type: vars.mimeType ?? 'audio/m4a',
          bytes: vars.bytes ?? 0,
          duration_ms: vars.durationMs ?? null,
        }),
      ]);
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.gratitudeEntriesPaginated(user.id),
        });
      }
    },
    onError: (err) => handleMutationError(err, 'upload audio attachment'),
  });

  const deleteAttachmentMutation = useMutation<
    void,
    Error,
    DeleteAttachmentVars,
    { previous?: Attachment[] }
  >({
    mutationFn: async ({ attachmentId }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      await deleteAttachmentApi(attachmentId);
    },
    onMutate: async ({ entryDate, attachmentId }) => {
      if (!user?.id) {
        return {};
      }
      await queryClient.cancelQueries({
        queryKey: queryKeys.gratitudeEntry(user.id, entryDate),
      });
      const snapshot =
        queryClient.getQueryData<GratitudeEntry | null>(
          queryKeys.gratitudeEntry(user.id, entryDate)
        )?.attachments ?? [];
      patchEntryCache(entryDate, (current) => current.filter((a) => a.id !== attachmentId));
      return { previous: snapshot as Attachment[] };
    },
    onError: (err, vars, context) => {
      if (context?.previous) {
        patchEntryCache(vars.entryDate, () => context.previous ?? []);
      }
      handleMutationError(err, 'delete attachment');
    },
    onSettled: (_data, _err, vars) => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.gratitudeEntry(user.id, vars.entryDate),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.gratitudeEntriesPaginated(user.id),
        });
      }
    },
  });

  return {
    uploadImage: uploadImageMutation.mutateAsync,
    isUploadingImage: uploadImageMutation.isPending,
    uploadImageError: uploadImageMutation.error,

    uploadAudio: uploadAudioMutation.mutateAsync,
    isUploadingAudio: uploadAudioMutation.isPending,
    uploadAudioError: uploadAudioMutation.error,

    deleteAttachment: deleteAttachmentMutation.mutateAsync,
    isDeletingAttachment: deleteAttachmentMutation.isPending,
    deleteAttachmentError: deleteAttachmentMutation.error,
  };
};
