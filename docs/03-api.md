# API Documentation

This document provides comprehensive documentation for the API layer in the Yeser gratitude app, built with TanStack Query v5.80.2 for intelligent server state management.

## 🌐 API Architecture Overview

The Yeser app uses a modern API architecture with:

- **Supabase Backend**: PostgreSQL database with Row Level Security (RLS)
- **TanStack Query v5.80.2**: Intelligent caching, background sync, optimistic updates
- **Type-Safe APIs**: Full TypeScript integration with Zod validation
- **Feature-Based Organization**: APIs organized by domain (auth, gratitude, settings, etc.)

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

## 📁 API Structure

```
src/api/
├── queryClient.ts          # TanStack Query client configuration
├── queryKeys.ts           # Centralized query key factory
├── gratitudeApi.ts        # Gratitude CRUD operations
├── profileApi.ts          # User profile management with notifications
├── promptApi.ts           # Daily prompts with varied prompts support
├── streakApi.ts           # Streak calculations and analytics
├── userDataApi.ts         # Data export functionality
└── authApi.ts            # Authentication helpers (if needed)
```

## 🔧 Query Client Configuration

**File**: `src/api/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { logger } from '@/utils/debugConfig';

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
    },
  },
  logger: {
    log: logger.debug,
    warn: logger.warn,
    error: logger.error,
  },
});
```

## 🗂️ Query Key Factory

**File**: `src/api/queryKeys.ts`

```typescript
/**
 * Centralized query key factory for TanStack Query
 * Hierarchical structure for intelligent cache invalidation
 */
export const queryKeys = {
  // Root key for global invalidation
  all: ['yeser'] as const,

  // User profile queries
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

  // Daily prompt queries
  currentPrompt: (userId?: string) => [...queryKeys.all, 'currentPrompt', userId] as const,
  multiplePrompts: (userId?: string, limit?: number) =>
    [...queryKeys.all, 'multiplePrompts', userId, limit] as const,
} as const;

// Query key utilities for cache management
export const queryKeyHelpers = {
  // Invalidate all user data
  invalidateUserData: (userId: string) => [
    queryKeys.profile(userId),
    queryKeys.gratitudeEntries(userId),
    queryKeys.streaks(userId),
  ],

  // Invalidate entry-related data
  invalidateEntryData: (userId: string, entryDate?: string) =>
    [
      queryKeys.gratitudeEntries(userId),
      entryDate ? queryKeys.gratitudeEntry(userId, entryDate) : null,
      queryKeys.streaks(userId),
      queryKeys.gratitudeTotalCount(userId),
    ].filter(Boolean),
};
```

## 👤 Profile API

**File**: `src/api/profileApi.ts`

### Core Functions

```typescript
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import { rawProfileDataSchema, profileSchema, updateProfileSchema } from '@/schemas/profileSchema';
import type { Profile, RawProfileData } from '@/types/profile';

/**
 * Fetches the authenticated user's profile with notification settings
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
        created_at,
        updated_at
      `
      )
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching profile:', error.message);
      throw new Error(`Profile fetch failed: ${error.message}`);
    }

    if (!data) {
      logger.warn('No profile found for user');
      return null;
    }

    // Transform and validate the raw data
    return mapAndValidateRawProfile(data as RawProfileData);
  } catch (error) {
    logger.error('Unexpected error in getProfile:', error);
    throw error;
  }
};

/**
 * Updates user profile with notification and varied prompts settings
 */
export const updateProfile = async (updates: Partial<Profile>): Promise<Profile> => {
  try {
    // Validate updates
    const validatedUpdates = updateProfileSchema.parse(updates);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Transform camelCase to snake_case for Supabase
    const payloadForSupabase: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Map all possible update fields
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
        created_at,
        updated_at
      `
      )
      .single();

    if (error) {
      logger.error('Error updating profile:', error.message);
      throw new Error(`Profile update failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from profile update');
    }

    return mapAndValidateRawProfile(data as RawProfileData);
  } catch (error) {
    logger.error('Unexpected error in updateProfile:', error);
    throw error;
  }
};

/**
 * Maps and validates raw profile data from Supabase to app format
 */
const mapAndValidateRawProfile = (validatedRawData: RawProfileData): Profile => {
  // Map DB's updated_at to created_at for Zod schema compatibility
  const dataForZod = {
    ...validatedRawData,
    created_at: validatedRawData.updated_at,
    // Map snake_case database field to camelCase app field
    useVariedPrompts: validatedRawData.use_varied_prompts,
  };

  // Remove the snake_case field to avoid conflicts
  delete (dataForZod as any).use_varied_prompts;

  return profileSchema.parse(dataForZod);
};
```

### Enhanced Profile API Examples

```typescript
// Complete profile data structure from API
interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  onboarded: boolean;

  // Gratitude preferences
  dailyGratitudeGoal: number;

  // Daily reminder settings
  reminderEnabled: boolean;
  reminderTime: string; // HH:MM:SS format

  // Enhanced throwback reminder system
  throwbackReminderEnabled: boolean;
  throwbackReminderFrequency: 'disabled' | 'daily' | 'weekly' | 'monthly';
  throwbackReminderTime: string; // HH:MM:SS format

  // Varied prompts system
  useVariedPrompts: boolean; // Database prompts vs standard message

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Example API responses
const profileExamples = {
  // Basic profile with default settings
  basic: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    fullName: 'John Doe',
    avatarUrl: null,
    username: 'johndoe',
    onboarded: true,
    dailyGratitudeGoal: 3,
    reminderEnabled: true,
    reminderTime: '20:00:00',
    throwbackReminderEnabled: true,
    throwbackReminderFrequency: 'weekly',
    throwbackReminderTime: '10:00:00',
    useVariedPrompts: false,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  },

  // Advanced user with comprehensive settings
  advanced: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'advanced@example.com',
    fullName: 'Jane Smith',
    avatarUrl: 'https://example.com/avatar.jpg',
    username: 'janesmith',
    onboarded: true,
    dailyGratitudeGoal: 5,
    reminderEnabled: true,
    reminderTime: '08:30:00',
    throwbackReminderEnabled: true,
    throwbackReminderFrequency: 'daily',
    throwbackReminderTime: '19:00:00',
    useVariedPrompts: true, // Using database prompts
    createdAt: '2024-01-10T09:15:00.000Z',
    updatedAt: '2024-01-20T14:22:00.000Z',
  },
};
```

````

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    return (data || []).map(entry => gratitudeEntrySchema.parse(entry));
  } catch (error) {
    logger.error('Unexpected error in getGratitudeDailyEntries:', error);
    throw error;
  }
};

/**
 * Fetches a single gratitude entry by date
 */
export const getGratitudeDailyEntryByDate = async (entryDate: string): Promise<GratitudeEntry | null> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
export const addStatement = async (entryDate: string, statement: string): Promise<GratitudeEntry> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    return (data || []).map(entry => entry.entry_date);
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
````

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

````

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();

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
````

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

---

This API architecture provides a **robust, type-safe, and performant** foundation for the Yeser gratitude app, with intelligent caching, optimistic updates, and comprehensive error handling through TanStack Query v5.80.2 integration.
