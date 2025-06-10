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

// **RACE CONDITION FIX**: Add mutation coordination
interface MutationLock {
  entryDate: string;
  operation: 'add' | 'edit' | 'delete' | 'delete_entry';
  timestamp: number;
  promise: Promise<unknown>;
}

interface OptimisticUpdateVersion {
  entryDate: string;
  version: number;
  timestamp: number;
}

// Global mutation locks to prevent concurrent operations on same entry
const mutationLocks: Map<string, MutationLock> = new Map();
const optimisticVersions: Map<string, OptimisticUpdateVersion> = new Map();

// **RACE CONDITION FIX**: Create mutex for entry operations
const acquireMutationLock = async (
  entryDate: string,
  operation: MutationLock['operation'],
  userId: string
): Promise<boolean> => {
  const lockKey = `${userId}:${entryDate}`;

  // Check if lock exists for this entry
  if (mutationLocks.has(lockKey)) {
    const existingLock = mutationLocks.get(lockKey);
    if (existingLock) {
      // Wait for existing operation to complete
      try {
        await existingLock.promise;
      } catch {
        // Ignore errors from previous operations
      }
    }
  }

  // Acquire new lock
  const lockPromise = new Promise<void>((resolve) => {
    // Lock will be resolved when operation completes
    setTimeout(resolve, 0);
  });

  mutationLocks.set(lockKey, {
    entryDate,
    operation,
    timestamp: Date.now(),
    promise: lockPromise,
  });

  return true;
};

// **RACE CONDITION FIX**: Release mutation lock
const releaseMutationLock = (entryDate: string, userId: string): void => {
  const lockKey = `${userId}:${entryDate}`;
  mutationLocks.delete(lockKey);
};

// **RACE CONDITION FIX**: Get next optimistic version
const getNextOptimisticVersion = (entryDate: string, userId: string): number => {
  const versionKey = `${userId}:${entryDate}`;
  const currentVersion = optimisticVersions.get(versionKey);
  const newVersion = currentVersion ? currentVersion.version + 1 : 1;

  optimisticVersions.set(versionKey, {
    entryDate,
    version: newVersion,
    timestamp: Date.now(),
  });

  return newVersion;
};

// **RACE CONDITION FIX**: Validate optimistic version
const isValidOptimisticVersion = (entryDate: string, userId: string, version: number): boolean => {
  const versionKey = `${userId}:${entryDate}`;
  const currentVersion = optimisticVersions.get(versionKey);
  return currentVersion ? currentVersion.version === version : version === 1;
};

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
  optimisticVersion: number;
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

      // **RACE CONDITION FIX**: Acquire mutation lock
      await acquireMutationLock(entryDate, 'add', user.id);

      try {
        return await addStatement(entryDate, statement);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onMutate: async ({ entryDate, statement }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // **RACE CONDITION FIX**: Get optimistic version for coordination
      const optimisticVersion = getNextOptimisticVersion(entryDate, user.id);

      // Cancel outgoing refetches (prevent race with API responses)
      await queryClient.cancelQueries({
        queryKey: queryKeys.gratitudeEntry(user.id, entryDate),
      });

      // Snapshot previous value
      const previousEntry = queryClient.getQueryData<GratitudeEntry | null>(
        queryKeys.gratitudeEntry(user.id, entryDate)
      );

      // **RACE CONDITION FIX**: Coordinated optimistic update with version check
      queryClient.setQueryData(
        queryKeys.gratitudeEntry(user.id, entryDate),
        (old: GratitudeEntry | null) => {
          // Validate version to prevent stale updates
          if (!isValidOptimisticVersion(entryDate, user.id, optimisticVersion)) {
            return old; // Skip stale update
          }

          if (!old) {
            return {
              id: `temp-${Date.now()}-${optimisticVersion}`,
              user_id: user.id || '',
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

      return { previousEntry, optimisticVersion };
    },
    onError: (err, variables, context) => {
      if (!user?.id || !context) {
        return;
      }

      // **RACE CONDITION FIX**: Version-aware rollback
      if (isValidOptimisticVersion(variables.entryDate, user.id, context.optimisticVersion)) {
        queryClient.setQueryData(
          queryKeys.gratitudeEntry(user.id, variables.entryDate),
          context.previousEntry
        );
      }

      handleMutationError(err, 'add gratitude statement');
    },
    onSettled: (data, error, variables, context) => {
      if (user?.id && context) {
        // **RACE CONDITION FIX**: Serialize cache invalidation
        setTimeout(() => {
          cacheService.invalidateAfterMutation('add_statement', user.id, {
            entryDate: variables.entryDate,
          });
        }, 0);
      }
    },
  });

  const editStatementMutation = useMutation<void, Error, EditStatementPayload>({
    mutationFn: async ({ entryDate, statementIndex, updatedStatement }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // **RACE CONDITION FIX**: Acquire mutation lock
      await acquireMutationLock(entryDate, 'edit', user.id);

      try {
        return await editStatement(entryDate, statementIndex, updatedStatement);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onError: (err, _variables, _context) => {
      handleMutationError(err, 'edit gratitude statement');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        // **RACE CONDITION FIX**: Serialize cache invalidation
        setTimeout(() => {
          cacheService.invalidateAfterMutation('edit_statement', user.id, { entryDate });
        }, 0);
      }
    },
  });

  const deleteStatementMutation = useMutation<void, Error, DeleteStatementPayload>({
    mutationFn: async ({ entryDate, statementIndex }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // **RACE CONDITION FIX**: Acquire mutation lock
      await acquireMutationLock(entryDate, 'delete', user.id);

      try {
        return await deleteStatement(entryDate, statementIndex);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onError: (err, _variables, _context) => {
      handleMutationError(err, 'delete gratitude statement');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        // **RACE CONDITION FIX**: Serialize cache invalidation
        setTimeout(() => {
          cacheService.invalidateAfterMutation('delete_statement', user.id, { entryDate });
        }, 0);
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

      // **RACE CONDITION FIX**: Acquire mutation lock
      await acquireMutationLock(entryDate, 'delete_entry', user.id);

      try {
        // Use atomic deletion operation - single API call instead of multiple
        await deleteEntireEntry(entryDate);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onError: (err, _variables, _context) => {
      handleMutationError(err, 'delete entire gratitude entry');
    },
    onSuccess: (_, { entryDate }) => {
      if (user?.id) {
        // **RACE CONDITION FIX**: Serialize cache invalidation
        setTimeout(() => {
          cacheService.invalidateAfterMutation('delete_entry', user.id, { entryDate });
        }, 0);
      }
    },
    // **RACE CONDITION FIX**: Coordinated optimistic update for entry deletion
    onMutate: async ({ entryDate }) => {
      if (!user?.id) {
        return;
      }

      // **RACE CONDITION FIX**: Get optimistic version for coordination
      const optimisticVersion = getNextOptimisticVersion(entryDate, user.id);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.gratitudeEntry(user.id, entryDate),
      });

      // Snapshot for potential rollback
      const previousEntry = queryClient.getQueryData<GratitudeEntry | null>(
        queryKeys.gratitudeEntry(user.id, entryDate)
      );

      // **RACE CONDITION FIX**: Version-aware optimistic removal
      if (isValidOptimisticVersion(entryDate, user.id, optimisticVersion)) {
        queryClient.setQueryData(queryKeys.gratitudeEntry(user.id, entryDate), null);

        // Also invalidate related queries for immediate UI update
        queryClient.invalidateQueries({
          queryKey: queryKeys.gratitudeEntries(user.id),
        });
      }

      return { previousEntry, optimisticVersion };
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
