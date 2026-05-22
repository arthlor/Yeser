import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

import type { Attachment, GratitudeEntry } from '@/schemas/gratitudeEntrySchema';
import { queryKeys } from '@/shared/query/queryKeys';

type PaginatedEntriesPage = {
  entries: GratitudeEntry[];
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
};

type PaginatedEntriesData = InfiniteData<PaginatedEntriesPage, unknown>;

export interface GratitudeCacheSnapshot {
  queryData: Array<{
    queryKey: QueryKey;
    data: unknown;
  }>;
  randomEntry?: GratitudeEntry | null;
}

interface UpsertOptions {
  insertIntoLists?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isGratitudeEntry = (value: unknown): value is GratitudeEntry =>
  isRecord(value) && typeof value.entry_date === 'string' && Array.isArray(value.statements);

const isPaginatedEntriesData = (value: unknown): value is PaginatedEntriesData =>
  isRecord(value) && Array.isArray(value.pages) && Array.isArray(value.pageParams);

const matchesEntry = (entry: GratitudeEntry, entryDate: string, entryId?: string): boolean =>
  entry.entry_date === entryDate || (!!entryId && entry.id === entryId);

const sortByNewestEntryDate = (entries: GratitudeEntry[]): GratitudeEntry[] =>
  [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));

const matchesSearch = (entry: GratitudeEntry, searchTerm: string): boolean => {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return entry.statements.some((statement) =>
    statement.toLocaleLowerCase().includes(normalizedSearch)
  );
};

const getSearchTermFromPaginatedKey = (queryKey: QueryKey): string => {
  const key = Array.isArray(queryKey) ? queryKey : [];
  const searchTerm = key[5];
  return typeof searchTerm === 'string' ? searchTerm : '';
};

const getMonthParamsFromKey = (queryKey: QueryKey): { year: number; month: number } | undefined => {
  const key = Array.isArray(queryKey) ? queryKey : [];
  const maybeParams = key[3];

  if (!isRecord(maybeParams)) {
    return undefined;
  }

  const { year, month } = maybeParams;
  return typeof year === 'number' && typeof month === 'number' ? { year, month } : undefined;
};

const isSameEntryMonth = (entryDate: string, year: number, month: number): boolean => {
  const [entryYear, entryMonth] = entryDate.split('-').map(Number);
  return entryYear === year && entryMonth === month;
};

const upsertEntryList = (
  entries: GratitudeEntry[],
  entry: GratitudeEntry,
  insertIntoLists: boolean
): GratitudeEntry[] => {
  let didReplace = false;
  const nextEntries = entries.map((current) => {
    if (matchesEntry(current, entry.entry_date, entry.id)) {
      didReplace = true;
      return entry;
    }
    return current;
  });

  if (didReplace) {
    return nextEntries;
  }

  if (!insertIntoLists) {
    return entries;
  }

  return sortByNewestEntryDate([entry, ...entries]);
};

const upsertPaginatedEntries = (
  data: PaginatedEntriesData,
  entry: GratitudeEntry,
  searchTerm: string,
  insertIntoLists: boolean
): PaginatedEntriesData => {
  const hasExistingEntry = data.pages.some((page) =>
    page.entries.some((current) => matchesEntry(current, entry.entry_date, entry.id))
  );
  const shouldKeepInSearch = matchesSearch(entry, searchTerm);
  const shouldInsert = !hasExistingEntry && insertIntoLists && shouldKeepInSearch;
  const totalCountDelta = shouldInsert ? 1 : hasExistingEntry && !shouldKeepInSearch ? -1 : 0;

  if (!hasExistingEntry && !shouldInsert) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page, pageIndex) => {
      let nextEntries = page.entries.reduce<GratitudeEntry[]>((acc, current) => {
        if (!matchesEntry(current, entry.entry_date, entry.id)) {
          acc.push(current);
          return acc;
        }

        if (shouldKeepInSearch) {
          acc.push(entry);
        }
        return acc;
      }, []);

      if (shouldInsert && pageIndex === 0) {
        nextEntries = sortByNewestEntryDate([entry, ...nextEntries]);
      }

      return {
        ...page,
        entries: nextEntries,
        totalCount: Math.max(0, page.totalCount + totalCountDelta),
      };
    }),
  };
};

