# Comprehensive TanStack Query Integration Plan for Yeşer

## Executive Summary
This comprehensive plan details the migration from Zustand-based server state management to TanStack Query for improved data fetching, caching, and synchronization in the Yeşer gratitude app.

**Risk Level**: Medium
**Team Impact**: All developers working on data layer

---

## ⚠️ CRITICAL INTEGRATION RULE

**🎯 Version Awareness**: If you are working with a newer version of any file than what is referenced in this roadmap documentation, **ALWAYS take the current file state into account**. The actual codebase may have evolved beyond the examples shown here. Analyze the current implementation first, then adapt the integration strategy accordingly.

This includes:
- API functions that may have been refactored
- Store structures that may have changed
- Component patterns that may have been updated
- Dependency versions that may be different
- New features or modifications not captured in this plan

---

## 📋 Pre-Integration Checklist


### Dependencies & Environment
- [ ] Install `@tanstack/react-query` (v5.x)
- [ ] Install `@tanstack/react-query-devtools` (dev)
- [ ] Consider `flipper-plugin-react-query` for debugging
- [ ] Update TypeScript if needed (>=4.1)

---

## 🎯 Phase 0: Foundation & Setup

### 0.1 Installation & Basic Setup

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
# For React Native debugging
npm install --save-dev flipper-plugin-react-query
```

### 0.2 Create Query Provider

**File**: `src/providers/QueryProvider.tsx`

```typescript
import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Better for mobile
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        console.error('Mutation error:', error);
        // TODO: Add global error handling/toasts
      },
    },
  },
});

export const QueryProvider: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {__DEV__ && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};

export { queryClient };
```

### 0.3 Update App.tsx

```typescript
// src/App.tsx
import { QueryProvider } from './providers/QueryProvider';

export default function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryProvider>
  );
}
```

### 0.4 Create Query Keys Factory

**File**: `src/api/queryKeys.ts`

```typescript
export const queryKeys = {
  // Root key for global invalidation
  all: ['yeser'] as const,
  
  // Profile queries
  profile: (userId?: string) => [...queryKeys.all, 'profile', userId] as const,
  
  // Gratitude entry queries
  gratitudeEntries: (userId?: string) => [...queryKeys.all, 'gratitudeEntries', userId] as const,
  gratitudeEntry: (userId: string | undefined, entryDate: string) => 
    [...queryKeys.gratitudeEntries(userId), { entryDate }] as const,
  gratitudeEntriesByMonth: (userId: string | undefined, year: number, month: number) => 
    [...queryKeys.gratitudeEntries(userId), { year, month }] as const,
  gratitudeTotalCount: (userId?: string) => 
    [...queryKeys.gratitudeEntries(userId), 'totalCount'] as const,
  
  // Streak queries
  streaks: (userId?: string) => [...queryKeys.all, 'streaks', userId] as const,
  
  // Random/throwback queries
  randomGratitudeEntry: (userId?: string) => 
    [...queryKeys.all, 'randomGratitudeEntry', userId] as const,
} as const;
```

### 0.5 Phase 0 Validation Checklist

- [ ] QueryProvider wraps App correctly
- [ ] Query devtools accessible in development
- [ ] No TypeScript errors
- [ ] App still functions normally
- [ ] Performance baseline maintained

---

## 🔄 Phase 1: Profile Data Migration 

### 1.1 Refactor Profile API

**Update**: `src/api/profileApi.ts`

```typescript
import { supabase } from '../utils/supabaseClient';
import { UserProfile } from '@/types/UserProfile';

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Profile fetch error:', error);
    throw error;
  }
  
  return data as UserProfile | null;
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Profile update error:', error);
    throw error;
  }
  
  return data as UserProfile | null;
};
```

### 1.2 Create Profile Hooks

**File**: `src/hooks/useUserProfile.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserProfile, updateUserProfile } from '@/api/profileApi';
import { queryKeys } from '@/api/queryKeys';
import useAuthStore from '@/store/authStore';
import { UserProfile } from '@/types/UserProfile';

