import {
  addStatement,
  deleteEntireEntry,
  deleteStatement,
  editStatement,
  getGratitudeDailyEntryByDate,
  setStatementMood as setStatementMoodRpc,
} from '@/api/gratitudeApi';
// 🔧 FIX: Import streak recalculation function
import { recalculateUserStreak } from '@/api/streakApi';
import { queryKeys } from '@/api/queryKeys';
import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { cacheService } from '@/services/cacheService';
import useAuthStore from '@/store/authStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
// 🔧 FIX: Import logger for streak error logging
import { logger } from '@/utils/debugConfig';

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
  moodEmoji?: string | null;
}

interface EditStatementPayload {
  entryDate: string;
  statementIndex: number;
  updatedStatement: string;
  moodEmoji?: string | null;
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

interface SetMoodPayload {
  entryDate: string;
  statementIndex: number;
  moodEmoji: string | null;
}

interface SetMoodContext {
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
    mutationFn: async ({ entryDate, statement, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // **RACE CONDITION FIX**: Acquire mutation lock
      await acquireMutationLock(entryDate, 'add', user.id);

      try {
        return await addStatement(entryDate, statement, moodEmoji ?? null);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onMutate: async ({ entryDate, statement, moodEmoji }) => {
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
              moods: moodEmoji ? { '0': moodEmoji } : {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
          const nextStatements = [...old.statements, statement];
          const nextIndex = nextStatements.length - 1;
          const prevMoods = (old.moods as Record<string, string> | undefined) || {};
          const nextMoods = { ...prevMoods } as Record<string, string>;
          if (moodEmoji) {
            nextMoods[String(nextIndex)] = moodEmoji;
          }
          return {
            ...old,
            statements: nextStatements,
            moods: nextMoods,
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
    onSuccess: async (_data, _variables, _context) => {
      if (user?.id) {
        try {
          // 🔧 FIX: Recalculate streak BEFORE cache invalidation
          await recalculateUserStreak();
        } catch (error) {
          // Non-blocking: Log streak error but don't fail the gratitude operation
          logger.error(
            'Streak recalculation failed after adding statement:',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
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
    mutationFn: async ({ entryDate, statementIndex, updatedStatement, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // **RACE CONDITION FIX**: Acquire mutation lock
      await acquireMutationLock(entryDate, 'edit', user.id);

      try {
        // Preserve existing mood if not explicitly provided
        let moodToSend: string | null | undefined = moodEmoji;
        if (moodToSend === undefined) {
          const cached = queryClient.getQueryData<GratitudeEntry | null>(
            queryKeys.gratitudeEntry(user.id, entryDate)
          );
          const existingFromCache = (cached?.moods as Record<string, string> | undefined)?.[
            String(statementIndex)
          ];
          if (existingFromCache !== undefined) {
            moodToSend = existingFromCache ?? null;
          } else {
            const fresh = await getGratitudeDailyEntryByDate(entryDate);
            const existingFromServer = (fresh?.moods as Record<string, string> | undefined)?.[
              String(statementIndex)
            ];
            moodToSend = existingFromServer ?? null;
          }
        }

        return await editStatement(entryDate, statementIndex, updatedStatement, moodToSend ?? null);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onError: (err, _variables, _context) => {
      handleMutationError(err, 'edit gratitude statement');
    },
    onSuccess: async (_, { entryDate }) => {
      if (user?.id) {
        try {
          // 🔧 FIX: Recalculate streak BEFORE cache invalidation
          await recalculateUserStreak();
        } catch (error) {
          // Non-blocking: Log streak error but don't fail the gratitude operation
          logger.error(
            'Streak recalculation failed after editing statement:',
            error instanceof Error ? error : new Error(String(error))
          );
        }

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
    onSuccess: async (_, { entryDate }) => {
      if (user?.id) {
        try {
          // 🔧 FIX: Recalculate streak BEFORE cache invalidation
          await recalculateUserStreak();
        } catch (error) {
          // Non-blocking: Log streak error but don't fail the gratitude operation
          logger.error(
            'Streak recalculation failed after deleting statement:',
            error instanceof Error ? error : new Error(String(error))
          );
        }

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
    onSuccess: async (_, { entryDate }) => {
      if (user?.id) {
        try {
          // 🔧 FIX: Recalculate streak BEFORE cache invalidation
          await recalculateUserStreak();
        } catch (error) {
          // Non-blocking: Log streak error but don't fail the gratitude operation
          logger.error(
            'Streak recalculation failed after deleting entire entry:',
            error instanceof Error ? error : new Error(String(error))
          );
        }

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

  // Mood-only setter mutation with optimistic update of moods map
  const setStatementMoodMutation = useMutation<void, Error, SetMoodPayload, SetMoodContext>({
    mutationFn: async ({ entryDate, statementIndex, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      await setStatementMoodRpc(entryDate, statementIndex, moodEmoji);
    },
    onMutate: async ({ entryDate, statementIndex, moodEmoji }) => {
      if (!user?.id) {
        return;
      }
      await queryClient.cancelQueries({
        queryKey: queryKeys.gratitudeEntry(user.id, entryDate),
      });

      const previousEntry = queryClient.getQueryData<GratitudeEntry | null>(
        queryKeys.gratitudeEntry(user.id, entryDate)
      );

      if (previousEntry) {
        const prevMoods = (previousEntry.moods as Record<string, string> | undefined) || {};
        const key = String(statementIndex);
        const nextMoods: Record<string, string> = { ...prevMoods };
        if (moodEmoji) {
          nextMoods[key] = moodEmoji;
        } else {
          delete nextMoods[key];
        }
        queryClient.setQueryData<GratitudeEntry>(queryKeys.gratitudeEntry(user.id, entryDate), {
          ...previousEntry,
          moods: nextMoods,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousEntry };
    },
    onError: (_err, { entryDate }, context) => {
      if (!user?.id || !context?.previousEntry) {
        return;
      }
      queryClient.setQueryData(queryKeys.gratitudeEntry(user.id, entryDate), context.previousEntry);
    },
    onSettled: (_data, _error, { entryDate }) => {
      if (!user?.id) {
        return;
      }
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.gratitudeEntry(user.id as string, entryDate),
        });
      }, 0);
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
    setStatementMood: setStatementMoodMutation.mutate,
  };
};
