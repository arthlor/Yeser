# Database Documentation

This document provides comprehensive documentation for the Supabase database schema, RPC functions, security policies, and data architecture used in the Yeser gratitude app.

## 🗄️ Database Overview

### Technology Stack
- **Database**: PostgreSQL 15 (via Supabase)
- **ORM**: Direct SQL with Supabase client
- **Authentication**: Supabase Auth
- **Security**: Row Level Security (RLS)
- **Real-time**: Supabase Realtime (WebSockets)

### Database Architecture

```
Supabase Database
├── Auth Schema (auth.*)          # Built-in authentication
│   ├── users                     # User accounts
│   ├── sessions                  # User sessions
│   └── refresh_tokens           # Refresh tokens
├── Public Schema (public.*)      # Application data
│   ├── profiles                  # User profiles & preferences
│   ├── gratitude_entries        # Daily gratitude entries
│   ├── streaks                   # Streak calculations
│   └── daily_prompts            # Prompt variations
└── RPC Functions                 # Server-side business logic
    ├── Gratitude Operations      # CRUD for entries
    ├── Streak Calculations       # Streak computations
    └── Data Export              # Export functionality
```

## 📊 Table Schemas

### profiles

User profile and preference data linked to authentication.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_time TEXT DEFAULT '20:00:00',
  throwback_reminder_enabled BOOLEAN DEFAULT TRUE,
  throwback_reminder_frequency TEXT DEFAULT 'weekly' 
    CHECK (throwback_reminder_frequency IN ('daily', 'weekly', 'monthly')),
  daily_gratitude_goal INTEGER DEFAULT 3 CHECK (daily_gratitude_goal > 0),
  use_varied_prompts BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_onboarded ON profiles(onboarded);

-- Updated_at trigger
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

**Field Descriptions:**
- `id`: UUID matching auth.users.id (Primary Key)
- `username`: Display name for the user
- `onboarded`: Whether user completed onboarding flow
- `reminder_enabled`: Daily reminder notification preference
- `reminder_time`: Time for daily reminders (HH:MM:SS format)
- `throwback_reminder_enabled`: Enable throwback feature
- `throwback_reminder_frequency`: How often to show throwbacks
- `daily_gratitude_goal`: Target number of statements per day
- `use_varied_prompts`: Use random prompts vs default message

### gratitude_entries

Daily gratitude entries with statements stored as JSONB array.

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
  CONSTRAINT max_statements CHECK (jsonb_array_length(statements) <= 10)
);

-- Indexes for performance
CREATE INDEX idx_gratitude_entries_user_id ON gratitude_entries(user_id);
CREATE INDEX idx_gratitude_entries_date ON gratitude_entries(entry_date);
CREATE INDEX idx_gratitude_entries_user_date ON gratitude_entries(user_id, entry_date);
CREATE INDEX idx_gratitude_entries_created_at ON gratitude_entries(created_at);

-- GIN index for JSONB statements search
CREATE INDEX idx_gratitude_entries_statements ON gratitude_entries USING GIN (statements);

-- Updated_at trigger
CREATE TRIGGER update_gratitude_entries_updated_at 
  BEFORE UPDATE ON gratitude_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Field Descriptions:**
- `id`: Unique identifier for the entry
- `user_id`: Foreign key to auth.users
- `entry_date`: Date of the gratitude entry (YYYY-MM-DD)
- `statements`: JSONB array of gratitude statements
- `created_at`: Entry creation timestamp
- `updated_at`: Last modification timestamp

**JSONB Structure Example:**
```json
{
  "statements": [
    "I'm grateful for sunny weather today",
    "Thankful for my family's support",
    "Appreciative of good health"
  ]
}
```

### streaks

Streak tracking data for consistency motivation.

