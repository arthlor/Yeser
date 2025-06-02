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

### 4.1. `update_updated_at_column()` and `moddatetime()` Functions

Two primary mechanisms are used for automatically updating `updated_at` timestamps:

*   **`update_updated_at_column()`:** A generic PL/pgSQL function used by `gratitude_entries` and `streaks` tables.

This utility function automatically updates the `updated_at` timestamp for a row whenever it's modified.

```sql
```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

*   **`moddatetime()`:** A C-language extension function used by the `profiles` table. It's typically enabled via `CREATE EXTENSION IF NOT EXISTS moddatetime;` and then used in a trigger definition like `EXECUTE FUNCTION moddatetime('updated_at');`.
```

### 4.2. `profiles` Table

Stores public and app-specific user data, linked to `auth.users`.

```sql
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NULL,
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_time time without time zone NOT NULL DEFAULT '20:00:00'::time without time zone,
  onboarded boolean NOT NULL DEFAULT false,
  throwback_reminder_enabled boolean NOT NULL DEFAULT true,
  throwback_reminder_frequency text NOT NULL DEFAULT 'weekly'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

COMMENT ON COLUMN public.profiles.username IS 'User-chosen display name, can be optional.';
COMMENT ON COLUMN public.profiles.onboarded IS 'Tracks if user completed the initial onboarding flow.';

-- Trigger to automatically update `updated_at` timestamp (using moddatetime extension)
-- CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
-- (Actual trigger definition listed in the 'Database Triggers' section below)
```

### 4.3. `gratitude_entries` Table

Stores individual gratitude entries submitted by users.

```sql
CREATE TABLE public.gratitude_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT gratitude_entries_pkey PRIMARY KEY (id),
  CONSTRAINT unique_user_entry_date UNIQUE (user_id, entry_date),
  CONSTRAINT gratitude_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

COMMENT ON COLUMN public.gratitude_entries.user_id IS 'Foreign key to the user who owns this entry.';
COMMENT ON COLUMN public.gratitude_entries.statements IS 'JSONB array of gratitude statements for the entry date.';
COMMENT ON COLUMN public.gratitude_entries.entry_date IS 'The date for which the entry was made.';

-- Indexes for optimizing queries
CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user_id ON public.gratitude_entries USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user_id_entry_date ON public.gratitude_entries USING btree (user_id, entry_date) TABLESPACE pg_default;

-- Trigger to automatically update `updated_at` timestamp
-- CREATE TRIGGER handle_gratitude_entries_update_updated_at BEFORE UPDATE ON public.gratitude_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- (Actual trigger definition listed in the 'Database Triggers' section below)
```

### 4.4. `streaks` Table

Stores data related to user engagement streaks.

```sql
CREATE TABLE public.streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  user_id uuid NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_entry_date date NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT streaks_pkey PRIMARY KEY (id),
  CONSTRAINT streaks_user_id_key UNIQUE (user_id),
  CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON public.streaks USING btree (user_id) TABLESPACE pg_default;