export const useUserProfile = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery<UserProfile | null, Error>({
    queryKey: queryKeys.profile(user?.id),
    queryFn: () => {
      if (!user?.id) throw new Error('User ID required');
      return fetchUserProfile(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // Profile data stays fresh for 10 minutes
  });

  const {
    mutate: updateProfile,
    isPending: isUpdatingProfile,
    error: updateError,
  } = useMutation<UserProfile | null, Error, Partial<UserProfile>>({
    mutationFn: (updates: Partial<UserProfile>) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateUserProfile(user.id, updates);
    },
    onSuccess: (data) => {
      // Update cache directly for instant feedback
      queryClient.setQueryData(queryKeys.profile(user?.id), data);
      
      // Optionally invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.streaks(user?.id),
        exact: false 
      });
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
      // TODO: Show error toast
    },
  });

  return {
    profile,
    isLoadingProfile: isLoading,
    profileError: error,
    isProfileError: isError,
    refetchProfile: refetch,
    updateProfile,
    isUpdatingProfile,
    updateProfileError: updateError,
  };
};
```

### 1.3 Update Components

**Example**: Update settings screens to use new hook

```typescript
// Replace profileStore usage
const { profile, isLoadingProfile, updateProfile, isUpdatingProfile } = useUserProfile();

// Replace loading state
if (isLoadingProfile) return <LoadingSpinner />;

// Replace update calls
const handleProfileUpdate = (updates: Partial<UserProfile>) => {
  updateProfile(updates);
};
```

### 1.4 Migration Strategy

1. **Dual State Period**: Keep both systems running temporarily
2. **Feature Flag**: Use environment variable to toggle between systems
3. **Component-by-Component**: Migrate one screen at a time
4. **Validation**: Ensure data consistency between systems

### 1.5 Phase 1 Validation Checklist

- [ ] Profile data loads correctly
- [ ] Profile updates work and sync immediately
- [ ] Loading states display properly
- [ ] Error handling works
- [ ] No regressions in existing functionality
- [ ] Performance is equal or better

---

## 📝 Phase 2: Gratitude Entries Query Migration 

### 2.1 Refactor Gratitude API (Queries Only)

**Update**: `src/api/gratitudeApi.ts`

```typescript
// Keep existing mutation functions, focus on queries

export const fetchGratitudeEntries = async (userId: string): Promise<GratitudeEntry[]> => {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('id, user_id, entry_date, statements, created_at, updated_at')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false });

  if (error) throw error;
  
  return data ? data.map(mapAndValidateRawEntry) : [];
};

export const fetchGratitudeEntryByDate = async (
  userId: string, 
  entryDate: string
): Promise<GratitudeEntry | null> => {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', entryDate)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  
  return data ? mapAndValidateRawEntry(data) : null;
};

export const fetchEntryDatesForMonth = async (
  userId: string, 
  year: number, 
  month: number
): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_entry_dates_for_month', {
    p_user_id: userId,
    p_year: year,
    p_month: month,
  });

  if (error) throw error;
  
  return (data || []).map(d => d.entry_date);
};

export const fetchTotalGratitudeCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('gratitude_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  
  return count || 0;
};
```

### 2.2 Create Gratitude Query Hooks

**File**: `src/hooks/useGratitudeQueries.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import {
  fetchGratitudeEntries,
  fetchGratitudeEntryByDate,
  fetchEntryDatesForMonth,
  fetchTotalGratitudeCount,
} from '@/api/gratitudeApi';
import { queryKeys } from '@/api/queryKeys';
import useAuthStore from '@/store/authStore';
import { GratitudeEntry } from '@/schemas/gratitudeEntrySchema';