```sql
CREATE TABLE streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
  last_entry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure current_streak <= longest_streak
  CONSTRAINT valid_streak_relationship CHECK (current_streak <= longest_streak)
);

-- Indexes
CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_current_streak ON streaks(current_streak);
CREATE INDEX idx_streaks_longest_streak ON streaks(longest_streak);

-- Updated_at trigger
CREATE TRIGGER update_streaks_updated_at 
  BEFORE UPDATE ON streaks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Field Descriptions:**
- `user_id`: Foreign key to auth.users (unique per user)
- `current_streak`: Current consecutive days with entries
- `longest_streak`: All-time longest streak achieved
- `last_entry_date`: Date of the most recent entry

### daily_prompts

Varied prompts for gratitude inspiration.

```sql
CREATE TABLE daily_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_text_tr TEXT NOT NULL,
  prompt_text_en TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure prompt text is not empty
  CONSTRAINT non_empty_prompt_tr CHECK (LENGTH(TRIM(prompt_text_tr)) > 0)
);

-- Indexes
CREATE INDEX idx_daily_prompts_active ON daily_prompts(is_active);
CREATE INDEX idx_daily_prompts_category ON daily_prompts(category);

-- Updated_at trigger
CREATE TRIGGER update_daily_prompts_updated_at 
  BEFORE UPDATE ON daily_prompts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample prompts
INSERT INTO daily_prompts (prompt_text_tr, prompt_text_en, category, is_active) VALUES
('Bugün seni mutlu eden küçük bir şey neydi?', 'What small thing made you happy today?', 'daily_life', true),
('Hangi kişi için minnettarlık duyuyorsun?', 'Which person are you grateful for?', 'relationships', true),
('Bugün öğrendiğin yeni bir şey var mı?', 'Did you learn something new today?', 'learning', true),
('Sağlığın için ne kadar minnettarsın?', 'How grateful are you for your health?', 'health', true),
('Doğada seni etkileyen bir şey var mıydı?', 'Was there something in nature that impressed you?', 'nature', true);
```

## 🔐 Row Level Security (RLS) Policies

### profiles Policies

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users cannot delete profiles (handled by CASCADE)
-- DELETE policy not needed due to CASCADE relationship
```

### gratitude_entries Policies

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
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own entries
CREATE POLICY "Users can delete own entries" ON gratitude_entries
  FOR DELETE USING (auth.uid() = user_id);
```

### streaks Policies

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
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own streak data
CREATE POLICY "Users can delete own streak" ON streaks
  FOR DELETE USING (auth.uid() = user_id);
```

### daily_prompts Policies

```sql
-- Enable RLS
ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active prompts
CREATE POLICY "Authenticated users can view active prompts" ON daily_prompts
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Only service role can modify prompts
-- (This is handled through direct database access, not client-side)
```

## ⚡ RPC Functions

### Gratitude Operations

#### add_gratitude_statement

Atomically adds a statement to a gratitude entry, creating the entry if needed.

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
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Validate statement
  IF p_statement IS NULL OR LENGTH(TRIM(p_statement)) = 0 THEN
    RAISE EXCEPTION 'Statement cannot be empty';
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
    -- Check if we would exceed max statements
    IF jsonb_array_length(v_entry.statements) >= 10 THEN
      RAISE EXCEPTION 'Maximum 10 statements per day allowed';
    END IF;
    
    -- Add statement to existing entry
    v_new_statements := v_entry.statements || to_jsonb(TRIM(p_statement));
    
    UPDATE gratitude_entries 
    SET statements = v_new_statements,
        updated_at = NOW()
    WHERE id = v_entry.id;
    
    -- Return updated entry
    RETURN QUERY
    SELECT ge.id, ge.user_id, ge.entry_date, ge.statements, ge.created_at, ge.updated_at
    FROM gratitude_entries ge
    WHERE ge.id = v_entry.id;
  ELSE
    -- Create new entry with first statement
    v_new_statements := jsonb_build_array(TRIM(p_statement));
    
    INSERT INTO gratitude_entries (user_id, entry_date, statements)
    VALUES (v_user_id, p_entry_date, v_new_statements)
    RETURNING id, user_id, entry_date, statements, created_at, updated_at
    INTO v_entry;
    
    -- Return new entry
    RETURN QUERY
    SELECT v_entry.id, v_entry.user_id, v_entry.entry_date, 
           v_entry.statements, v_entry.created_at, v_entry.updated_at;
  END IF;
  
  -- Update streak after adding statement
  PERFORM update_user_streak(v_user_id);
