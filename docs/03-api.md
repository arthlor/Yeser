# API Documentation

This document provides comprehensive documentation for the API layer in the Yeşer gratitude app, built with TanStack Query v5.80.2 for intelligent server state management, **magic link authentication** flows, and **7-layer error protection system**.

## 🌐 API Architecture Overview

The Yeşer app uses a modern API architecture with:

- **Supabase Backend**: PostgreSQL 15 database with Row Level Security (RLS)
- **Magic Link Authentication**: Passwordless security with deep link integration
- **TanStack Query v5.80.2**: Intelligent caching, background sync, optimistic updates
- **Type-Safe APIs**: Full TypeScript integration with Zod validation
- **Feature-Based Organization**: APIs organized by domain (auth, gratitude, settings, etc.)
- **Enhanced Security**: Rate limiting, token validation, and secure authentication flows
- **7-Layer Error Protection**: Comprehensive error handling preventing technical errors from reaching users
- **Performance Optimization**: Production-ready caching and query strategies

```
┌─────────────────────────────────────────────────────────┐
│                    Component Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Screens     │  │ Components  │  │ Hooks       │     │
│  │ (UI Logic)  │  │ (Pure UI)   │  │(TanStack Q) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 TanStack Query Layer                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Queries   │  │ Mutations   │  │   Cache     │     │
│  │ (Read Ops)  │  │(Write Ops)  │  │ Management  │     │
│  │   v5.80.2   │  │             │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                 7-Layer Error Protection                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Translation │  │ Monitoring  │  │ UI Safety   │     │
│  │   Layer     │  │   Layer     │  │   Layer     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                      API Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ API         │  │ Validation  │  │ Transform   │     │
│  │ Functions   │  │ (Zod)       │  │ Layer       │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    Supabase Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Database   │  │     RPC     │  │  Real-time  │     │
│  │(PostgreSQL) │  │ Functions   │  │    (Future) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 📁 API Structure (Production-Optimized)

```
src/api/
├── queryClient.ts          # TanStack Query client with optimized configuration
├── queryKeys.ts           # Centralized query key factory with hierarchical structure
├── gratitudeApi.ts        # Gratitude CRUD operations with optimistic updates
├── profileApi.ts          # User profile management with notifications & auth metadata
├── promptApi.ts           # Daily prompts with varied prompts support
├── streakApi.ts           # Streak calculations and analytics with caching
├── userDataApi.ts         # Data export functionality with PDF generation
├── authApi.ts            # Magic link and OAuth authentication flows
├── deepLinkApi.ts        # Deep link handling and token extraction
├── gratitudeBenefitApi.ts # Gratitude benefits with type-safe validation
└── errorHandling.ts      # Centralized error handling utilities
```

## 🔧 Query Client Configuration (Performance-Optimized)

**File**: `src/api/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorUtils';

// Configure online manager for React Native
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000, // 1 minute - data is fresh
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache (renamed from cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry for authentication/authorization errors
        if (error?.status === 404 || error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 2; // Retry twice for other errors
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Typically false for React Native
      refetchOnReconnect: true,
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
      onError: (error) => {
        // Global mutation error handling with 7-layer protection
        const safeMessage = safeErrorDisplay(error);
        logger.error('Mutation error:', { error, safeMessage });
      },
    },
  },
  logger: {
    log: logger.debug,
    warn: logger.warn,
    error: logger.error,
  },
});

// Enhanced error handling for global query client
queryClient.setMutationDefaults(['profile-update'], {
  mutationFn: async (updates) => {
    try {
      // Mutation implementation with error protection
    } catch (error) {
      // Enhanced error handling with translation
      throw safeErrorDisplay(error);
    }
  },
});
```

## 🗂️ Query Key Factory (Enhanced)

**File**: `src/api/queryKeys.ts`

```typescript
/**
 * Centralized query key factory for TanStack Query
 * Hierarchical structure for intelligent cache invalidation
 * Performance-optimized for production use
 */
