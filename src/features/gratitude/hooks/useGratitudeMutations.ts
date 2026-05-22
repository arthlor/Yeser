import {
  addStatement,
  deleteEntireEntry,
  deleteStatement,
  editStatement,
  setStatementMood as setStatementMoodRpc,
} from '@/features/gratitude/api';
import {
  appendStatementToEntry,
  createOptimisticEntry,
  deleteStatementFromEntry,
  editStatementInEntry,
  findCachedGratitudeEntry,
  type GratitudeCacheSnapshot,
  incrementGratitudeEntryCount,
  removeGratitudeEntryCaches,
  restoreGratitudeCaches,
  setStatementMoodInEntry,
  snapshotGratitudeCaches,
  updateGratitudeEntryCaches,
  upsertGratitudeEntryCaches,
} from '@/features/gratitude/utils/gratitudeCache';
import { recalculateUserStreak } from '@/features/streak/api';
import { useCoreAuthStore } from '@/features/auth/store/coreAuthStore';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { queryKeys } from '@/shared/query/queryKeys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';
import type { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';

interface MutationLock {
  entryDate: string;
  operation: 'add' | 'edit' | 'delete' | 'delete_entry';
  timestamp: number;
  promise: Promise<unknown>;
  resolve: () => void;
}

interface OptimisticUpdateVersion {
  entryDate: string;
  version: number;
  timestamp: number;
}

const mutationLocks: Map<string, MutationLock> = new Map();
const optimisticVersions: Map<string, OptimisticUpdateVersion> = new Map();

const acquireMutationLock = async (
  entryDate: string,
  operation: MutationLock['operation'],
  userId: string
): Promise<boolean> => {
  const lockKey = `${userId}:${entryDate}`;

  while (mutationLocks.has(lockKey)) {
    const existingLock = mutationLocks.get(lockKey);
    if (existingLock) {
      try {
        await existingLock.promise;
      } catch {
        // Ignore failures from the previous serialized operation.
      }
    }
  }

  let resolveLock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });

  mutationLocks.set(lockKey, {
    entryDate,
    operation,
    timestamp: Date.now(),
    promise: lockPromise,
    resolve: resolveLock,
  });

  return true;
};

const releaseMutationLock = (entryDate: string, userId: string): void => {
  const lockKey = `${userId}:${entryDate}`;
  const lock = mutationLocks.get(lockKey);

  if (lock) {
    lock.resolve();
    mutationLocks.delete(lockKey);
  }
};

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

const isValidOptimisticVersion = (entryDate: string, userId: string, version: number): boolean => {
  const versionKey = `${userId}:${entryDate}`;
  const currentVersion = optimisticVersions.get(versionKey);
  return currentVersion ? currentVersion.version === version : version === 1;
};