END;
$$;
```

#### edit_gratitude_statement

Updates a specific statement at the given index.

```sql
CREATE OR REPLACE FUNCTION edit_gratitude_statement(
  p_entry_date DATE,
  p_statement_index INTEGER,
  p_updated_statement TEXT
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_entry gratitude_entries%ROWTYPE;
  v_updated_statements JSONB;
  v_statement_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Validate statement
  IF p_updated_statement IS NULL OR LENGTH(TRIM(p_updated_statement)) = 0 THEN
    RAISE EXCEPTION 'Statement cannot be empty';
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
    to_jsonb(TRIM(p_updated_statement))
  );
  
  -- Update the entry
  UPDATE gratitude_entries 
  SET statements = v_updated_statements,
      updated_at = NOW()
  WHERE id = v_entry.id;
END;
$$;
```

#### delete_gratitude_statement

Removes a statement at the specified index, deleting the entire entry if it becomes empty.

```sql
CREATE OR REPLACE FUNCTION delete_gratitude_statement(
  p_entry_date DATE,
  p_statement_index INTEGER
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_entry gratitude_entries%ROWTYPE;
  v_updated_statements JSONB;
  v_statement_count INTEGER;
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
    WHERE id = v_entry.id;
  END IF;
  
  -- Update streak after deletion
  PERFORM update_user_streak(v_user_id);
END;
$$;
```

### Streak Calculations

#### calculate_streak

Calculates the current streak for a user based on consecutive days with entries.

```sql
CREATE OR REPLACE FUNCTION calculate_streak(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_current_streak INTEGER := 0;
  v_check_date DATE;
  v_has_entry BOOLEAN;
BEGIN
  -- Use provided user_id or get from auth context
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Start checking from today
  v_check_date := CURRENT_DATE;
  
  -- Count consecutive days with entries going backwards from today
  LOOP
    -- Check if user has an entry for this date
    SELECT EXISTS(
      SELECT 1 FROM gratitude_entries 
      WHERE user_id = v_user_id 
      AND entry_date = v_check_date
      AND jsonb_array_length(statements) > 0
    ) INTO v_has_entry;
    
    -- If no entry found, break the streak
    IF NOT v_has_entry THEN
      -- Special case: if this is today and no entry yet, don't break streak
      IF v_check_date = CURRENT_DATE AND v_current_streak = 0 THEN
        -- Check yesterday to see if we should continue counting
        v_check_date := v_check_date - INTERVAL '1 day';
        CONTINUE;
      END IF;
      
      EXIT;
    END IF;
    
    -- Increment streak and check previous day
    v_current_streak := v_current_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
    
    -- Safeguard against infinite loops (max 1000 days)
    IF v_current_streak >= 1000 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_current_streak;
END;
$$;
```

#### update_user_streak

Internal function to update streak data after entry changes.

```sql
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_streak INTEGER;
  v_existing_streak streaks%ROWTYPE;
  v_last_entry_date DATE;
BEGIN
  -- Calculate current streak
  v_current_streak := calculate_streak(p_user_id);
  
  -- Get the most recent entry date
  SELECT MAX(entry_date) INTO v_last_entry_date
  FROM gratitude_entries
  WHERE user_id = p_user_id;
  
  -- Try to find existing streak record
  SELECT * INTO v_existing_streak
  FROM streaks
  WHERE user_id = p_user_id;
  
  IF FOUND THEN
    -- Update existing record
    UPDATE streaks 
    SET current_streak = v_current_streak,
        longest_streak = GREATEST(longest_streak, v_current_streak),
        last_entry_date = v_last_entry_date,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Create new streak record
    INSERT INTO streaks (user_id, current_streak, longest_streak, last_entry_date)
    VALUES (p_user_id, v_current_streak, v_current_streak, v_last_entry_date);
  END IF;
END;
$$;
```

### Utility Functions

#### get_entry_dates_for_month

Returns all dates with entries for a specific month (for calendar display).

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
  
  -- Validate month and year
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

#### get_random_gratitude_entry

Returns a random gratitude entry for the throwback feature.

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
    AND jsonb_array_length(ge.statements) > 0;
  
  IF v_total_entries = 0 THEN
    RETURN;
  END IF;
  
  -- Return random entry (excluding today's entry)
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

#### get_user_gratitude_entries_count

Returns the total number of entries for the authenticated user.

```sql
CREATE OR REPLACE FUNCTION get_user_gratitude_entries_count()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Count entries
  SELECT COUNT(*) INTO v_count
  FROM gratitude_entries
  WHERE user_id = v_user_id
    AND jsonb_array_length(statements) > 0;
  
  RETURN v_count;
END;
$$;
```

#### get_random_active_prompt

Returns a random active prompt for varied prompting.

```sql
CREATE OR REPLACE FUNCTION get_random_active_prompt()
RETURNS TABLE(
  id UUID,
  prompt_text_tr TEXT,
  prompt_text_en TEXT,
  category TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Return random active prompt
  RETURN QUERY
  SELECT dp.id, dp.prompt_text_tr, dp.prompt_text_en, dp.category
  FROM daily_prompts dp
  WHERE dp.is_active = true
  ORDER BY RANDOM()
  LIMIT 1;
END;
$$;
```

## 📈 Performance Optimization

### Index Strategy

```sql
-- Frequently queried columns
CREATE INDEX CONCURRENTLY idx_gratitude_entries_user_date_desc 
  ON gratitude_entries(user_id, entry_date DESC);

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY idx_active_prompts 
  ON daily_prompts(category) WHERE is_active = true;

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_entries_user_created 
  ON gratitude_entries(user_id, created_at DESC);
```

### Query Optimization

```sql
-- Efficient entry fetching with limit
CREATE OR REPLACE FUNCTION get_recent_entries(p_limit INTEGER DEFAULT 30)
RETURNS TABLE(
  id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT ge.id, ge.entry_date, ge.statements, ge.created_at
  FROM gratitude_entries ge
  WHERE ge.user_id = auth.uid()
  ORDER BY ge.entry_date DESC
  LIMIT p_limit;
END;
$$;
```

## 🔄 Backup and Maintenance

### Automated Backups

Supabase provides automatic backups, but consider additional strategies:

```sql
-- Manual backup function for user data
CREATE OR REPLACE FUNCTION backup_user_data(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_backup JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'exported_at', NOW(),
    'profile', (
      SELECT to_jsonb(p) FROM profiles p WHERE p.id = p_user_id
    ),
    'entries', (
      SELECT jsonb_agg(to_jsonb(ge) ORDER BY ge.entry_date DESC)
      FROM gratitude_entries ge WHERE ge.user_id = p_user_id
    ),
    'streak', (
      SELECT to_jsonb(s) FROM streaks s WHERE s.user_id = p_user_id
    )
  ) INTO v_backup;
  
  RETURN v_backup;
END;
$$;
```

### Data Cleanup

```sql
-- Clean up old data (if needed)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Example: Remove entries older than 5 years
  DELETE FROM gratitude_entries 
  WHERE created_at < NOW() - INTERVAL '5 years';
  
  -- Update affected streaks
  -- This would need careful consideration in production
END;
$$;
```

## 📊 Analytics and Monitoring

### Usage Statistics

```sql
-- Get user engagement statistics
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE(
  total_users BIGINT,
  active_users_30d BIGINT,
  total_entries BIGINT,
  entries_last_30d BIGINT,
  avg_statements_per_entry NUMERIC
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
    (SELECT COUNT(*) FROM gratitude_entries) as total_entries,
    (SELECT COUNT(*) FROM gratitude_entries 
     WHERE created_at >= NOW() - INTERVAL '30 days') as entries_last_30d,
    (SELECT AVG(jsonb_array_length(statements))::NUMERIC(10,2) 
     FROM gratitude_entries) as avg_statements_per_entry;
END;
$$;
```

---

This database documentation provides a complete reference for the Supabase database architecture, enabling developers to understand, maintain, and extend the data layer of the Yeser gratitude app effectively. 