export const queryKeys = {
  // Root key for global invalidation
  all: ['yeser'] as const,

  // User profile queries
  profile: (userId?: string) => [...queryKeys.all, 'profile', userId] as const,

  // Gratitude entry queries with enhanced caching
  gratitudeEntries: (userId?: string) => [...queryKeys.all, 'gratitudeEntries', userId] as const,
  gratitudeEntry: (userId: string | undefined, entryDate: string) =>
    [...queryKeys.gratitudeEntries(userId), { entryDate }] as const,
  gratitudeEntriesByMonth: (userId: string | undefined, year: number, month: number) =>
    [...queryKeys.gratitudeEntries(userId), { year, month }] as const,
  gratitudeTotalCount: (userId?: string) =>
    [...queryKeys.gratitudeEntries(userId), 'totalCount'] as const,

  // Streak queries with intelligent caching
  streaks: (userId?: string) => [...queryKeys.all, 'streaks', userId] as const,

  // Random/throwback queries with cache optimization
  randomGratitudeEntry: (userId?: string) =>
    [...queryKeys.all, 'randomGratitudeEntry', userId] as const,

  // Daily prompt queries with varied prompts support
  currentPrompt: (userId?: string) => [...queryKeys.all, 'currentPrompt', userId] as const,
  multiplePrompts: (userId?: string, limit?: number) =>
    [...queryKeys.all, 'multiplePrompts', userId, limit] as const,

  // Gratitude benefits queries (NEW)
  gratitudeBenefits: () => [...queryKeys.all, 'gratitudeBenefits'] as const,
  gratitudeBenefit: (benefitId: string) =>
    [...queryKeys.gratitudeBenefits(), { benefitId }] as const,
} as const;

// Enhanced query key utilities for cache management
export const queryKeyHelpers = {
  // Invalidate all user data with performance optimization
  invalidateUserData: (userId: string) => [
    queryKeys.profile(userId),
    queryKeys.gratitudeEntries(userId),
    queryKeys.streaks(userId),
    queryKeys.gratitudeBenefits(),
  ],

  // Invalidate entry-related data with selective invalidation
  invalidateEntryData: (userId: string, entryDate?: string) =>
    [
      queryKeys.gratitudeEntries(userId),
      entryDate ? queryKeys.gratitudeEntry(userId, entryDate) : null,
      queryKeys.streaks(userId),
      queryKeys.gratitudeTotalCount(userId),
    ].filter(Boolean),

  // Invalidate authentication-related data
  invalidateAuthData: (userId: string) => [
    queryKeys.profile(userId),
    queryKeys.all, // Global invalidation for auth changes
  ],
};
```

## 👤 Profile API (Enhanced with Error Protection)

**File**: `src/api/profileApi.ts`

### Core Functions with 7-Layer Protection

```typescript
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorUtils';
import { rawProfileDataSchema, profileSchema, updateProfileSchema } from '@/schemas/profileSchema';
import type { Profile, RawProfileData } from '@/types/profile';

/**
 * Fetches the authenticated user's profile with comprehensive error protection
 */
export const getProfile = async (): Promise<Profile | null> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error('User not authenticated:', authError?.message);
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        id,
        email,
        full_name,
        avatar_url,
        username,
        onboarded,
        daily_gratitude_goal,
        reminder_enabled,
        reminder_time,
        throwback_reminder_enabled,
        throwback_reminder_frequency,
        throwback_reminder_time,
        use_varied_prompts,
        auth_provider,
        last_sign_in_at,
        created_at,
        updated_at
      `
      )
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching profile:', error.message);
      const safeMessage = safeErrorDisplay(error);
      throw new Error(safeMessage);
    }

    if (!data) {
      logger.warn('No profile found for user');
      return null;
    }

    // Transform and validate the raw data with error protection
    return mapAndValidateRawProfile(data as RawProfileData);
  } catch (error) {
    logger.error('Unexpected error in getProfile:', error);
    // Apply 7-layer error protection
    const safeMessage = safeErrorDisplay(error);
    throw new Error(safeMessage);
  }
};

/**
 * Updates user profile with comprehensive error handling and validation
 */
export const updateProfile = async (updates: Partial<Profile>): Promise<Profile> => {
  try {
    // Enhanced validation with error protection
    const validatedUpdates = updateProfileSchema.parse(updates);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const safeMessage = safeErrorDisplay(authError);
      throw new Error(safeMessage || 'Kimlik doğrulama gerekli');
    }

    // Transform camelCase to snake_case for Supabase with enhanced field mapping
    const payloadForSupabase: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Enhanced field mapping with all current profile fields
    if ('dailyGratitudeGoal' in validatedUpdates) {
      payloadForSupabase.daily_gratitude_goal = validatedUpdates.dailyGratitudeGoal;
    }
    if ('reminderEnabled' in validatedUpdates) {
      payloadForSupabase.reminder_enabled = validatedUpdates.reminderEnabled;
    }
    if ('reminderTime' in validatedUpdates) {
      payloadForSupabase.reminder_time = validatedUpdates.reminderTime;
    }
    if ('throwbackReminderEnabled' in validatedUpdates) {
      payloadForSupabase.throwback_reminder_enabled = validatedUpdates.throwbackReminderEnabled;
    }
    if ('throwbackReminderFrequency' in validatedUpdates) {
      payloadForSupabase.throwback_reminder_frequency = validatedUpdates.throwbackReminderFrequency;
    }
    if ('throwbackReminderTime' in validatedUpdates) {
      payloadForSupabase.throwback_reminder_time = validatedUpdates.throwbackReminderTime;
    }
    if ('useVariedPrompts' in validatedUpdates) {
      payloadForSupabase.use_varied_prompts = validatedUpdates.useVariedPrompts;
    }
    if ('fullName' in validatedUpdates) {
      payloadForSupabase.full_name = validatedUpdates.fullName;
    }
    if ('username' in validatedUpdates) {
      payloadForSupabase.username = validatedUpdates.username;
    }
    if ('onboarded' in validatedUpdates) {
      payloadForSupabase.onboarded = validatedUpdates.onboarded;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(payloadForSupabase)
      .eq('id', user.id)
      .select(
        `
        id,
        email,
        full_name,
        avatar_url,
        username,
        onboarded,
        daily_gratitude_goal,
        reminder_enabled,
        reminder_time,
        throwback_reminder_enabled,
        throwback_reminder_frequency,
        throwback_reminder_time,
        use_varied_prompts,
        auth_provider,
        last_sign_in_at,
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      logger.error('Error updating profile:', error.message);
      const safeMessage = safeErrorDisplay(error);
      throw new Error(safeMessage);
    }

    if (!data) {
      throw new Error('Profil güncellenirken bir hata oluştu');
    }

    return mapAndValidateRawProfile(data as RawProfileData);
  } catch (error) {
    logger.error('Unexpected error in updateProfile:', error);
    // Apply 7-layer error protection
    const safeMessage = safeErrorDisplay(error);
    throw new Error(safeMessage);
  }
};