-- Trigger to automatically update `updated_at` timestamp
-- CREATE TRIGGER handle_streaks_update_updated_at BEFORE UPDATE ON public.streaks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- (Actual trigger definition listed in the 'Database Triggers' section below)
```

### 4.5. `handle_new_user()` Function & Trigger

This function is triggered after a new user is created in `auth.users` to automatically create a corresponding profile in `public.profiles`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username'); -- Username can be adapted
  -- Also initialize a streak record for the new user
  INSERT INTO public.streaks (user_id)
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
-- (Users can manage their own entries as previously defined)

-- RLS Policies for `streaks` table
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own streak data." 
  ON public.streaks FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT, UPDATE, DELETE policies for users on `streaks` table directly.
-- Streak data is managed by the `update_user_streak` function triggered by changes to `gratitude_entries`.
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

These PostgreSQL functions are exposed via the Supabase API and can be called from the client application. They encapsulate business logic and complex data operations.

### 6.1. `add_gratitude_statement(p_entry_date DATE, p_statement TEXT)`

Adds a new gratitude statement to a user's entry for a given date. If an entry for that date doesn't exist, it creates one. If it exists, it appends the new statement to the existing `statements` JSONB array.

```sql
CREATE OR REPLACE FUNCTION public.add_gratitude_statement(p_entry_date date, p_statement text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS
$function$
BEGIN
    INSERT INTO public.gratitude_entries (user_id, entry_date, statements, created_at, updated_at)
    VALUES (auth.uid(), p_entry_date, jsonb_build_array(p_statement::TEXT), NOW(), NOW())
    ON CONFLICT (user_id, entry_date)
    DO UPDATE SET
        statements = public.gratitude_entries.statements || jsonb_build_array(p_statement::TEXT);
END;
$function$;
```

### 6.2. `edit_gratitude_statement(p_entry_date DATE, p_statement_index INTEGER, p_updated_statement TEXT)`

Updates an existing gratitude statement at a specific index within the `statements` array for a given entry date.

```sql
CREATE OR REPLACE FUNCTION public.edit_gratitude_statement(p_entry_date date, p_statement_index integer, p_updated_statement text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS
$function$
BEGIN
    UPDATE public.gratitude_entries
    SET statements = jsonb_set(statements, ARRAY[p_statement_index]::TEXT[], to_jsonb(p_updated_statement::TEXT))
    WHERE user_id = auth.uid() AND entry_date = p_entry_date;
END;
$function$;
```

### 6.3. `delete_gratitude_statement(p_entry_date DATE, p_statement_index INTEGER)`

Deletes a gratitude statement at a specific index. If deleting the statement results in an empty `statements` array, the entire `gratitude_entries` row for that date is deleted.

```sql
CREATE OR REPLACE FUNCTION public.delete_gratitude_statement(p_entry_date date, p_statement_index integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS
$function$
DECLARE
  updated_statements JSONB;
BEGIN
    UPDATE public.gratitude_entries
    SET statements = statements - p_statement_index
    WHERE user_id = auth.uid() AND entry_date = p_entry_date
    RETURNING statements INTO updated_statements;

    IF jsonb_array_length(updated_statements) = 0 THEN
        DELETE FROM public.gratitude_entries
        WHERE user_id = auth.uid() AND entry_date = p_entry_date;
    END IF;
END;
$function$;
```

### 6.4. `get_random_gratitude_entry(p_user_id UUID)`

Fetches a single random gratitude entry for the specified user.

```sql
CREATE OR REPLACE FUNCTION public.get_random_gratitude_entry(p_user_id uuid)
RETURNS SETOF gratitude_entries LANGUAGE sql STABLE AS
$function$
  SELECT *
  FROM public.gratitude_entries
  WHERE user_id = p_user_id
  ORDER BY random()
  LIMIT 1;
$function$;
```

### 6.5. `get_entry_dates_for_month(p_user_id UUID, p_year INTEGER, p_month INTEGER)`

Returns a list of distinct dates for which a user has gratitude entries within a specific month and year.

```sql
CREATE OR REPLACE FUNCTION public.get_entry_dates_for_month(p_user_id uuid, p_year integer, p_month integer)
RETURNS SETOF date LANGUAGE plpgsql AS
$function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT entry_date
    FROM public.gratitude_entries
    WHERE user_id = p_user_id
      AND EXTRACT(YEAR FROM entry_date) = p_year
      AND EXTRACT(MONTH FROM entry_date) = p_month
    ORDER BY entry_date ASC;
END;
$function$;
```

### 6.6. `calculate_streak(p_user_id UUID)`

These PostgreSQL functions are exposed via the Supabase API and can be called from the client application.

Calculates a user's consecutive daily gratitude entry streak.

```sql
CREATE OR REPLACE FUNCTION public.calculate_streak(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql AS 
$function$
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

        IF last_entry_date IS NULL THEN
            IF current_processing_date = CURRENT_DATE OR current_processing_date = (CURRENT_DATE - INTERVAL '1 day') THEN
                streak := 1;
                last_entry_date := current_processing_date;
            ELSE
                RETURN 0;
            END IF;
        ELSIF current_processing_date = (last_entry_date - INTERVAL '1 day') THEN
            streak := streak + 1;
            last_entry_date := current_processing_date;
        ELSE
            RETURN streak;
        END IF;
    END LOOP;

    IF streak = 1 AND NOT (last_entry_date = CURRENT_DATE OR last_entry_date = (CURRENT_DATE - INTERVAL '1 day')) THEN
      RETURN 0;
    END IF;

    RETURN streak;
END;
$function$;
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

