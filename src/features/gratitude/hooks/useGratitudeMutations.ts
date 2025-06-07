import {
  addStatement,
  deleteEntireEntry,
  deleteStatement,
  editStatement,
} from '@/api/gratitudeApi';
import { queryKeys } from '@/api/queryKeys';
import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { cacheService } from '@/services/cacheService';
import useAuthStore from '@/store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGlobalError } from '@/providers/GlobalErrorProvider';

interface AddStatementPayload {
  entryDate: string;
  statement: string;
}

interface EditStatementPayload {
  entryDate: string;
  statementIndex: number;
  updatedStatement: string;
}

interface DeleteStatementPayload {
  entryDate: string;
  statementIndex: number;
}

// Payload for deleting entire entry (atomic operation)
interface DeleteEntireEntryPayload {
  entryDate: string;
}

interface AddStatementContext {
  previousEntry: GratitudeEntry | null | undefined;
}

export const useGratitudeMutations = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { handleMutationError } = useGlobalError();

  const addStatementMutation = useMutation<
    GratitudeEntry | null,
    Error,
    AddStatementPayload,
    AddStatementContext
  >({
    mutationFn: async ({ entryDate, statement }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return addStatement(entryDate, statement);
    },
    onMutate: async ({ entryDate, statement }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.gratitudeEntry(user?.id, entryDate),
      });

      // Snapshot previous value
      const previousEntry = queryClient.getQueryData<GratitudeEntry | null>(
        queryKeys.gratitudeEntry(user?.id, entryDate)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.gratitudeEntry(user?.id, entryDate),
        (old: GratitudeEntry | null) => {
          if (!old) {
            return {
              id: `temp-${Date.now()}`,
              user_id: user?.id || '',
              entry_date: entryDate,
              statements: [statement],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          return {
            ...old,
            statements: [...old.statements, statement],
            updated_at: new Date().toISOString(),
          };
        }
      );

      return { previousEntry };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousEntry) {
        queryClient.setQueryData(
          queryKeys.gratitudeEntry(user?.id, variables.entryDate),
          context.previousEntry
        );
      }
      handleMutationError(err, 'add gratitude statement');
    },
    onSettled: (data, error, variables) => {
      if (user?.id) {
        cacheService.invalidateAfterMutation('add_statement', user.id, {
          entryDate: variables.entryDate,
        });
      }
    },
  });

  const editStatementMutation = useMutation<void, Error, EditStatementPayload>({
    mutationFn: async ({ entryDate, statementIndex, updatedStatement }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return editStatement(entryDate, statementIndex, updatedStatement);
    },
    onError: (err, _variables, _context) => {
      handleMutationError(err, 'edit gratitude statement');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        cacheService.invalidateAfterMutation('edit_statement', user.id, { entryDate });
      }
    },
  });

  const deleteStatementMutation = useMutation<void, Error, DeleteStatementPayload>({
    mutationFn: async ({ entryDate, statementIndex }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return deleteStatement(entryDate, statementIndex);
    },
    onError: (err, _variables, _context) => {
      handleMutationError(err, 'delete gratitude statement');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        cacheService.invalidateAfterMutation('delete_statement', user.id, { entryDate });
      }
    },
  });

  // Atomic mutation for deleting entire entry (much more efficient)
  const deleteEntireEntryMutation = useMutation<
    void, // Returns nothing on success
    Error,
    DeleteEntireEntryPayload
  >({
    mutationFn: async ({ entryDate }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      // Use atomic deletion operation - single API call instead of multiple
      await deleteEntireEntry(entryDate);
    },
    onError: (err, _variables, _context) => {
      handleMutationError(err, 'delete entire gratitude entry');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        cacheService.invalidateAfterMutation('delete_entry', user.id, { entryDate });
      }
    },
    // Optimistic update: immediately remove entry from cache
    onMutate: async ({ entryDate }) => {
      if (!user?.id) {
        return;
      }

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.gratitudeEntry(user.id, entryDate),
      });

      // Optimistically remove entry
      queryClient.setQueryData(queryKeys.gratitudeEntry(user.id, entryDate), null);

      // Also invalidate related queries for immediate UI update
      queryClient.invalidateQueries({
        queryKey: queryKeys.gratitudeEntries(user.id),
      });
    },
  });

  return {
    addStatement: addStatementMutation.mutate,
    isAddingStatement: addStatementMutation.isPending,
    addStatementError: addStatementMutation.error,

    editStatement: editStatementMutation.mutate,
    isEditingStatement: editStatementMutation.isPending,
    editStatementError: editStatementMutation.error,

    deleteStatement: deleteStatementMutation.mutate,
    isDeletingStatement: deleteStatementMutation.isPending,
    deleteStatementError: deleteStatementMutation.error,

    // Export atomic entry deletion mutation
    deleteEntireEntry: deleteEntireEntryMutation.mutate,
    isDeletingEntry: deleteEntireEntryMutation.isPending,
    deleteEntryError: deleteEntireEntryMutation.error,
  };
};