/**
 * Maps and validates raw profile data from Supabase to app format with error protection
 */
const mapAndValidateRawProfile = (validatedRawData: RawProfileData): Profile => {
  try {
    // Enhanced mapping with all current fields
    const dataForZod = {
      ...validatedRawData,
      // Map snake_case database fields to camelCase app fields
      useVariedPrompts: validatedRawData.use_varied_prompts,
      dailyGratitudeGoal: validatedRawData.daily_gratitude_goal,
      reminderEnabled: validatedRawData.reminder_enabled,
      reminderTime: validatedRawData.reminder_time,
      throwbackReminderEnabled: validatedRawData.throwback_reminder_enabled,
      throwbackReminderFrequency: validatedRawData.throwback_reminder_frequency,
      throwbackReminderTime: validatedRawData.throwback_reminder_time,
      fullName: validatedRawData.full_name,
      avatarUrl: validatedRawData.avatar_url,
      authProvider: validatedRawData.auth_provider,
      lastSignInAt: validatedRawData.last_sign_in_at,
      createdAt: validatedRawData.created_at,
      updatedAt: validatedRawData.updated_at,
    };

    // Remove snake_case fields to avoid conflicts
    const cleanedData = { ...dataForZod };
    delete (cleanedData as any).use_varied_prompts;
    delete (cleanedData as any).daily_gratitude_goal;
    delete (cleanedData as any).reminder_enabled;
    delete (cleanedData as any).reminder_time;
    delete (cleanedData as any).throwback_reminder_enabled;
    delete (cleanedData as any).throwback_reminder_frequency;
    delete (cleanedData as any).throwback_reminder_time;
    delete (cleanedData as any).full_name;
    delete (cleanedData as any).avatar_url;
    delete (cleanedData as any).auth_provider;
    delete (cleanedData as any).last_sign_in_at;
    delete (cleanedData as any).created_at;
    delete (cleanedData as any).updated_at;

    return profileSchema.parse(cleanedData);
  } catch (error) {
    logger.error('Error mapping profile data:', error);
    const safeMessage = safeErrorDisplay(error);
    throw new Error(safeMessage);
  }
};
```

## 📊 Gratitude Benefits API (NEW)

**File**: `src/api/gratitudeBenefitApi.ts`

```typescript
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorUtils';
import { gratitudeBenefitSchema } from '@/schemas/gratitudeBenefitSchema';
import type { GratitudeBenefit } from '@/types/gratitudeBenefit';

/**
 * Fetches all active gratitude benefits with error protection
 */
