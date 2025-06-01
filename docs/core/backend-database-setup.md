# Yeşer - Backend & Database Setup (Supabase)

## 1. Introduction

Yeşer leverages Supabase as its Backend-as-a-Service (BaaS) provider. This includes:
*   **Authentication:** Secure user sign-up, login (email/password, Google OAuth), and session management.
*   **Database:** A PostgreSQL database for storing user profiles and gratitude entries.
*   **APIs:** Auto-generated RESTful APIs and GraphQL support for data interaction.
*   **Storage:** For potential future use cases like user-uploaded content (not currently implemented).
*   **Edge Functions:** Serverless functions for custom backend logic (RPCs are primarily used for database-centric operations).

This document details the database schema, Row Level Security (RLS) policies, triggers, and custom database functions.

## 2. Supabase Project Configuration

*   The Supabase project URL and anonymous (public) key are stored in the `.env` file at the root of the Yeşer project:
    ```
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
*   These variables are loaded into the application via `expo-constants` and used to initialize the Supabase client (`src/api/supabaseClient.ts`).
*   Ensure this `.env` file is included in `.gitignore` and variables are set up in EAS Build secrets for production builds.

## 3. Authentication Setup

*   Supabase Auth handles user authentication.
*   A trigger (`on_auth_user_created`) automatically creates a corresponding user profile in the `public.profiles` table when a new user signs up in `auth.users`.

## 4. Database Schema (`public` schema)

### 4.1. `handle_updated_at()` Function

This utility function automatically updates the `updated_at` timestamp for a row whenever it's modified.

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2. `profiles` Table

Stores public and app-specific user data, linked to `auth.users`.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NULLABLE,
  onboarded BOOLEAN DEFAULT FALSE NOT NULL,
  reminder_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  reminder_time TIME DEFAULT '09:00:00' NOT NULL, -- User's preferred reminder time
  throwback_reminder_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  throwback_reminder_frequency TEXT DEFAULT 'weekly' NOT NULL, -- e.g., 'daily', 'weekly', 'monthly'
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.profiles.username IS 'User-chosen display name, can be optional.';
COMMENT ON COLUMN public.profiles.onboarded IS 'Tracks if user completed the initial onboarding flow.';

-- Trigger to automatically update `updated_at` timestamp
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### 4.3. `gratitude_entries` Table

Stores individual gratitude entries submitted by users.

```sql
CREATE TABLE public.gratitude_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_text TEXT NOT NULL CHECK (char_length(entry_text) > 0),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Allows back-logging and precise date for entries
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.gratitude_entries.user_id IS 'Foreign key to the user who owns this entry.';
COMMENT ON COLUMN public.gratitude_entries.entry_text IS 'The content of the gratitude entry.';
COMMENT ON COLUMN public.gratitude_entries.entry_date IS 'The date for which the entry was made.';

-- Index for optimizing queries by user and entry date (e.g., fetching entries for display, streak calculation)
CREATE INDEX idx_gratitude_entries_user_id_entry_date ON public.gratitude_entries(user_id, entry_date DESC);

-- Trigger to automatically update `updated_at` timestamp
CREATE TRIGGER set_gratitude_entries_updated_at
  BEFORE UPDATE ON public.gratitude_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

### 4.4. `handle_new_user()` Function & Trigger

This function is triggered after a new user is created in `auth.users` to automatically create a corresponding profile in `public.profiles`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) -- Username can be populated later by the user
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute `handle_new_user` after a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 5. Row Level Security (RLS)

RLS is enabled on all user-specific tables to ensure users can only access and modify their own data.

```sql
-- Enable RLS for tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for `profiles` table
CREATE POLICY "Users can read their own profile." 
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- RLS Policies for `gratitude_entries` table
CREATE POLICY "Users can read their own gratitude entries." 
  ON public.gratitude_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gratitude entries." 
  ON public.gratitude_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gratitude entries." 
  ON public.gratitude_entries FOR UPDATE
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gratitude entries." 
  ON public.gratitude_entries FOR DELETE
  USING (auth.uid() = user_id);
```

