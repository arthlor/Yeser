import { addStatement, deleteStatement, editStatement } from '@/api/gratitudeApi';
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

// Payload for deleting all statements of an entry
interface DeleteAllStatementsPayload {
  entryDate: string;
  numStatements: number; // Number of statements to delete
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
      if (!user?.id) {throw new Error('User not authenticated');}
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
      if (!user?.id) {throw new Error('User not authenticated');}
      return editStatement(entryDate, statementIndex, updatedStatement);
    },
    onError: (err, variables, context) => {
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
      if (!user?.id) {throw new Error('User not authenticated');}
      return deleteStatement(entryDate, statementIndex);
    },
    onError: (err, variables, context) => {
      handleMutationError(err, 'delete gratitude statement');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        cacheService.invalidateAfterMutation('delete_statement', user.id, { entryDate });
      }
    },
  });

  // New mutation for deleting all statements of an entry
  const deleteAllStatementsForEntryMutation = useMutation<
    void, // Returns nothing on success
    Error,
    DeleteAllStatementsPayload
  >({
    mutationFn: async ({ entryDate, numStatements }) => {
      if (!user?.id) {throw new Error('User not authenticated');}
      // Loop to delete all statements. This assumes the API deletes at index 0 and shifts others.
      // A dedicated backend API to delete an entire entry by date/ID would be more efficient.
      for (let i = 0; i < numStatements; i++) {
        await deleteStatement(entryDate, 0); // Always delete the statement at index 0
      }
    },
    onError: (err, variables, context) => {
      handleMutationError(err, 'delete all statements for entry');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        cacheService.invalidateAfterMutation('delete_statement', user.id, { entryDate });
      }
    },
    // Consider adding onMutate for optimistic updates if UX requires immediate feedback
    // Consider onError for more specific error handling/rollback if needed
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

    // Export new mutation
    deleteAllStatementsForEntry: deleteAllStatementsForEntryMutation.mutate,
    isDeletingEntry: deleteAllStatementsForEntryMutation.isPending,
    deleteEntryError: deleteAllStatementsForEntryMutation.error,
  };
};