export const getGratitudeBenefits = async (): Promise<GratitudeBenefit[]> => {
  try {
    const { data, error } = await supabase
      .from('gratitude_benefits')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      logger.error('Error fetching gratitude benefits:', error.message);
      const safeMessage = safeErrorDisplay(error);
      throw new Error(safeMessage);
    }

    return (data || []).map((benefit) => gratitudeBenefitSchema.parse(benefit));
  } catch (error) {
    logger.error('Unexpected error in getGratitudeBenefits:', error);
    const safeMessage = safeErrorDisplay(error);
    throw new Error(safeMessage);
  }
};

/**
 * Fetches a specific gratitude benefit by ID
 */
export const getGratitudeBenefit = async (benefitId: string): Promise<GratitudeBenefit | null> => {
  try {
    const { data, error } = await supabase
      .from('gratitude_benefits')
      .select('*')
      .eq('id', benefitId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      logger.error('Error fetching gratitude benefit:', error.message);
      const safeMessage = safeErrorDisplay(error);
      throw new Error(safeMessage);
    }

    return data ? gratitudeBenefitSchema.parse(data) : null;
  } catch (error) {
    logger.error('Unexpected error in getGratitudeBenefit:', error);
    const safeMessage = safeErrorDisplay(error);
    throw new Error(safeMessage);
  }
};
```

## 📝 Gratitude API

**File**: `src/api/gratitudeApi.ts`

### Core Functions

```typescript
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { gratitudeEntrySchema } from '@/schemas/gratitudeSchema';
import type { GratitudeEntry } from '@/types/gratitude';

/**
 * Fetches all gratitude entries for the authenticated user
 */
export const getGratitudeDailyEntries = async (): Promise<GratitudeEntry[]> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (error) {
      logger.error('Error fetching gratitude entries:', error.message);
      throw new Error(`Failed to fetch entries: ${error.message}`);
    }

    return (data || []).map((entry) => gratitudeEntrySchema.parse(entry));
  } catch (error) {
    logger.error('Unexpected error in getGratitudeDailyEntries:', error);
    throw error;
  }
};

/**
 * Fetches a single gratitude entry by date
 */
export const getGratitudeDailyEntryByDate = async (
  entryDate: string
): Promise<GratitudeEntry | null> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entry_date', entryDate)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No entry found for this date
        return null;
      }
      logger.error('Error fetching gratitude entry by date:', error.message);
      throw new Error(`Failed to fetch entry for ${entryDate}: ${error.message}`);
    }

    return data ? gratitudeEntrySchema.parse(data) : null;
  } catch (error) {
    logger.error('Unexpected error in getGratitudeDailyEntryByDate:', error);
    throw error;
  }
};

/**
 * Adds a new gratitude statement using RPC function
 */
export const addStatement = async (
  entryDate: string,
  statement: string
): Promise<GratitudeEntry> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('add_gratitude_statement', {
      p_user_id: user.id,
      p_entry_date: entryDate,
      p_statement: statement.trim(),
    });

    if (error) {
      logger.error('Error adding gratitude statement:', error.message);
      throw new Error(`Failed to add statement: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from add statement operation');
    }

    return gratitudeEntrySchema.parse(data[0]);
  } catch (error) {
    logger.error('Unexpected error in addStatement:', error);
    throw error;
  }
};

/**
 * Edits an existing gratitude statement using RPC function
 */
export const editStatement = async (
  entryDate: string,
  statementIndex: number,
  updatedStatement: string
): Promise<GratitudeEntry> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('edit_gratitude_statement', {
      p_user_id: user.id,
      p_entry_date: entryDate,
      p_statement_index: statementIndex,
      p_new_statement: updatedStatement.trim(),
    });

    if (error) {
      logger.error('Error editing gratitude statement:', error.message);
      throw new Error(`Failed to edit statement: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned from edit statement operation');
    }

    return gratitudeEntrySchema.parse(data[0]);
  } catch (error) {
    logger.error('Unexpected error in editStatement:', error);
    throw error;
  }
};

/**
 * Deletes a gratitude statement using RPC function
 */
export const deleteStatement = async (
  entryDate: string,
  statementIndex: number
): Promise<GratitudeEntry | null> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('delete_gratitude_statement', {
      p_user_id: user.id,
      p_entry_date: entryDate,
      p_statement_index: statementIndex,
    });

    if (error) {
      logger.error('Error deleting gratitude statement:', error.message);
      throw new Error(`Failed to delete statement: ${error.message}`);
    }

    // If no data is returned, the entire entry was deleted
    if (!data || data.length === 0) {
      return null;
    }

    return gratitudeEntrySchema.parse(data[0]);
  } catch (error) {
    logger.error('Unexpected error in deleteStatement:', error);
    throw error;
  }
};