interface AddStatementPayload {
  entryDate: string;
  statement: string;
  moodEmoji?: string | null;
  isDemo?: boolean;
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

interface DeleteEntireEntryPayload {
  entryDate: string;
  entryId?: string;
}

interface SetMoodPayload {
  entryDate: string;
  statementIndex: number;
  moodEmoji: string | null;
}

interface GratitudeMutationContext {
  snapshot?: GratitudeCacheSnapshot;
  optimisticVersion?: number;
  createdEntry?: boolean;
}

export const useGratitudeMutations = () => {
  const user = useCoreAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { handleMutationError } = useGlobalError();

  const cancelGratitudeQueries = async (userId: string) => {
    await Promise.all([
      queryClient.cancelQueries({
        queryKey: queryKeys.gratitudeEntries(userId),
        exact: false,
      }),
      queryClient.cancelQueries({
        queryKey: queryKeys.randomGratitudeEntry(userId),
        exact: false,
      }),
    ]);
  };

  const invalidateGratitudeBackgroundData = (userId: string) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.gratitudeEntries(userId),
      exact: false,
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.randomGratitudeEntry(userId),
      exact: false,
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.latestMoodInsights(userId),
      exact: false,
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.moodInsightEntryCounts(userId),
      exact: false,
    });
  };

  const runStreakRefreshInBackground = (operation: string, userId: string) => {
    void recalculateUserStreak()
      .catch((error) => {
        logger.error(
          `Streak recalculation failed after ${operation}:`,
          error instanceof Error ? error : new Error(String(error))
        );
      })
      .finally(() => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.streaks(userId),
          exact: false,
        });
      });
  };

  const finishEntryMutation = (operation: string, userId: string) => {
    invalidateGratitudeBackgroundData(userId);
    runStreakRefreshInBackground(operation, userId);
  };

  const addStatementMutation = useMutation<
    GratitudeEntry | null,
    Error,
    AddStatementPayload,
    GratitudeMutationContext
  >({
    mutationFn: async ({ entryDate, statement, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

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

      await cancelGratitudeQueries(user.id);
      const snapshot = snapshotGratitudeCaches(queryClient, user.id);
      const optimisticVersion = getNextOptimisticVersion(entryDate, user.id);

      const previousEntry = findCachedGratitudeEntry(queryClient, user.id, entryDate);
      const createdEntry = !previousEntry;
      const optimisticEntry = previousEntry
        ? appendStatementToEntry(previousEntry, statement, moodEmoji)
        : createOptimisticEntry(user.id, entryDate, statement, moodEmoji);

      if (isValidOptimisticVersion(entryDate, user.id, optimisticVersion)) {
        upsertGratitudeEntryCaches(queryClient, user.id, optimisticEntry, {
          insertIntoLists: createdEntry,
        });
        if (createdEntry) {
          incrementGratitudeEntryCount(queryClient, user.id, 1);
        }
      }

      return { snapshot, optimisticVersion, createdEntry };
    },
    onError: (err, variables, context) => {
      if (user?.id) {
        restoreGratitudeCaches(queryClient, user.id, context?.snapshot);
      }

      if (variables.isDemo) {
        logger.debug('Suppressing global mutation error for onboarding demo statement:', {
          extra: { error: err.message },
        });
        return;
      }

      handleMutationError(err, 'add gratitude statement');
    },
    onSuccess: (data, variables, context) => {
      if (!user?.id) {
        return;
      }

      if (
        data &&
        (!context?.optimisticVersion ||
          isValidOptimisticVersion(variables.entryDate, user.id, context.optimisticVersion))
      ) {
        upsertGratitudeEntryCaches(queryClient, user.id, data, {
          insertIntoLists: context?.createdEntry ?? false,
        });
      }

      finishEntryMutation('adding statement', user.id);
    },
  });

  const editStatementMutation = useMutation<
    void,
    Error,
    EditStatementPayload,
    GratitudeMutationContext
  >({
    mutationFn: async ({ entryDate, statementIndex, updatedStatement, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await acquireMutationLock(entryDate, 'edit', user.id);

      try {
        return await editStatement(entryDate, statementIndex, updatedStatement, moodEmoji);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onMutate: async ({ entryDate, statementIndex, updatedStatement, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await cancelGratitudeQueries(user.id);
      const snapshot = snapshotGratitudeCaches(queryClient, user.id);
      updateGratitudeEntryCaches(queryClient, user.id, entryDate, (entry) =>
        editStatementInEntry(entry, statementIndex, updatedStatement, moodEmoji)
      );

      return { snapshot };
    },
    onError: (err, _variables, context) => {
      if (user?.id) {
        restoreGratitudeCaches(queryClient, user.id, context?.snapshot);
      }
      handleMutationError(err, 'edit gratitude statement');
    },
    onSuccess: (_data, _variables) => {
      if (user?.id) {
        finishEntryMutation('editing statement', user.id);
      }
    },
  });

  const deleteStatementMutation = useMutation<
    void,
    Error,
    DeleteStatementPayload,
    GratitudeMutationContext
  >({
    mutationFn: async ({ entryDate, statementIndex }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await acquireMutationLock(entryDate, 'delete', user.id);

      try {
        return await deleteStatement(entryDate, statementIndex);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onMutate: async ({ entryDate, statementIndex }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await cancelGratitudeQueries(user.id);
      const snapshot = snapshotGratitudeCaches(queryClient, user.id);
      updateGratitudeEntryCaches(queryClient, user.id, entryDate, (entry) =>
        deleteStatementFromEntry(entry, statementIndex)
      );

      return { snapshot };
    },
    onError: (err, _variables, context) => {
      if (user?.id) {
        restoreGratitudeCaches(queryClient, user.id, context?.snapshot);
      }
      handleMutationError(err, 'delete gratitude statement');
    },
    onSuccess: () => {
      if (user?.id) {
        finishEntryMutation('deleting statement', user.id);
      }
    },
  });

  const deleteEntireEntryMutation = useMutation<
    void,
    Error,
    DeleteEntireEntryPayload,
    GratitudeMutationContext
  >({
    mutationFn: async ({ entryDate }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await acquireMutationLock(entryDate, 'delete_entry', user.id);

      try {
        await deleteEntireEntry(entryDate);
      } finally {
        releaseMutationLock(entryDate, user.id);
      }
    },
    onMutate: async ({ entryDate, entryId }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await cancelGratitudeQueries(user.id);
      const snapshot = snapshotGratitudeCaches(queryClient, user.id);
      const deletedEntry = findCachedGratitudeEntry(queryClient, user.id, entryDate, entryId);

      removeGratitudeEntryCaches(
        queryClient,
        user.id,
        entryDate,
        entryId ?? deletedEntry?.id,
        deletedEntry
      );

      return { snapshot };
    },
    onError: (err, _variables, context) => {
      if (user?.id) {
        restoreGratitudeCaches(queryClient, user.id, context?.snapshot);
      }
      handleMutationError(err, 'delete entire gratitude entry');
    },
    onSuccess: () => {
      if (user?.id) {
        finishEntryMutation('deleting entry', user.id);
      }
    },
  });

  const setStatementMoodMutation = useMutation<
    void,
    Error,
    SetMoodPayload,
    GratitudeMutationContext
  >({
    mutationFn: async ({ entryDate, statementIndex, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await setStatementMoodRpc(entryDate, statementIndex, moodEmoji);
    },
    onMutate: async ({ entryDate, statementIndex, moodEmoji }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await cancelGratitudeQueries(user.id);
      const snapshot = snapshotGratitudeCaches(queryClient, user.id);
      updateGratitudeEntryCaches(queryClient, user.id, entryDate, (entry) =>
        setStatementMoodInEntry(entry, statementIndex, moodEmoji)
      );

      return { snapshot };
    },
    onError: (err, _variables, context) => {
      if (user?.id) {
        restoreGratitudeCaches(queryClient, user.id, context?.snapshot);
      }
      handleMutationError(err, 'set statement mood');
    },
    onSuccess: () => {
      if (user?.id) {
        invalidateGratitudeBackgroundData(user.id);
      }
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

    deleteEntireEntry: deleteEntireEntryMutation.mutate,
    isDeletingEntry: deleteEntireEntryMutation.isPending,
    deleteEntryError: deleteEntireEntryMutation.error,

    setStatementMood: setStatementMoodMutation.mutate,
  };
};
