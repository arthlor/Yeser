# Database Documentation

This document provides comprehensive documentation for the Supabase database schema, RPC functions, security policies, and data architecture used in the Yeser gratitude app with **TanStack Query v5.80.2** integration.

## 🗄️ Database Overview

### Technology Stack

- **Database**: PostgreSQL 15 (via Supabase)
- **State Management**: TanStack Query v5.80.2 (server state) + Zustand (client state)
- **ORM**: Direct SQL with Supabase client + TanStack Query intelligent caching
- **Authentication**: Supabase Auth with session management
- **Security**: Row Level Security (RLS) with authenticated queries
- **Real-time**: Supabase Realtime (WebSockets) - ready for future integration
- **Caching**: Intelligent TanStack Query cache with background sync

### Modern Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Components  │  │TanStack Qry │  │   Zustand   │     │
│  │   (UI)      │  │  v5.80.2    │  │ (Client St.)│     │
│  │             │  │(Server St.) │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    API LAYER                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ API         │  │   Query     │  │ Intelligent │     │
│  │ Functions   │  │    Keys     │  │   Caching   │     │
│  │ (src/api/)  │  │  Factory    │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                  SUPABASE LAYER                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ PostgreSQL  │  │     RPC     │  │ Row Level   │     │
│  │  Database   │  │ Functions   │  │  Security   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Database Schema Overview

```
Supabase Database
├── Auth Schema (auth.*)          # Built-in authentication
│   ├── users                     # User accounts
│   ├── sessions                  # User sessions
│   └── refresh_tokens           # Refresh tokens
├── Public Schema (public.*)      # Application data
│   ├── profiles                  # User profiles & comprehensive preferences
│   │   ├── notification settings # Daily & throwback reminders
│   │   ├── varied prompts        # Enhanced prompt system
│   │   └── gratitude goals      # Daily targets
│   ├── gratitude_entries        # Daily gratitude entries with JSONB
│   ├── streaks                   # Streak calculations & analytics
│   └── daily_prompts            # Varied prompts database (✅ WORKING)
└── RPC Functions                 # Server-side business logic
    ├── Gratitude Operations      # CRUD with optimistic updates
    ├── Streak Calculations       # Real-time streak tracking
    ├── Prompt Management         # Random prompt selection
    └── Data Export              # User data export functionality
```

## 📊 Enhanced Table Schemas

### profiles (Enhanced with Notification System)

User profile and comprehensive preference data with notification settings.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  username TEXT,
  onboarded BOOLEAN DEFAULT FALSE,

  -- Daily reminder settings
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_time TEXT DEFAULT '20:00:00'
    CHECK (reminder_time ~ '^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$'),

  -- Throwback reminder settings (ENHANCED)
  throwback_reminder_enabled BOOLEAN DEFAULT TRUE,
  throwback_reminder_frequency TEXT DEFAULT 'weekly'
    CHECK (throwback_reminder_frequency IN ('disabled', 'daily', 'weekly', 'monthly')),
  throwback_reminder_time TEXT DEFAULT '10:00:00'
    CHECK (throwback_reminder_time ~ '^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$'),

  -- Gratitude settings
  daily_gratitude_goal INTEGER DEFAULT 3 CHECK (daily_gratitude_goal > 0 AND daily_gratitude_goal <= 10),

  -- Varied prompts system (✅ FULLY FUNCTIONAL)
  use_varied_prompts BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_onboarded ON profiles(onboarded);
CREATE INDEX idx_profiles_reminder_enabled ON profiles(reminder_enabled);
CREATE INDEX idx_profiles_varied_prompts ON profiles(use_varied_prompts);

-- Updated_at trigger for automatic timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Enhanced Field Descriptions:**