export const useGratitudeEntries = () => {
  const user = useAuthStore(state => state.user);
  
  return useQuery<GratitudeEntry[], Error>({
    queryKey: queryKeys.gratitudeEntries(user?.id),
    queryFn: () => {
      if (!user?.id) throw new Error('User ID required');
      return fetchGratitudeEntries(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - entries change more frequently
  });
};

export const useGratitudeEntry = (entryDate: string) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery<GratitudeEntry | null, Error>({
    queryKey: queryKeys.gratitudeEntry(user?.id, entryDate),
    queryFn: () => {
      if (!user?.id) throw new Error('User ID required');
      return fetchGratitudeEntryByDate(user.id, entryDate);
    },
    enabled: !!user?.id && !!entryDate,
    staleTime: 1000 * 60 * 5, // Individual entries are more stable
  });
};

export const useEntryDatesForMonth = (year: number, month: number) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery<string[], Error>({
    queryKey: queryKeys.gratitudeEntriesByMonth(user?.id, year, month),
    queryFn: () => {
      if (!user?.id) throw new Error('User ID required');
      return fetchEntryDatesForMonth(user.id, year, month);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 15, // Monthly data changes less frequently
  });
};

export const useGratitudeTotalCount = () => {
  const user = useAuthStore(state => state.user);
  
  return useQuery<number, Error>({
    queryKey: queryKeys.gratitudeTotalCount(user?.id),
    queryFn: () => {
      if (!user?.id) throw new Error('User ID required');
      return fetchTotalGratitudeCount(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 10, // Count changes less frequently
  });
};
```

### 2.3 Component Migration Examples

```typescript
// EnhancedPastEntriesScreen.tsx
const { data: entries, isLoading, error, refetch } = useGratitudeEntries();

// EntryDetailScreen.tsx
const { data: entry, isLoading } = useGratitudeEntry(selectedDate);

// EnhancedCalendarViewScreen.tsx
const { data: entryDates, isLoading } = useEntryDatesForMonth(currentYear, currentMonth);
```

### 2.4 Phase 2 Validation Checklist

- [ ] All entry lists load correctly
- [ ] Individual entry details display properly
- [ ] Calendar view shows correct entry dates
- [ ] Total count displays accurately
- [ ] Loading states work smoothly
- [ ] Error handling is robust
- [ ] Cache invalidation works properly

---

## ✏️ Phase 3: Gratitude Mutations Migration 

### 3.1 Create Mutation Hooks

**File**: `src/hooks/useGratitudeMutations.ts`

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addStatement,
  editStatement,
  deleteStatement,
} from '@/api/gratitudeApi';
import { queryKeys } from '@/api/queryKeys';
import useAuthStore from '@/store/authStore';

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

export const useGratitudeMutations = () => {
  const user = useAuthStore(state => state.user);
  const queryClient = useQueryClient();

  const invalidateGratitudeQueries = () => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.gratitudeEntries(user?.id) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.gratitudeTotalCount(user?.id) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.streaks(user?.id) 
    });
  };

  const addStatementMutation = useMutation<
    GratitudeEntry | null,
    Error,
    AddStatementPayload
  >({
    mutationFn: async ({ entryDate, statement }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return addStatement(entryDate, statement);
    },
    onMutate: async ({ entryDate, statement }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.gratitudeEntry(user?.id, entryDate) 
      });

      // Snapshot previous value
      const previousEntry = queryClient.getQueryData(
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
    },
    onSettled: () => {
      invalidateGratitudeQueries();
    },
  });

  const editStatementMutation = useMutation<void, Error, EditStatementPayload>({
    mutationFn: async ({ entryDate, statementIndex, updatedStatement }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return editStatement(entryDate, statementIndex, updatedStatement);
    },
    onSuccess: (_, { entryDate }) => {
      // Invalidate specific entry to refetch latest state
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.gratitudeEntry(user?.id, entryDate) 
      });
    },
  });

  const deleteStatementMutation = useMutation<void, Error, DeleteStatementPayload>({
    mutationFn: async ({ entryDate, statementIndex }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return deleteStatement(entryDate, statementIndex);
    },
    onSuccess: (_, { entryDate }) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.gratitudeEntry(user?.id, entryDate) 
      });
      invalidateGratitudeQueries();
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
  };
};
```

### 3.2 Update Components for Mutations

```typescript
// EnhancedDailyEntryScreen.tsx
const { addStatement, isAddingStatement } = useGratitudeMutations();

const handleAddStatement = (statement: string) => {
  addStatement({ 
    entryDate: selectedDate, 
    statement 
  });
};

// EntryDetailScreen.tsx
const { editStatement, deleteStatement } = useGratitudeMutations();

const handleEdit = (index: number, newText: string) => {
  editStatement({
    entryDate: selectedDate,
    statementIndex: index,
    updatedStatement: newText,
  });
};
```

### 3.3 Phase 3 Validation Checklist

- [ ] Adding statements works with optimistic updates
- [ ] Editing statements updates immediately
- [ ] Deleting statements removes from UI
- [ ] Error states display correctly
- [ ] Loading states during mutations
- [ ] Cache invalidation keeps data fresh
- [ ] Rollback works on mutation failures

---

## 📊 Phase 4: Streaks & Random Entries 

### 4.1 Streak API Functions

```typescript
// src/api/streakApi.ts
export const fetchUserStreak = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_entry_date')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};
```

### 4.2 Streak Hooks

```typescript
// src/hooks/useStreakData.ts
export const useStreakData = () => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: queryKeys.streaks(user?.id),
    queryFn: () => {
      if (!user?.id) throw new Error('User ID required');
      return fetchUserStreak(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useRandomGratitudeEntry = (options?: { enabled?: boolean }) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: queryKeys.randomGratitudeEntry(user?.id),
    queryFn: () => {
      if (!user?.id) throw new Error('User ID required');
      return fetchRandomGratitudeEntry(user.id);
    },
    enabled: !!user?.id && (options?.enabled ?? true),
    staleTime: Infinity, // Random entries don't need frequent refetching
    refetchOnMount: 'always', // Get new random entry on component mount
  });
};
```

### 4.3 Phase 4 Validation Checklist

- [ ] Streak data displays correctly
- [ ] Random entries load properly
- [ ] Throwback modal integration works
- [ ] Performance remains optimal

---

## 🧪 Phase 5: Testing & Quality Assurance 

### 5.2 Performance Testing

#### Metrics to Monitor
- [ ] Initial app load time
- [ ] Data fetching latency
- [ ] Memory usage patterns
- [ ] Cache hit rates
- [ ] Network request frequency

#### Tools
- Flipper React Query plugin
- React DevTools Profiler
- Metro bundle analyzer

### 5.3 Error Handling Validation

- [ ] Network errors display user-friendly messages
- [ ] Authentication errors redirect appropriately
- [ ] Server errors don't crash the app
- [ ] Optimistic updates rollback on failure
- [ ] Loading states prevent user confusion

### 5.4 Cache Behavior Testing

- [ ] Data persists between app sessions
- [ ] Stale data refetches appropriately
- [ ] Cache invalidation works correctly
- [ ] Memory usage stays reasonable

---

## 🚀 Phase 6: Cleanup & Optimization 

### 6.1 Zustand Store Cleanup

#### Files to Modify
- [ ] `src/store/gratitudeStore.ts` - Remove server state logic
- [ ] `src/store/profileStore.ts` - Keep only client state
- [ ] Update imports throughout the app

#### What to Keep in Zustand
- UI state (modal visibility, form states)
- Authentication state
- Theme preferences
- Client-side temporary data

### 6.2 Code Organization

```
src/
├── hooks/
│   ├── queries/
│   │   ├── useUserProfile.ts
│   │   ├── useGratitudeQueries.ts
│   │   └── useStreakData.ts
│   ├── mutations/
│   │   └── useGratitudeMutations.ts
│   └── index.ts (re-exports)
├── api/
│   ├── queries/
│   ├── mutations/
│   └── queryKeys.ts
```

### 6.3 Documentation Updates

- [ ] Update README with new data flow
- [ ] Document query key strategies
- [ ] Add troubleshooting guide
- [ ] Update API documentation

---

## 🎛️ Configuration & Best Practices

### Query Configuration Patterns

```typescript
// Short-lived, frequently changing data
const liveDataConfig = {
  staleTime: 1000 * 30, // 30 seconds
  gcTime: 1000 * 60 * 2, // 2 minutes
};

// Stable, infrequently changing data
const stableDataConfig = {
  staleTime: 1000 * 60 * 10, // 10 minutes
  gcTime: 1000 * 60 * 30, // 30 minutes
};

// One-time or rarely changing data
const staticDataConfig = {
  staleTime: Infinity,
  gcTime: 1000 * 60 * 60, // 1 hour
};
```

### Error Boundary Integration

```typescript
// src/components/QueryErrorBoundary.tsx
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

export const QueryErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <ErrorFallback onRetry={resetErrorBoundary} />
        )}
      >
        {children}
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
```

---


## 🎯 Final Integration Checklist

### Pre-Release Validation
- [ ] All unit tests passing
- [ ] Integration tests comprehensive
- [ ] Performance benchmarks met
- [ ] Error handling validated
- [ ] Documentation complete

### Release Preparation
- [ ] Feature flag configuration ready
- [ ] Monitoring dashboards set up
- [ ] Rollback procedures tested
- [ ] Team trained on new patterns
- [ ] Support documentation updated

### Post-Release Monitoring
- [ ] Real-time performance monitoring
- [ ] Error rate tracking
- [ ] User feedback collection
- [ ] Cache performance analysis
- [ ] Memory usage monitoring

---

## 📚 Resources & References

### Documentation
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Query Key Strategies](https://tkdodo.eu/blog/effective-react-query-keys)

### Tools
- React Query Devtools
- Flipper React Query Plugin
- Bundle Analyzer for size tracking

### Team Knowledge Sharing
- Migration workshop sessions
- Code review guidelines
- Pattern documentation
- Troubleshooting playbook

---

*This comprehensive plan ensures a smooth, low-risk migration to TanStack Query while maintaining application stability and improving developer experience.* 