## 6. Database Functions (Remote Procedure Calls - RPCs)

These PostgreSQL functions are exposed via the Supabase API and can be called from the client application.

### 6.1. `calculate_streak(p_user_id UUID)`

Calculates a user's consecutive daily gratitude entry streak.

```sql
CREATE OR REPLACE FUNCTION public.calculate_streak(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    streak INT;
    last_entry_date DATE;
    current_processing_date DATE;
    entry_dates RECORD;
BEGIN
    streak := 0;
    last_entry_date := NULL;

    FOR entry_dates IN
        SELECT DISTINCT entry_date
        FROM public.gratitude_entries
        WHERE user_id = p_user_id
        ORDER BY entry_date DESC
    LOOP
        current_processing_date := entry_dates.entry_date;

        IF last_entry_date IS NULL THEN -- First entry in the loop (most recent)
            IF current_processing_date = CURRENT_DATE OR current_processing_date = (CURRENT_DATE - INTERVAL '1 day') THEN
                streak := 1;
                last_entry_date := current_processing_date;
            ELSE
                -- If the most recent entry is older than yesterday, streak is 0
                RETURN 0;
            END IF;
        ELSIF current_processing_date = (last_entry_date - INTERVAL '1 day') THEN -- Consecutive day
            streak := streak + 1;
            last_entry_date := current_processing_date;
        ELSE
            -- Gap detected, streak broken
            RETURN streak;
        END IF;
    END LOOP;
    
    -- If loop completes, the calculated streak is correct.
    -- Handle cases like no entries (streak = 0) or only one entry (streak = 1 if today/yesterday, else 0).
    RETURN COALESCE(streak, 0);
END;
$$ LANGUAGE plpgsql STABLE;
```

### 6.2. `get_random_gratitude_entry(p_user_id UUID)`

Returns a single random past gratitude entry for the specified user. Used for the "Throwback" feature.

```sql
CREATE OR REPLACE FUNCTION public.get_random_gratitude_entry(p_user_id UUID)
RETURNS SETOF public.gratitude_entries AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.gratitude_entries
    WHERE user_id = p_user_id
    ORDER BY random()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 6.3. `get_entry_dates_for_month(p_user_id UUID, p_year INT, p_month INT)`

Returns a list of distinct dates within a given month and year for which the user has gratitude entries. Used for highlighting days in the calendar view.

```sql
CREATE OR REPLACE FUNCTION public.get_entry_dates_for_month(p_user_id UUID, p_year INT, p_month INT)
RETURNS SETOF DATE AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT entry_date
    FROM public.gratitude_entries
    WHERE user_id = p_user_id
      AND EXTRACT(YEAR FROM entry_date) = p_year
      AND EXTRACT(MONTH FROM entry_date) = p_month
    ORDER BY entry_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;
```

## 7. Supabase Storage

Supabase Storage is available for file storage needs (e.g., user avatars, image attachments for entries). Currently, Yeşer does not implement features requiring Supabase Storage, but it is a readily available option for future enhancements.

## 8. Supabase Edge Functions (Deno)

While complex database queries and business logic directly related to data manipulation are primarily handled using PostgreSQL functions (RPCs) for performance and atomicity, Supabase Edge Functions (written in Deno/TypeScript) can be used for more complex, potentially longer-running server-side tasks that might involve integrating with third-party APIs or performing operations not suitable for database functions.

*   **Conceptual Example:** An `export-user-data` Edge Function could be developed to allow users to download all their data in JSON or CSV format. This function would query the database (respecting RLS or using a service role key if necessary for batch operations), format the data, and then provide it as a downloadable file.

Currently, no custom Deno Edge Functions are deployed for Yeşer beyond the RPCs listed above.