const removeFromPaginatedEntries = (
  data: PaginatedEntriesData,
  entryDate: string,
  entryId?: string,
  deletedEntry?: GratitudeEntry | null,
  searchTerm = ''
): PaginatedEntriesData => {
  const hasVisibleEntry = data.pages.some((page) =>
    page.entries.some((current) => matchesEntry(current, entryDate, entryId))
  );
  const totalCountDelta =
    deletedEntry && matchesSearch(deletedEntry, searchTerm) ? -1 : hasVisibleEntry ? -1 : 0;

  if (!hasVisibleEntry && totalCountDelta === 0) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      entries: page.entries.filter((current) => !matchesEntry(current, entryDate, entryId)),
      totalCount: Math.max(0, page.totalCount + totalCountDelta),
    })),
  };
};

export const snapshotGratitudeCaches = (
  queryClient: QueryClient,
  userId: string
): GratitudeCacheSnapshot => {
  const gratitudeQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.gratitudeEntries(userId),
    exact: false,
  });

  return {
    queryData: gratitudeQueries.map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
    })),
    randomEntry: queryClient.getQueryData<GratitudeEntry | null>(
      queryKeys.randomGratitudeEntry(userId)
    ),
  };
};

export const restoreGratitudeCaches = (
  queryClient: QueryClient,
  userId: string,
  snapshot?: GratitudeCacheSnapshot
) => {
  if (!snapshot) {
    return;
  }

  snapshot.queryData.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data);
  });
  queryClient.setQueryData(queryKeys.randomGratitudeEntry(userId), snapshot.randomEntry);
};

export const findCachedGratitudeEntry = (
  queryClient: QueryClient,
  userId: string,
  entryDate: string,
  entryId?: string
): GratitudeEntry | null => {
  const dateEntry = queryClient.getQueryData<GratitudeEntry | null>(
    queryKeys.gratitudeEntry(userId, entryDate)
  );

  if (dateEntry) {
    return dateEntry;
  }

  if (entryId) {
    const idEntry = queryClient.getQueryData<GratitudeEntry | null>(
      queryKeys.gratitudeEntryById(userId, entryId)
    );
    if (idEntry) {
      return idEntry;
    }
  }

  const gratitudeQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.gratitudeEntries(userId),
    exact: false,
  });

  for (const query of gratitudeQueries) {
    const data = query.state.data;

    if (isGratitudeEntry(data) && matchesEntry(data, entryDate, entryId)) {
      return data;
    }

    if (Array.isArray(data)) {
      const match = data.find(
        (entry) => isGratitudeEntry(entry) && matchesEntry(entry, entryDate, entryId)
      );
      if (match) {
        return match;
      }
    }

    if (isPaginatedEntriesData(data)) {
      for (const page of data.pages) {
        const match = page.entries.find((entry) => matchesEntry(entry, entryDate, entryId));
        if (match) {
          return match;
        }
      }
    }
  }

  const randomEntry = queryClient.getQueryData<GratitudeEntry | null>(
    queryKeys.randomGratitudeEntry(userId)
  );
  return randomEntry && matchesEntry(randomEntry, entryDate, entryId) ? randomEntry : null;
};