- `id`: UUID matching auth.users.id (Primary Key)
- `email`: User email from auth
- `full_name`: Display name for the user
- `avatar_url`: Profile picture URL
- `username`: Unique username (optional)
- `onboarded`: Whether user completed onboarding flow
- `reminder_enabled`: Daily reminder notification preference
- `reminder_time`: Time for daily reminders (HH:MM:SS format)
- `throwback_reminder_enabled`: Enable throwback memories feature
- `throwback_reminder_frequency`: How often to show throwbacks (`disabled`, `daily`, `weekly`, `monthly`)
- `throwback_reminder_time`: Time for throwback reminders (HH:MM:SS format)
- `daily_gratitude_goal`: Target number of statements per day (1-10)
- `use_varied_prompts`: **✅ WORKING** - Use random database prompts vs default message

### gratitude_entries (Optimized for TanStack Query)

Daily gratitude entries with statements stored as JSONB array, optimized for intelligent caching.

```sql
CREATE TABLE gratitude_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  statements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one entry per user per day
  CONSTRAINT unique_user_date UNIQUE (user_id, entry_date),

  -- Validate statements is an array
  CONSTRAINT valid_statements CHECK (jsonb_typeof(statements) = 'array'),

  -- Limit statements count (max 10 per day)
  CONSTRAINT max_statements CHECK (jsonb_array_length(statements) <= 10),

  -- Ensure statements are not empty strings
  CONSTRAINT non_empty_statements CHECK (
    statements::jsonb = '[]'::jsonb OR
    NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(statements) AS elem
      WHERE trim(elem) = ''
    )
  )
);

-- Performance indexes optimized for TanStack Query access patterns
CREATE INDEX idx_gratitude_entries_user_id ON gratitude_entries(user_id);
CREATE INDEX idx_gratitude_entries_date ON gratitude_entries(entry_date);
CREATE INDEX idx_gratitude_entries_user_date ON gratitude_entries(user_id, entry_date);
CREATE INDEX idx_gratitude_entries_user_date_desc ON gratitude_entries(user_id, entry_date DESC);
CREATE INDEX idx_gratitude_entries_created_at ON gratitude_entries(created_at);

-- GIN index for JSONB statements search and analytics
CREATE INDEX idx_gratitude_entries_statements ON gratitude_entries USING GIN (statements);

-- Updated_at trigger
CREATE TRIGGER update_gratitude_entries_updated_at
  BEFORE UPDATE ON gratitude_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**JSONB Structure Example:**

```json
{
  "statements": [
    "I'm grateful for the beautiful sunny weather today",
    "Thankful for my family's unwavering support",
    "Appreciative of my good health and energy"
  ]
}
```

### streaks (Enhanced Analytics)

Streak tracking data with analytics for motivation and TanStack Query optimization.

```sql
CREATE TABLE streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  total_entries INTEGER DEFAULT 0 CHECK (total_entries >= 0),
  last_entry_date DATE,
  streak_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Business logic constraints
  CONSTRAINT valid_streak_relationship CHECK (current_streak <= longest_streak),
  CONSTRAINT valid_entry_relationship CHECK (total_entries >= current_streak)
);

-- Performance indexes
CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_current_streak ON streaks(current_streak);
CREATE INDEX idx_streaks_longest_streak ON streaks(longest_streak);
CREATE INDEX idx_streaks_last_entry_date ON streaks(last_entry_date);

-- Updated_at trigger
CREATE TRIGGER update_streaks_updated_at
  BEFORE UPDATE ON streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Enhanced Field Descriptions:**

- `user_id`: Foreign key to auth.users (unique per user)
- `current_streak`: Current consecutive days with entries
- `longest_streak`: All-time longest streak achieved
- `total_entries`: Total number of gratitude entries (for analytics)
- `last_entry_date`: Date of the most recent entry
- `streak_start_date`: When current streak started

### daily_prompts (✅ FULLY FUNCTIONAL Varied Prompts System)

Enhanced prompts database for the varied prompts feature with comprehensive prompt management.