/**
 * Gets entry dates for a specific month (for calendar view)
 */
export const getEntryDatesForMonth = async (year: number, month: number): Promise<string[]> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Format dates for PostgreSQL
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('gratitude_entries')
      .select('entry_date')
      .eq('user_id', user.id)
      .gte('entry_date', startDate)
      .lt('entry_date', endDate)
      .order('entry_date', { ascending: true });

    if (error) {
      logger.error('Error fetching entry dates for month:', error.message);
      throw new Error(`Failed to fetch entry dates: ${error.message}`);
    }

    return (data || []).map((entry) => entry.entry_date);
  } catch (error) {
    logger.error('Unexpected error in getEntryDatesForMonth:', error);
    throw error;
  }
};

/**
 * Gets total count of gratitude entries for user
 */
export const getTotalGratitudeEntriesCount = async (): Promise<number> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { count, error } = await supabase
      .from('gratitude_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      logger.error('Error fetching total entries count:', error.message);
      throw new Error(`Failed to fetch entries count: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    logger.error('Unexpected error in getTotalGratitudeEntriesCount:', error);
    throw error;
  }
};

/**
 * Gets a random gratitude entry for throwback feature
 */
export const getRandomGratitudeEntry = async (): Promise<GratitudeEntry | null> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('get_random_gratitude_entry', {
      p_user_id: user.id,
    });

    if (error) {
      logger.error('Error fetching random gratitude entry:', error.message);
      throw new Error(`Failed to fetch random entry: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return gratitudeEntrySchema.parse(data[0]);
  } catch (error) {
    logger.error('Unexpected error in getRandomGratitudeEntry:', error);
    throw error;
  }
};
```

## 💡 Prompts API (Varied Prompts System)

**File**: `src/api/promptApi.ts`

```typescript
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { dailyPromptSchema } from '@/schemas/promptSchema';
import type { DailyPrompt } from '@/types/prompt';

/**
 * Fetches a single random active daily prompt from the backend.
 * Used for varied prompts feature when enabled in user settings.
 */
export const getRandomActivePrompt = async (): Promise<DailyPrompt | null> => {
  try {
    const { data, error } = await supabase.rpc('get_random_active_prompt');

    if (error) {
      logger.error('Error fetching random active prompt:', error.message);
      throw new Error(`Failed to fetch random prompt: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logger.warn('No active prompts found in database');
      return null;
    }

    return dailyPromptSchema.parse(data[0]);
  } catch (error) {
    logger.error('Unexpected error in getRandomActivePrompt:', error);
    throw error;
  }
};

/**
 * Fetches multiple random active daily prompts from the backend.
 * Used for enhanced prompt experience with swipe navigation.
 */
export const getMultipleRandomActivePrompts = async (
  limit: number = 10
): Promise<DailyPrompt[]> => {
  try {
    // Fetch all active prompts first, then randomize in JavaScript
    // This avoids PostgreSQL random() function syntax issues
    const { data, error } = await supabase
      .from('daily_prompts')
      .select('id, prompt_text_tr, prompt_text_en, category')
      .eq('is_active', true);

    if (error) {
      logger.error('Error fetching multiple random active prompts:', error.message);
      throw new Error(`Failed to fetch multiple prompts: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logger.warn('No active prompts found in database');
      return [];
    }

    // Randomize using Fisher-Yates shuffle algorithm
    const shuffled = [...data];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return the requested number of prompts
    const selectedPrompts = shuffled.slice(0, Math.min(limit, shuffled.length));

    // Validate each prompt
    return selectedPrompts.map((prompt) => dailyPromptSchema.parse(prompt));
  } catch (error) {
    logger.error('Unexpected error in getMultipleRandomActivePrompts:', error);
    throw error;
  }
};

/**
 * Validates prompt data structure
 */
const validatePromptData = (data: any): DailyPrompt => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid prompt data structure');
  }

  if (!data.prompt_text_tr || typeof data.prompt_text_tr !== 'string') {
    throw new Error('Missing or invalid Turkish prompt text');
  }

  return dailyPromptSchema.parse(data);
};
```

### Enhanced Prompt API Examples

```typescript
// DailyPrompt data structure from database
interface DailyPrompt {
  id: string;
  promptTextTr: string; // Turkish text (required)
  promptTextEn?: string; // English text (optional)
  category?: string; // 'daily_life', 'relationships', 'growth', etc.
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Example API responses
const promptExamples = {
  // Basic daily prompt
  beginner: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    promptTextTr: 'Bugün seni mutlu eden küçük bir şey neydi?',
    promptTextEn: 'What small thing made you happy today?',
    category: 'daily_life',
    difficultyLevel: 'beginner',
    isActive: true,
    usageCount: 42,
    createdAt: '2024-01-10T09:00:00.000Z',
    updatedAt: '2024-01-20T14:30:00.000Z',
  },

