# 03: API & Database

The data layer is the foundation of Yeşer, consisting of a Supabase PostgreSQL database and a type-safe API layer that communicates with it. This setup is designed for security, performance, and scalability.

## 1. Supabase & PostgreSQL

We use Supabase as our Backend-as-a-Service (BaaS) provider. It gives us a powerful PostgreSQL database, authentication, and auto-generated APIs, all of which are secured with Row Level Security (RLS).

### Database Schema

Our database schema is normalized and optimized for the queries our application needs to make. Performance is enhanced through the strategic use of indexes.

#### `profiles` Table

Stores user-specific data and preferences. Linked one-to-one with `auth.users`.

- `id` (UUID, PK, FK to `auth.users.id`)
- `email`, `full_name`, `avatar_url`, `username`
- `onboarded` (boolean)
- `daily_gratitude_goal` (integer)
- Notification settings (`reminder_enabled`, `reminder_time`, etc.)
- `use_varied_prompts` (boolean)

#### `gratitude_entries` Table

The core table for the journaling feature.

- `id` (UUID, PK)
- `user_id` (UUID, FK to `auth.users.id`)
- `entry_date` (date)
- `statements` (jsonb): An array of strings, e.g., `["I am grateful for...", "Today was great because..."]`. Using JSONB is flexible and performant.
- `word_count` (integer, generated column)
- **Constraint**: `unique_user_date` ensures a user can only have one entry per day.

#### `streaks` Table

Stores calculated streak data to avoid expensive computations on the client.

- `user_id` (UUID, PK, FK to `auth.users.id`)
- `current_streak`, `longest_streak`, `total_entries` (integers)
- `last_entry_date` (date)

#### `daily_prompts` & `gratitude_benefits`

These tables store public, read-only content for the varied prompts and educational features. They are accessible to all users but can only be modified by administrators.

### Row Level Security (RLS)

**RLS is our primary data security mechanism and it is enabled on all tables.**

- **Isolation**: Policies ensure that users can **only** read, write, update, and delete their own data. A query for `gratitude_entries` will automatically be filtered to the currently logged-in user's `user_id` at the database level.
- **Default Deny**: Supabase's RLS is "default deny." If no policy allows an operation, it is forbidden.
- **Example Policy**:
  ```sql
  -- On the gratitude_entries table
  CREATE POLICY "Users can read own gratitude entries"
  ON gratitude_entries FOR SELECT
  USING (auth.uid() = user_id);
  ```

> **Note on Schema Detail**: For the sake of brevity, the full SQL definitions for tables, indexes, and RLS policies are not included here. The authoritative source for the database schema can be found in the Supabase dashboard or in the project's database migration files.

### RPC Functions (Stored Procedures)

For complex or transactional operations, we use PostgreSQL functions, which can be called as Remote Procedure Calls (RPCs) via the Supabase client. This is a critical pattern for several reasons:

- **Atomicity**: Operations like adding a statement and updating a user's streak can be performed as a single, atomic transaction.
- **Performance**: It reduces the number of network round-trips between the client and the database.
- **Security**: The logic is defined once in a secure environment, rather than being replicated on the client.

Key RPCs include:

- `add_gratitude_statement(...)`: Atomically adds a new statement to an entry, creating the entry if it doesn't exist.
- `calculate_user_streak(...)`: Computes and updates a user's streak data.
- `get_random_gratitude_entry(...)`: Selects a random past entry for the "Throwback" feature.

## 2. API Layer

The API layer, located in `src/api/`, consists of a set of files that act as type-safe wrappers around the Supabase client. They abstract away the direct database calls and provide a clean interface for the rest of the application (primarily the TanStack Query hooks).

### `queryClient.ts`

Configures the global TanStack Query client with app-specific defaults for caching, retries, and logging. It also sets up the `onlineManager` to be aware of the device's network status.

### `queryKeys.ts` & Cache Invalidation

A crucial file that exports a `queryKeys` factory. This provides a centralized, hierarchical, and type-safe way to generate keys for all queries and mutations. The hierarchical nature of these keys is fundamental to our state management strategy.

- **Structure**: `queryKeys.gratitudeEntries('userId')` generates a key like `['yeser', 'gratitudeEntries', 'userId']`. A query for a single entry would be `['yeser', 'gratitudeEntries', 'userId', { entryDate: '2024-01-01' }]`.
- **Invalidation**: This hierarchy allows for powerful, granular cache invalidation. After a user adds a statement, we can call `queryClient.invalidateQueries({ queryKey: queryKeys.gratitudeEntries(userId) })`. This single command will intelligently mark _all_ queries whose keys start with that path as stale, including queries for entry lists, specific entries, and streak counts, causing them all to be refetched automatically.

### API Function Files (`gratitudeApi.ts`, `