```sql
CREATE TABLE daily_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text_tr TEXT NOT NULL,
  prompt_text_en TEXT,
  category TEXT,
  difficulty_level TEXT DEFAULT 'beginner'
    CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure prompt text is meaningful
  CONSTRAINT non_empty_prompt_tr CHECK (LENGTH(TRIM(prompt_text_tr)) > 10),
  CONSTRAINT valid_category CHECK (category IS NULL OR LENGTH(TRIM(category)) > 0)
);

-- Performance indexes for random selection
CREATE INDEX idx_daily_prompts_active ON daily_prompts(is_active);
CREATE INDEX idx_daily_prompts_category ON daily_prompts(category);
CREATE INDEX idx_daily_prompts_difficulty ON daily_prompts(difficulty_level);
CREATE INDEX idx_daily_prompts_usage_count ON daily_prompts(usage_count);

-- Updated_at trigger
CREATE TRIGGER update_daily_prompts_updated_at
  BEFORE UPDATE ON daily_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enhanced sample prompts for production
INSERT INTO daily_prompts (prompt_text_tr, prompt_text_en, category, difficulty_level, is_active) VALUES
-- Beginner prompts
('Bugün seni mutlu eden küçük bir şey neydi?', 'What small thing made you happy today?', 'daily_life', 'beginner', true),
('Hangi kişi için minnettarlık duyuyorsun?', 'Which person are you grateful for?', 'relationships', 'beginner', true),
('Bugün öğrendiğin yeni bir şey var mı?', 'Did you learn something new today?', 'learning', 'beginner', true),
('Sağlığın için ne kadar minnettarsın?', 'How grateful are you for your health?', 'health', 'beginner', true),
('Doğada seni etkileyen bir şey var mıydı?', 'Was there something in nature that impressed you?', 'nature', 'beginner', true),

-- Intermediate prompts
('Bugün hangi zorluğu fırsata çevirdin?', 'What challenge did you turn into an opportunity today?', 'growth', 'intermediate', true),
('Geçmişte aldığın hangi karar için minnettarsın?', 'What past decision are you grateful for?', 'reflection', 'intermediate', true),
('Bugün hangi becerin gelişti?', 'What skill of yours improved today?', 'development', 'intermediate', true),
('Hangi anı tekrar yaşamak isterdin?', 'Which moment would you like to relive?', 'memories', 'intermediate', true),
('Bugün hangi değerin daha da güçlendi?', 'Which of your values grew stronger today?', 'values', 'intermediate', true),

-- Advanced prompts
('Hayatındaki hangi değişim için en minnettarsın?', 'What change in your life are you most grateful for?', 'transformation', 'advanced', true),
('Gelecek nesillere hangi mirasın için teşekkür ediyorsun?', 'What legacy are you grateful to leave for future generations?', 'legacy', 'advanced', true),
('Bugün hangi sınırını aştın?', 'What boundary did you cross today?', 'breakthrough', 'advanced', true),
('Hangi kaybın sana en çok öğretti?', 'What loss taught you the most?', 'wisdom', 'advanced', true),
('Hangi korkunla yüzleştiğin için minnettarsın?', 'What fear are you grateful for facing?', 'courage', 'advanced', true);
```

## 🔐 Enhanced Row Level Security (RLS) Policies

### profiles Policies (Enhanced Security)

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (onboarding)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Prevent profile deletion (handled by CASCADE)
-- No DELETE policy - profiles are preserved for data integrity
```

### gratitude_entries Policies (TanStack Query Optimized)

```sql
-- Enable RLS
ALTER TABLE gratitude_entries ENABLE ROW LEVEL SECURITY;

-- Users can view their own entries
CREATE POLICY "Users can view own entries" ON gratitude_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own entries
CREATE POLICY "Users can insert own entries" ON gratitude_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own entries
CREATE POLICY "Users can update own entries" ON gratitude_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own entries" ON gratitude_entries
  FOR DELETE USING (auth.uid() = user_id);