export const upsertGratitudeEntryCaches = (
  queryClient: QueryClient,
  userId: string,
  entry: GratitudeEntry,
  options: UpsertOptions = {}
) => {
  const insertIntoLists = options.insertIntoLists ?? false;

  queryClient.setQueryData(queryKeys.gratitudeEntry(userId, entry.entry_date), entry);
  queryClient.setQueryData(queryKeys.gratitudeEntryById(userId, entry.id), entry);

  const existingEntries = queryClient.getQueryData<GratitudeEntry[]>(
    queryKeys.gratitudeEntries(userId)
  );
  if (existingEntries) {
    queryClient.setQueryData(
      queryKeys.gratitudeEntries(userId),
      upsertEntryList(existingEntries, entry, insertIntoLists)
    );
  }

  const gratitudeQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.gratitudeEntries(userId),
    exact: false,
  });

  gratitudeQueries.forEach((query) => {
    const data = query.state.data;
    const monthParams = getMonthParamsFromKey(query.queryKey);

    if (isGratitudeEntry(data) && matchesEntry(data, entry.entry_date, entry.id)) {
      queryClient.setQueryData(query.queryKey, entry);
      return;
    }

    if (isPaginatedEntriesData(data)) {
      queryClient.setQueryData(
        query.queryKey,
        upsertPaginatedEntries(
          data,
          entry,
          getSearchTermFromPaginatedKey(query.queryKey),
          insertIntoLists
        )
      );
      return;
    }

    if (
      monthParams &&
      Array.isArray(data) &&
      isSameEntryMonth(entry.entry_date, monthParams.year, monthParams.month)
    ) {
      const dateSet = new Set(data.filter((date): date is string => typeof date === 'string'));
      dateSet.add(entry.entry_date);
      queryClient.setQueryData(query.queryKey, Array.from(dateSet).sort());
    }
  });

  const randomEntry = queryClient.getQueryData<GratitudeEntry | null>(
    queryKeys.randomGratitudeEntry(userId)
  );
  if (randomEntry && matchesEntry(randomEntry, entry.entry_date, entry.id)) {
    queryClient.setQueryData(queryKeys.randomGratitudeEntry(userId), entry);
  }
};

export const removeGratitudeEntryCaches = (
  queryClient: QueryClient,
  userId: string,
  entryDate: string,
  entryId?: string,
  deletedEntry?: GratitudeEntry | null
) => {
  queryClient.setQueryData(queryKeys.gratitudeEntry(userId, entryDate), null);

  if (entryId) {
    queryClient.setQueryData(queryKeys.gratitudeEntryById(userId, entryId), null);
  }

  const gratitudeQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.gratitudeEntries(userId),
    exact: false,
  });

  gratitudeQueries.forEach((query) => {
    const data = query.state.data;

    if (isGratitudeEntry(data) && matchesEntry(data, entryDate, entryId)) {
      queryClient.setQueryData(query.queryKey, null);
      return;
    }

    if (Array.isArray(data)) {
      const monthParams = getMonthParamsFromKey(query.queryKey);

      if (monthParams) {
        queryClient.setQueryData(
          query.queryKey,
          data.filter((date) => date !== entryDate)
        );
        return;
      }

      if (
        data.some((entry) => isGratitudeEntry(entry) && matchesEntry(entry, entryDate, entryId))
      ) {
        queryClient.setQueryData(
          query.queryKey,
          data.filter(
            (entry) => !isGratitudeEntry(entry) || !matchesEntry(entry, entryDate, entryId)
          )
        );
      }
      return;
    }

    if (isPaginatedEntriesData(data)) {
      queryClient.setQueryData(
        query.queryKey,
        removeFromPaginatedEntries(
          data,
          entryDate,
          entryId,
          deletedEntry,
          getSearchTermFromPaginatedKey(query.queryKey)
        )
      );
    }
  });

  const currentTotal = queryClient.getQueryData<number>(queryKeys.gratitudeTotalCount(userId));
  if (typeof currentTotal === 'number' && deletedEntry) {
    queryClient.setQueryData(queryKeys.gratitudeTotalCount(userId), Math.max(0, currentTotal - 1));
  }

  const randomEntry = queryClient.getQueryData<GratitudeEntry | null>(
    queryKeys.randomGratitudeEntry(userId)
  );
  if (randomEntry && matchesEntry(randomEntry, entryDate, entryId)) {
    queryClient.setQueryData(queryKeys.randomGratitudeEntry(userId), null);
  }
};

export const updateGratitudeEntryCaches = (
  queryClient: QueryClient,
  userId: string,
  entryDate: string,
  updater: (entry: GratitudeEntry) => GratitudeEntry | null,
  entryId?: string
) => {
  const currentEntry = findCachedGratitudeEntry(queryClient, userId, entryDate, entryId);

  if (!currentEntry) {
    return null;
  }

  const nextEntry = updater(currentEntry);

  if (!nextEntry) {
    removeGratitudeEntryCaches(queryClient, userId, entryDate, currentEntry.id, currentEntry);
    return null;
  }

  upsertGratitudeEntryCaches(queryClient, userId, nextEntry);
  return nextEntry;
};