  // Advanced reflection prompt
  advanced: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    promptTextTr: 'Hangi kaybın sana en çok öğretti?',
    promptTextEn: 'What loss taught you the most?',
    category: 'wisdom',
    difficultyLevel: 'advanced',
    isActive: true,
    usageCount: 8,
    createdAt: '2024-01-10T09:00:00.000Z',
    updatedAt: '2024-01-15T10:15:00.000Z',
  },
};

// Usage in components with user preference integration
const getPromptBasedOnUserSettings = async (profile: Profile): Promise<DailyPrompt | null> => {
  if (profile.useVariedPrompts) {
    // User has enabled varied prompts - fetch from database
    return await getRandomActivePrompt();
  } else {
    // User uses standard prompt - return default message
    return {
      id: 'default',
      promptTextTr: 'Bugün neye şükrediyorsun?',
      promptTextEn: 'What are you grateful for today?',
      category: 'standard',
      difficultyLevel: 'beginner',
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as DailyPrompt;
  }
};
```

## 📊 Streak API

**File**: `src/api/streakApi.ts`

```typescript
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import type { StreakData } from '@/types/streak';

/**
 * Fetches streak data for the authenticated user
 */
export const getStreakData = async (): Promise<StreakData> => {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase.rpc('calculate_user_streak', {
      p_user_id: user.id,
    });

    if (error) {
      logger.error('Error fetching streak data:', error.message);
      throw new Error(`Failed to fetch streak data: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // Return default streak data if no data found
      return {
        current_streak: 0,
        longest_streak: 0,
        total_entries: 0,
        streak_percentage: 0,
        last_entry_date: null,
      };
    }

    return data[0] as StreakData;
  } catch (error) {
    logger.error('Unexpected error in getStreakData:', error);
    throw error;
  }
};
```

## 💾 User Data Export API

**File**: `src/api/userDataApi.ts`

```typescript
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';

/**
 * Prepares user data for PDF export
 */
export const prepareUserExportFile = async (): Promise<{
  success: boolean;
  filePath?: string;
  filename?: string;
  message?: string;
}> => {
  try {
    // Fetch data from Supabase Edge Function
    const { data, error: invokeError } = await supabase.functions.invoke('export-user-data', {});

    if (invokeError || !data) {
      throw new Error('Failed to fetch user data');
    }

    // Create HTML template for PDF
    const htmlContent = createPDFTemplate(data);

    // Generate PDF from HTML
    const { uri: pdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      margins: { left: 20, top: 20, right: 20, bottom: 20 },
    });

    const filename = `yeser_export_${new Date().toISOString().split('T')[0]}.pdf`;
    const directory = FileSystem.cacheDirectory + 'exports/';
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const finalFileUri = directory + filename;

    // Move PDF to exports directory
    await FileSystem.moveAsync({ from: pdfUri, to: finalFileUri });

    return {
      success: true,
      filePath: finalFileUri,
      filename,
      message: 'PDF prepared successfully.',
    };
  } catch (error) {
    logger.error('Error preparing PDF export:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Shares the exported PDF file
 */
export const shareExportedFile = async (
  filePath: string,
  filename: string
): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle: `Paylaş: ${filename}`,
      UTI: Platform.OS === 'ios' ? 'com.adobe.pdf' : undefined,
    });

    return {
      success: true,
      message: 'PDF shared successfully',
    };
  } catch (error) {
    logger.error('Error sharing PDF file:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to share file',
    };
  }
};

/**
 * Creates beautifully formatted HTML template for PDF export
 * Includes user profile, statistics, and all gratitude entries organized by month
 */
const createPDFTemplate = (data: any): string => {
  // Template includes responsive design, Turkish localization,
  // grouped entries by month, statistics, and professional styling
  // (Full implementation in src/api/userDataApi.ts)
};
```

## 🔒 Error Handling Patterns

### Standardized Error Responses

```typescript
interface APIError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Error handling utility
export const handleAPIError = (error: any, operation: string): never => {
  logger.error(`API Error in ${operation}:`, error);

  if (error?.code === 'PGRST116') {
    throw new Error('Resource not found');
  }

  if (error?.status === 401) {
    throw new Error('Authentication required');
  }

  if (error?.status === 403) {
    throw new Error('Access denied');
  }

  throw new Error(error?.message || `Failed to ${operation}`);
};

// Usage in API functions
export const getProfile = async (): Promise<Profile | null> => {
  try {
    // ... API logic
  } catch (error) {
    handleAPIError(error, 'fetch profile');
  }
};
```

### Retry Logic

```typescript
// Retry configuration for TanStack Query
const retryConfig = {
  retry: (failureCount: number, error: any) => {
    // Don't retry on client errors
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }

    // Retry up to 3 times for server errors
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => {
    // Exponential backoff: 1s, 2s, 4s, 8s (max)
    return Math.min(1000 * 2 ** attemptIndex, 8000);
  },
};
```

## 🔄 Data Transformation

### Schema Validation

```typescript
// Example transformation with Zod
import { z } from 'zod';

const rawDataSchema = z.object({
  user_id: z.string(),
  entry_date: z.string(),
  statements: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
});

const appDataSchema = z.object({
  id: z.string(),
  userId: z.string(),
  entryDate: z.string(),
  statements: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Transform function
const transformData = (rawData: any) => {
  const validated = rawDataSchema.parse(rawData);

  return appDataSchema.parse({
    id: validated.user_id + '_' + validated.entry_date,
    userId: validated.user_id,
    entryDate: validated.entry_date,
    statements: validated.statements,
    createdAt: validated.created_at,
    updatedAt: validated.updated_at,
  });
};
```

## 🚀 Performance Optimizations

### 1. Query Deduplication

TanStack Query automatically deduplicates identical queries made within a short time window.

### 2. Background Refetching

```typescript
// Stale-while-revalidate pattern
export const useGratitudeEntry = (entryDate: string) => {
  return useQuery({
    queryKey: queryKeys.gratitudeEntry(user?.id, entryDate),
    queryFn: () => getGratitudeDailyEntryByDate(entryDate),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
};
```

### 3. Optimistic Updates

```typescript
// Optimistic mutation pattern
const addStatementMutation = useMutation({
  mutationFn: addStatement,
  onMutate: async ({ entryDate, statement }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: queryKeys.gratitudeEntry(user?.id, entryDate) });

    // Snapshot previous value
    const previousEntry = queryClient.getQueryData(queryKeys.gratitudeEntry(user?.id, entryDate));

    // Optimistically update
    queryClient.setQueryData(queryKeys.gratitudeEntry(user?.id, entryDate), (old) =>
      old ? { ...old, statements: [...old.statements, statement] } : null
    );

    return { previousEntry };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousEntry) {
      queryClient.setQueryData(
        queryKeys.gratitudeEntry(user?.id, variables.entryDate),
        context.previousEntry
      );
    }
  },
  onSettled: (data, error, variables) => {
    // Always refetch after error or success
    queryClient.invalidateQueries({
      queryKey: queryKeys.gratitudeEntry(user?.id, variables.entryDate),
    });
  },
});
```

## 🔮 Future API Enhancements

### Real-time Subscriptions

```typescript
// Future: Real-time updates with Supabase subscriptions
export const useGratitudeSubscription = (entryDate: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = supabase
      .from('gratitude_entries')
      .on('*', (payload) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.gratitudeEntry(payload.new.user_id, entryDate),
        });
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [entryDate]);
};
```

### Infinite Queries

```typescript
// Future: Infinite scrolling for large datasets
export const useInfiniteGratitudeEntries = () => {
  return useInfiniteQuery({
    queryKey: queryKeys.gratitudeEntries(),
    queryFn: ({ pageParam = 0 }) => getGratitudeEntries({ offset: pageParam }),
    getNextPageParam: (lastPage, pages) => (lastPage.length === 20 ? pages.length * 20 : undefined),
  });
};
```

## 🔐 Authentication API

**File**: `src/api/authApi.ts`

### Magic Link Authentication

```typescript
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';

/**
 * Sends a magic link to the user's email for passwordless authentication
 */
export const sendMagicLink = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Geçersiz e-posta adresi');
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: 'yeser://auth/callback',
        shouldCreateUser: true,
      },
    });

    if (error) {
      logger.error('Magic link error:', error.message);

      // Handle rate limiting
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          message: 'Çok fazla deneme yaptınız. Lütfen bir süre bekleyip tekrar deneyin.',
        };
      }

      return {
        success: false,
        message: 'E-posta gönderilirken bir hata oluştu. Lütfen tekrar deneyin.',
      };
    }

    return {
      success: true,
      message: 'Magic link e-posta adresinize gönderildi. E-postanızı kontrol edin.',
    };
  } catch (error) {
    logger.error('Unexpected error in sendMagicLink:', error);
    return {
      success: false,
      message: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    };
  }
};

/**
 * Handles magic link confirmation from deep link
 */
export const confirmMagicLink = async (
  accessToken: string,
  refreshToken: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      logger.error('Magic link confirmation error:', error.message);
      return {
        success: false,
        error: 'Giriş bağlantısı geçersiz veya süresi dolmuş. Yeni bir bağlantı isteyin.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Kullanıcı bilgileri alınamadı.',
      };
    }

    logger.info('Magic link authentication successful');
    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    logger.error('Unexpected error in confirmMagicLink:', error);
    return {
      success: false,
      error: 'Beklenmeyen bir hata oluştu.',
    };
  }
};

/**
 * Handles Google OAuth authentication
 */
export const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'yeser://auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      logger.error('Google OAuth error:', error.message);
      return {
        success: false,
        error: 'Google ile giriş yapılırken bir hata oluştu.',
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in signInWithGoogle:', error);
    return {
      success: false,
      error: 'Beklenmeyen bir hata oluştu.',
    };
  }
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Sign out error:', error.message);
      return {
        success: false,
        error: 'Çıkış yapılırken bir hata oluştu.',
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('Unexpected error in signOut:', error);
    return {
      success: false,
      error: 'Beklenmeyen bir hata oluştu.',
    };
  }
};
```

### Deep Link Handler

**File**: `src/api/deepLinkApi.ts`

```typescript
import * as Linking from 'expo-linking';
import { logger } from '@/utils/debugConfig';

/**
 * Extracts authentication tokens from deep link URL
 */
export const extractTokensFromUrl = (
  url: string
): {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
} => {
  try {
    logger.debug('Processing deep link URL:', url);

    const parsed = Linking.parse(url);
    const { queryParams } = parsed;

    if (!queryParams) {
      logger.warn('No query parameters found in URL');
      return { error: 'URL parametreleri bulunamadı' };
    }

    // Extract tokens from various possible parameter names
    const accessToken =
      queryParams.access_token || queryParams.accessToken || queryParams['access-token'];

    const refreshToken =
      queryParams.refresh_token || queryParams.refreshToken || queryParams['refresh-token'];

    if (!accessToken || !refreshToken) {
      logger.warn('Missing tokens in URL:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
      });
      return { error: 'Kimlik doğrulama bilgileri eksik' };
    }

    logger.info('Successfully extracted tokens from URL');
    return {
      accessToken: accessToken as string,
      refreshToken: refreshToken as string,
    };
  } catch (error) {
    logger.error('Error extracting tokens from URL:', error);
    return { error: 'URL işlenirken hata oluştu' };
  }
};

/**
 * Validates deep link URL format
 */
export const isValidAuthUrl = (url: string): boolean => {
  try {
    const parsed = Linking.parse(url);
    return parsed.hostname === 'auth' && parsed.path === '/callback';
  } catch {
    return false;
  }
};
```

### Authentication Hook Integration

```typescript
// Example usage in hooks
export const useAuthMutations = () => {
  const queryClient = useQueryClient();

  const magicLinkMutation = useMutation({
    mutationFn: sendMagicLink,
    onSuccess: (result) => {
      if (result.success) {
        // Track analytics
        logger.info('Magic link sent successfully');
      }
    },
    onError: (error) => {
      logger.error('Magic link mutation error:', error);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: ({ accessToken, refreshToken }) => confirmMagicLink(accessToken, refreshToken),
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate all queries to refetch with new auth
        queryClient.invalidateQueries();
      }
    },
  });

  return {
    sendMagicLink: magicLinkMutation.mutate,
    confirmMagicLink: confirmMutation.mutate,
    isLoading: magicLinkMutation.isPending || confirmMutation.isPending,
  };
};
```

---

This enhanced API architecture provides a **robust, type-safe, and secure** foundation for the Yeşer gratitude app, with **passwordless authentication**, intelligent caching, optimistic updates, and comprehensive error handling through TanStack Query v5.80.2 integration.