```

### streaks Policies (Analytics Security)

```sql
-- Enable RLS
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak data
CREATE POLICY "Users can view own streak" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own streak data
CREATE POLICY "Users can insert own streak" ON streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own streak data
CREATE POLICY "Users can update own streak" ON streaks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow cascade deletion
CREATE POLICY "Users can delete own streak" ON streaks
  FOR DELETE USING (auth.uid() = user_id);
```

### daily_prompts Policies (Public Read Access)

```sql
-- Enable RLS
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active prompts
CREATE POLICY "Authenticated users can view active prompts" ON daily_prompts
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Only service role can modify prompts
-- (Managed through direct database access or admin panel)
```

## ⚡ Enhanced RPC Functions (TanStack Query Compatible)

### Gratitude Operations (Optimistic Update Compatible)

#### add_gratitude_statement (Enhanced)

Atomically adds a statement with optimistic update support and comprehensive validation.

```sql
CREATE OR REPLACE FUNCTION add_gratitude_statement(
  p_entry_date DATE,
  p_statement TEXT
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_entry gratitude_entries%ROWTYPE;
  v_new_statements JSONB;
  v_trimmed_statement TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Check authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate and clean statement
  v_trimmed_statement := TRIM(p_statement);
  IF v_trimmed_statement IS NULL OR LENGTH(v_trimmed_statement) = 0 THEN
    RAISE EXCEPTION 'Statement cannot be empty';
  END IF;

  IF LENGTH(v_trimmed_statement) > 500 THEN
    RAISE EXCEPTION 'Statement too long (max 500 characters)';
  END IF;

  -- Validate date (not too far in future)
  IF p_entry_date > CURRENT_DATE + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'Entry date cannot be more than 1 day in the future';
  END IF;

  -- Try to find existing entry
  SELECT * INTO v_entry
  FROM gratitude_entries
  WHERE user_id = v_user_id AND entry_date = p_entry_date;

  IF FOUND THEN
    -- Check statement limit
    IF jsonb_array_length(v_entry.statements) >= 10 THEN
      RAISE EXCEPTION 'Maximum 10 statements per day allowed';
    END IF;

    -- Check for duplicate statements
    IF v_entry.statements @> to_jsonb(ARRAY[v_trimmed_statement]) THEN
      RAISE EXCEPTION 'Duplicate statement not allowed';
    END IF;

    -- Add statement to existing entry
    v_new_statements := v_entry.statements || to_jsonb(v_trimmed_statement);

    UPDATE gratitude_entries
    SET statements = v_new_statements,
        updated_at = NOW()
    WHERE id = v_entry.id
    RETURNING * INTO v_entry;
  ELSE
    -- Create new entry with first statement
    INSERT INTO gratitude_entries (user_id, entry_date, statements)
    VALUES (v_user_id, p_entry_date, jsonb_build_array(v_trimmed_statement))
    RETURNING * INTO v_entry;
  END IF;

  -- Update streak after adding statement
  PERFORM update_user_streak(v_user_id);

  -- Return the entry
  RETURN QUERY
  SELECT v_entry.id, v_entry.user_id, v_entry.entry_date,
         v_entry.statements, v_entry.created_at, v_entry.updated_at;
END;
$$;
```

#### edit_gratitude_statement (Enhanced Validation)

```sql
CREATE OR REPLACE FUNCTION edit_gratitude_statement(
  p_entry_date DATE,
  p_statement_index INTEGER,
  p_updated_statement TEXT
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_entry gratitude_entries%ROWTYPE;
  v_updated_statements JSONB;
  v_statement_count INTEGER;
  v_trimmed_statement TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate statement
  v_trimmed_statement := TRIM(p_updated_statement);
  IF v_trimmed_statement IS NULL OR LENGTH(v_trimmed_statement) = 0 THEN
    RAISE EXCEPTION 'Statement cannot be empty';
  END IF;

  IF LENGTH(v_trimmed_statement) > 500 THEN
    RAISE EXCEPTION 'Statement too long (max 500 characters)';
  END IF;

  -- Find the entry
  SELECT * INTO v_entry
  FROM gratitude_entries
  WHERE user_id = v_user_id AND entry_date = p_entry_date;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found for date %', p_entry_date;
  END IF;

  -- Check statement count and index bounds
  v_statement_count := jsonb_array_length(v_entry.statements);

  IF p_statement_index < 0 OR p_statement_index >= v_statement_count THEN
    RAISE EXCEPTION 'Statement index % is out of bounds (0 to %)',
      p_statement_index, v_statement_count - 1;
  END IF;

  -- Update the statement at the specified index
  v_updated_statements := jsonb_set(
    v_entry.statements,
    ARRAY[p_statement_index::text],
    to_jsonb(v_trimmed_statement)
  );

  -- Update the entry
  UPDATE gratitude_entries
  SET statements = v_updated_statements,
      updated_at = NOW()
  WHERE id = v_entry.id
  RETURNING * INTO v_entry;

  -- Return updated entry
  RETURN QUERY
  SELECT v_entry.id, v_entry.user_id, v_entry.entry_date,
         v_entry.statements, v_entry.created_at, v_entry.updated_at;
END;
$$;
```

#### delete_gratitude_statement (Enhanced Logic)

```sql
CREATE OR REPLACE FUNCTION delete_gratitude_statement(
  p_entry_date DATE,
  p_statement_index INTEGER
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_entry gratitude_entries%ROWTYPE;
  v_updated_statements JSONB;
  v_statement_count INTEGER;
  v_deleted_entry BOOLEAN := FALSE;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Find the entry
  SELECT * INTO v_entry
  FROM gratitude_entries
  WHERE user_id = v_user_id AND entry_date = p_entry_date;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found for date %', p_entry_date;
  END IF;

  -- Check statement count and index bounds
  v_statement_count := jsonb_array_length(v_entry.statements);

  IF p_statement_index < 0 OR p_statement_index >= v_statement_count THEN
    RAISE EXCEPTION 'Statement index % is out of bounds (0 to %)',
      p_statement_index, v_statement_count - 1;
  END IF;

  -- If this is the only statement, delete the entire entry
  IF v_statement_count = 1 THEN
    DELETE FROM gratitude_entries WHERE id = v_entry.id;
    v_deleted_entry := TRUE;
  ELSE
    -- Remove the statement at the specified index
    v_updated_statements := (
      SELECT jsonb_agg(value)
      FROM (
        SELECT value, ordinality - 1 as idx
        FROM jsonb_array_elements(v_entry.statements) WITH ORDINALITY
        WHERE ordinality - 1 != p_statement_index
      ) t
    );

    -- Update the entry
    UPDATE gratitude_entries
    SET statements = v_updated_statements,
        updated_at = NOW()
    WHERE id = v_entry.id
    RETURNING * INTO v_entry;
  END IF;

  -- Update streak after deletion
  PERFORM update_user_streak(v_user_id);

  -- Return result (null if entry was deleted)
  IF NOT v_deleted_entry THEN
    RETURN QUERY
    SELECT v_entry.id, v_entry.user_id, v_entry.entry_date,
           v_entry.statements, v_entry.created_at, v_entry.updated_at;
  END IF;
END;
$$;
```

### Enhanced Streak Calculations

#### calculate_streak (Simple API-Compatible Function)

```sql
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_check_date DATE;
  v_has_entry BOOLEAN;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Calculate current streak (from today backwards)
  v_check_date := CURRENT_DATE;

  LOOP
    -- Check if user has an entry for this date
    SELECT EXISTS(
      SELECT 1 FROM gratitude_entries
      WHERE user_id = p_user_id
      AND entry_date = v_check_date
      AND jsonb_array_length(statements) > 0
    ) INTO v_has_entry;

    -- If no entry found
    IF NOT v_has_entry THEN
      -- Grace period: If this is today and current streak is 0, check yesterday
      IF v_check_date = CURRENT_DATE AND v_current_streak = 0 THEN
        v_check_date := v_check_date - INTERVAL '1 day';
        CONTINUE;
      END IF;

      -- No more grace - break the streak
      EXIT;
    END IF;

    -- Increment current streak and check previous day
    v_current_streak := v_current_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';

    -- Safety limit to prevent infinite loops
    IF v_current_streak >= 1000 THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN v_current_streak;
END;
$$;
```

#### calculate_user_streak (Advanced Analytics)

```sql
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  current_streak INTEGER,
  longest_streak INTEGER,
  total_entries INTEGER,
  streak_percentage DECIMAL(5,2),
  last_entry_date DATE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_current_streak INTEGER := 0;
  v_longest_streak INTEGER := 0;
  v_total_entries INTEGER := 0;
  v_check_date DATE;
  v_has_entry BOOLEAN;
  v_temp_streak INTEGER := 0;
  v_last_entry_date DATE;
  v_streak_percentage DECIMAL(5,2) := 0;
BEGIN
  -- Use provided user_id or get from auth context
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get total entries and last entry date
  SELECT COUNT(*), MAX(entry_date)
  INTO v_total_entries, v_last_entry_date
  FROM gratitude_entries
  WHERE user_id = v_user_id;

  -- Calculate current streak (from today backwards)
  v_check_date := CURRENT_DATE;

  LOOP
    -- Check if user has an entry for this date
    SELECT EXISTS(
      SELECT 1 FROM gratitude_entries
      WHERE user_id = v_user_id
      AND entry_date = v_check_date
      AND jsonb_array_length(statements) > 0
    ) INTO v_has_entry;

    -- If no entry found
    IF NOT v_has_entry THEN
      -- If this is today and current streak is 0, check yesterday
      IF v_check_date = CURRENT_DATE AND v_current_streak = 0 THEN
        v_check_date := v_check_date - INTERVAL '1 day';
        CONTINUE;
      END IF;

      EXIT; -- Break the streak
    END IF;

    -- Increment current streak and check previous day
    v_current_streak := v_current_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';

    -- Safety limit
    IF v_current_streak >= 365 THEN
      EXIT;
    END IF;
  END LOOP;

  -- Calculate longest streak by checking all possible streaks
  -- This is a simplified version; for better performance,
  -- this could be cached in the streaks table
  v_longest_streak := v_current_streak;

  -- For now, assume longest streak is at least current streak
  -- In production, this would be maintained incrementally
  SELECT COALESCE(MAX(longest_streak), v_current_streak)
  INTO v_longest_streak
  FROM streaks
  WHERE user_id = v_user_id;

  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  -- Calculate streak percentage (last 30 days)
  IF v_total_entries > 0 THEN
    v_streak_percentage := LEAST((v_current_streak::DECIMAL / 30.0) * 100, 100);
  END IF;

  RETURN QUERY
  SELECT v_current_streak, v_longest_streak, v_total_entries,
         v_streak_percentage, v_last_entry_date;
END;
$$;
```

#### update_user_streak (TanStack Query Compatible)

```sql
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_streak_data RECORD;
BEGIN
  -- Calculate current streak data
  SELECT * INTO v_streak_data
  FROM calculate_user_streak(p_user_id);

  -- Upsert streak record
  INSERT INTO streaks (
    user_id,
    current_streak,
    longest_streak,
    total_entries,
    last_entry_date
  )
  VALUES (
    p_user_id,
    v_streak_data.current_streak,
    v_streak_data.longest_streak,
    v_streak_data.total_entries,
    v_streak_data.last_entry_date
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = GREATEST(streaks.longest_streak, EXCLUDED.longest_streak),
    total_entries = EXCLUDED.total_entries,
    last_entry_date = EXCLUDED.last_entry_date,
    updated_at = NOW();
END;
$$;
```

### ✅ Enhanced Prompt Management (Varied Prompts System)

#### get_random_active_prompt (Production Ready)

```sql
CREATE OR REPLACE FUNCTION get_random_active_prompt()
RETURNS TABLE(
  id UUID,
  prompt_text_tr TEXT,
  prompt_text_en TEXT,
  category TEXT,
  difficulty_level TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Return random active prompt with usage tracking
  RETURN QUERY
  SELECT dp.id, dp.prompt_text_tr, dp.prompt_text_en, dp.category, dp.difficulty_level
  FROM daily_prompts dp
  WHERE dp.is_active = true
  ORDER BY RANDOM()
  LIMIT 1;

  -- Update usage count (fire and forget)
  UPDATE daily_prompts
  SET usage_count = usage_count + 1
  WHERE id = (
    SELECT dp2.id
    FROM daily_prompts dp2
    WHERE dp2.is_active = true
    ORDER BY RANDOM()
    LIMIT 1
  );
END;
$$;
```

#### get_multiple_random_active_prompts (Enhanced Experience)

```sql
CREATE OR REPLACE FUNCTION get_multiple_random_active_prompts(p_limit INTEGER DEFAULT 12)
RETURNS TABLE(
  id UUID,
  prompt_text_tr TEXT,
  prompt_text_en TEXT,
  category TEXT,
  difficulty_level TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate limit
  IF p_limit <= 0 OR p_limit > 50 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 50';
  END IF;

  -- Return multiple random active prompts
  RETURN QUERY
  SELECT dp.id, dp.prompt_text_tr, dp.prompt_text_en, dp.category, dp.difficulty_level
  FROM daily_prompts dp
  WHERE dp.is_active = true
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$;
```

### Utility Functions (TanStack Query Optimized)

#### get_entry_dates_for_month (Calendar Integration)

```sql
CREATE OR REPLACE FUNCTION get_entry_dates_for_month(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(entry_date DATE)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate input
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12';
  END IF;

  IF p_year < 2020 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Year must be between 2020 and 2100';
  END IF;

  -- Calculate date range
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::DATE;

  -- Return dates with entries
  RETURN QUERY
  SELECT ge.entry_date
  FROM gratitude_entries ge
  WHERE ge.user_id = v_user_id
    AND ge.entry_date >= v_start_date
    AND ge.entry_date <= v_end_date
    AND jsonb_array_length(ge.statements) > 0
  ORDER BY ge.entry_date;
END;
$$;
```

#### get_random_gratitude_entry (Throwback Feature)

```sql
CREATE OR REPLACE FUNCTION get_random_gratitude_entry()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_total_entries INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user has any entries
  SELECT COUNT(*) INTO v_total_entries
  FROM gratitude_entries ge
  WHERE ge.user_id = v_user_id
    AND jsonb_array_length(ge.statements) > 0
    AND ge.entry_date < CURRENT_DATE; -- Exclude today

  IF v_total_entries = 0 THEN
    RETURN; -- No entries to show
  END IF;

  -- Return random past entry for throwback
  RETURN QUERY
  SELECT ge.id, ge.user_id, ge.entry_date, ge.statements, ge.created_at, ge.updated_at
  FROM gratitude_entries ge
  WHERE ge.user_id = v_user_id
    AND ge.entry_date < CURRENT_DATE
    AND jsonb_array_length(ge.statements) > 0
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;
```

## 📈 Performance Optimization (TanStack Query Enhanced)

### Advanced Index Strategy

```sql
-- Composite indexes for TanStack Query access patterns
CREATE INDEX CONCURRENTLY idx_gratitude_entries_user_date_desc
  ON gratitude_entries(user_id, entry_date DESC);

CREATE INDEX CONCURRENTLY idx_gratitude_entries_user_created
  ON gratitude_entries(user_id, created_at DESC);

-- Partial indexes for active data only
CREATE INDEX CONCURRENTLY idx_active_prompts_category
  ON daily_prompts(category) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_active_prompts_difficulty
  ON daily_prompts(difficulty_level) WHERE is_active = true;

-- Functional indexes for analytics
CREATE INDEX CONCURRENTLY idx_gratitude_statements_count
  ON gratitude_entries(user_id, jsonb_array_length(statements));

-- Covering indexes for common queries
CREATE INDEX CONCURRENTLY idx_gratitude_entries_covering
  ON gratitude_entries(user_id, entry_date)
  INCLUDE (statements, updated_at);
```

### Query Optimization for TanStack Query

```sql
-- Efficient recent entries with limit (for infinite queries)
CREATE OR REPLACE FUNCTION get_recent_gratitude_entries(
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT ge.id, ge.entry_date, ge.statements, ge.created_at, ge.updated_at
  FROM gratitude_entries ge
  WHERE ge.user_id = v_user_id
  ORDER BY ge.entry_date DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
```

## 🔄 TanStack Query Integration Patterns

### Cache-Friendly Functions

```sql
-- Function that returns data in format expected by TanStack Query
CREATE OR REPLACE FUNCTION get_user_dashboard_data()
RETURNS TABLE(
  profile_data JSONB,
  recent_entries JSONB,
  streak_data JSONB,
  random_prompt JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT to_jsonb(p) FROM profiles p WHERE p.id = v_user_id) as profile_data,
    (SELECT jsonb_agg(to_jsonb(ge) ORDER BY ge.entry_date DESC)
     FROM gratitude_entries ge
     WHERE ge.user_id = v_user_id
     LIMIT 5) as recent_entries,
    (SELECT to_jsonb(s) FROM streaks s WHERE s.user_id = v_user_id) as streak_data,
    (SELECT to_jsonb(dp) FROM get_random_active_prompt() dp) as random_prompt;
END;
$$;
```

## 📊 Analytics and Monitoring (Production Ready)

### Enhanced Usage Statistics

```sql
-- Comprehensive user engagement analytics
CREATE OR REPLACE FUNCTION get_user_analytics()
RETURNS TABLE(
  total_users BIGINT,
  active_users_30d BIGINT,
  active_users_7d BIGINT,
  total_entries BIGINT,
  entries_last_30d BIGINT,
  avg_statements_per_entry NUMERIC(10,2),
  avg_streak_length NUMERIC(10,2),
  prompt_usage_stats JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM gratitude_entries
     WHERE created_at >= NOW() - INTERVAL '30 days') as active_users_30d,
    (SELECT COUNT(DISTINCT user_id) FROM gratitude_entries
     WHERE created_at >= NOW() - INTERVAL '7 days') as active_users_7d,
    (SELECT COUNT(*) FROM gratitude_entries) as total_entries,
    (SELECT COUNT(*) FROM gratitude_entries
     WHERE created_at >= NOW() - INTERVAL '30 days') as entries_last_30d,
    (SELECT AVG(jsonb_array_length(statements))::NUMERIC(10,2)
     FROM gratitude_entries) as avg_statements_per_entry,
    (SELECT AVG(current_streak)::NUMERIC(10,2)
     FROM streaks WHERE current_streak > 0) as avg_streak_length,
    (SELECT jsonb_object_agg(category, usage_count)
     FROM (SELECT category, SUM(usage_count) as usage_count
           FROM daily_prompts
           WHERE is_active = true
           GROUP BY category) t) as prompt_usage_stats;
END;
$$;
```

---

This enhanced database documentation provides a **comprehensive, production-ready foundation** for the Yeser gratitude app with full TanStack Query v5.80.2 integration, working varied prompts system, advanced notification architecture, and optimized performance patterns.

**Key Production Features:**

- ✅ **Fully Functional Varied Prompts System** with database integration
- 🔄 **TanStack Query Optimized** RPC functions and indexes
- 🔔 **Comprehensive Notification Settings** with throwback reminders
- ⚡ **Intelligent Caching Support** with query-friendly functions
- 🛡️ **Enhanced Security** with Row Level Security policies
- 📊 **Advanced Analytics** and usage tracking
- 🎯 **Optimistic Update Compatible** functions
- 📱 **Cross-Platform Ready** with React Native optimizations