export const incrementGratitudeEntryCount = (
  queryClient: QueryClient,
  userId: string,
  delta: number
) => {
  const currentTotal = queryClient.getQueryData<number>(queryKeys.gratitudeTotalCount(userId));

  if (typeof currentTotal === 'number') {
    queryClient.setQueryData(
      queryKeys.gratitudeTotalCount(userId),
      Math.max(0, currentTotal + delta)
    );
  }
};

export const createOptimisticEntry = (
  userId: string,
  entryDate: string,
  statement: string,
  moodEmoji?: string | null
): GratitudeEntry => {
  const now = new Date().toISOString();

  return {
    id: `temp-${Date.now()}`,
    user_id: userId,
    entry_date: entryDate,
    statements: [statement],
    moods: moodEmoji ? { '0': moodEmoji } : {},
    attachments: [],
    created_at: now,
    updated_at: now,
  };
};

export const appendStatementToEntry = (
  entry: GratitudeEntry,
  statement: string,
  moodEmoji?: string | null
): GratitudeEntry => {
  const nextStatements = [...entry.statements, statement];
  const nextIndex = nextStatements.length - 1;
  const nextMoods = { ...((entry.moods as Record<string, string> | undefined) ?? {}) };

  if (moodEmoji) {
    nextMoods[String(nextIndex)] = moodEmoji;
  }

  return {
    ...entry,
    statements: nextStatements,
    moods: nextMoods,
    updated_at: new Date().toISOString(),
  };
};

export const editStatementInEntry = (
  entry: GratitudeEntry,
  statementIndex: number,
  updatedStatement: string,
  moodEmoji?: string | null
): GratitudeEntry => {
  if (statementIndex < 0 || statementIndex >= entry.statements.length) {
    return entry;
  }

  const nextStatements = [...entry.statements];
  nextStatements[statementIndex] = updatedStatement;

  const nextMoods = { ...((entry.moods as Record<string, string> | undefined) ?? {}) };
  if (moodEmoji) {
    nextMoods[String(statementIndex)] = moodEmoji;
  }

  return {
    ...entry,
    statements: nextStatements,
    moods: nextMoods,
    updated_at: new Date().toISOString(),
  };
};

export const setStatementMoodInEntry = (
  entry: GratitudeEntry,
  statementIndex: number,
  moodEmoji: string | null
): GratitudeEntry => {
  if (statementIndex < 0 || statementIndex >= entry.statements.length) {
    return entry;
  }

  const nextMoods = { ...((entry.moods as Record<string, string> | undefined) ?? {}) };

  if (moodEmoji) {
    nextMoods[String(statementIndex)] = moodEmoji;
  } else {
    delete nextMoods[String(statementIndex)];
  }

  return {
    ...entry,
    moods: nextMoods,
    updated_at: new Date().toISOString(),
  };
};

export const deleteStatementFromEntry = (
  entry: GratitudeEntry,
  statementIndex: number
): GratitudeEntry | null => {
  if (statementIndex < 0 || statementIndex >= entry.statements.length) {
    return entry;
  }

  const nextStatements = entry.statements.filter((_, index) => index !== statementIndex);

  if (nextStatements.length === 0) {
    return null;
  }

  const nextMoods: Record<string, string> = {};
  Object.entries((entry.moods as Record<string, string> | undefined) ?? {}).forEach(
    ([key, value]) => {
      const index = Number(key);
      if (!Number.isInteger(index)) {
        return;
      }

      if (index < statementIndex) {
        nextMoods[key] = value;
      } else if (index > statementIndex) {
        nextMoods[String(index - 1)] = value;
      }
    }
  );

  const nextAttachments = ((entry.attachments as Attachment[] | undefined) ?? [])
    .filter((attachment) => attachment.statement_index !== statementIndex)
    .map((attachment) =>
      attachment.statement_index > statementIndex
        ? { ...attachment, statement_index: attachment.statement_index - 1 }
        : attachment
    );

  return {
    ...entry,
    statements: nextStatements,
    moods: nextMoods,
    attachments: nextAttachments,
    updated_at: new Date().toISOString(),
  };
};
