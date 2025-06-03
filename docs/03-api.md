# API Documentation

This document provides comprehensive documentation for all backend integrations, API endpoints, and data models used in the Yeser gratitude app.

## 🏗️ API Architecture

The Yeser app uses **Supabase** as its primary backend, providing:
- PostgreSQL database with Row Level Security (RLS)
- Authentication and authorization
- Remote Procedure Calls (RPC) for complex operations
- Edge Functions for custom server logic
- Real-time subscriptions for live data

## 🔗 API Layers

```
Frontend
├── API Layer (src/api/)
│   ├── Type-safe wrappers
│   ├── Error handling
│   ├── Response validation
│   └── Authentication checks
├── Supabase Client
│   ├── Auto-generated types
│   ├── Session management
│   └── Real-time subscriptions
└── Backend Services
    ├── PostgreSQL Database
    ├── RPC Functions
    ├── Edge Functions
    └── Authentication
```

## 📊 Data Models

### Core Entities

#### User Profile
```typescript
interface Profile {
  id: string;                           // UUID (matches auth.users.id)
  username: string | null;              // Display name
  onboarded: boolean;                   // Onboarding completion status
  reminder_enabled: boolean;            // Daily reminder preference
  reminder_time: string;                // Time in HH:MM:SS format
  throwback_reminder_enabled: boolean;  // Throwback feature enabled
  throwback_reminder_frequency: string; // 'daily' | 'weekly' | 'monthly'
  daily_gratitude_goal: number;         // Target statements per day
  use_varied_prompts: boolean;          // Use random prompts vs default
  created_at: string;                   // ISO timestamp
  updated_at: string;                   // ISO timestamp
}
```

#### Gratitude Entry
```typescript
interface GratitudeEntry {
  id: string;                    // UUID
  user_id: string;              // Foreign key to auth.users
  entry_date: string;           // Date in YYYY-MM-DD format
  statements: string[];         // Array of gratitude statements
  created_at: string;           // ISO timestamp
  updated_at: string;           // ISO timestamp
}
```

#### Streak Data
```typescript
interface Streak {
  id: string;              // UUID
  user_id: string;         // Foreign key to auth.users
  current_streak: number;  // Current consecutive days
  longest_streak: number;  // All-time longest streak
  last_entry_date: Date | null; // Last entry date
  created_at: Date;        // Creation timestamp
  updated_at: Date;        // Last update timestamp
}
```

#### Daily Prompt
```typescript
interface DailyPrompt {
  id: string;                    // UUID
  prompt_text_tr: string;        // Turkish prompt text
  prompt_text_en?: string | null; // English prompt text (optional)
  category?: string | null;       // Prompt category
}
```

## 🔌 API Modules

### 1. Gratitude API (`src/api/gratitudeApi.ts`)

#### CRUD Operations

##### Add Statement
```typescript
addStatement(entryDate: string, statementText: string): Promise<GratitudeEntry | null>
```
- **Purpose**: Adds a new gratitude statement to a specific date
- **RPC Call**: `add_gratitude_statement`
- **Validation**: Zod schema validation on input
- **Returns**: Updated entry or null if error

**Example Usage:**
```typescript
const entry = await addStatement('2024-01-15', 'Grateful for sunny weather');
```

##### Edit Statement
```typescript
editStatement(entryDate: string, statementIndex: number, updatedStatementText: string): Promise<void>
```
- **Purpose**: Updates an existing statement at specific index
- **RPC Call**: `edit_gratitude_statement`
- **Error Handling**: Validates index bounds

##### Delete Statement
```typescript
deleteStatement(entryDate: string, statementIndex: number): Promise<void>
```
- **Purpose**: Removes a statement at specific index
- **RPC Call**: `delete_gratitude_statement`
- **Behavior**: Deletes entire entry if last statement removed

#### Data Retrieval

##### Get All Entries
```typescript
getGratitudeDailyEntries(): Promise<GratitudeEntry[]>
```
- **Purpose**: Fetches all user's entries ordered by date (newest first)
- **Database Query**: Direct table query with user filter
- **Authentication**: Requires valid session

##### Get Entry by Date
```typescript
getGratitudeDailyEntryByDate(entryDate: string): Promise<GratitudeEntry | null>
```
- **Purpose**: Fetches specific entry for given date
- **Returns**: Entry object or null if no entry exists

##### Get Entry Dates for Month
```typescript
getEntryDatesForMonth(year: number, month: number): Promise<string[]>
```
- **Purpose**: Gets all dates with entries for calendar view
- **RPC Call**: `get_entry_dates_for_month`
- **Returns**: Array of date strings in YYYY-MM-DD format

##### Get Random Entry
```typescript
getRandomGratitudeEntry(): Promise<GratitudeEntry | null>
```
- **Purpose**: Fetches random entry for throwback feature
- **RPC Call**: `get_random_gratitude_entry`
- **Use Case**: Throwback memories feature

##### Get Total Entries Count
```typescript
getTotalGratitudeEntriesCount(): Promise<number>
```
- **Purpose**: Gets total number of user's entries
- **RPC Call**: `get_user_gratitude_entries_count`
- **Use Case**: Statistics and throwback eligibility

### 2. Profile API (`src/api/profileApi.ts`)

##### Get Profile
```typescript
getProfile(): Promise<Profile | null>
```
- **Purpose**: Fetches current user's profile
- **Database Query**: Direct table query with RLS
- **Returns**: Profile object or null for new users

##### Update Profile
```typescript
updateProfile(profileUpdates: UpdateProfilePayload): Promise<Profile | null>
```
- **Purpose**: Updates user profile settings
- **Validation**: Zod schema validation
- **Optimistic Updates**: Returns updated profile immediately

**Update Payload Example:**
```typescript
const updates = {
  username: 'newname',
  reminder_enabled: true,
  reminder_time: '09:00:00',
  throwback_reminder_enabled: true,
  throwback_reminder_frequency: 'weekly',
  daily_gratitude_goal: 5,
  use_varied_prompts: true
};
```

### 3. Streak API (`src/api/streakApi.ts`)

##### Fetch User Streak
```typescript
fetchUserStreak(): Promise<number>
```
- **Purpose**: Gets current streak count only
- **RPC Call**: `calculate_streak`
- **Returns**: Numeric streak value

##### Get Streak Data
```typescript
getStreakData(): Promise<Streak | null>
```
- **Purpose**: Gets complete streak object with history
- **Database Query**: Direct table query
- **Returns**: Full streak data or null if none exists

### 4. User Data API (`src/api/userDataApi.ts`)

##### Prepare Export File
```typescript
prepareUserExportFile(): Promise<{
  success: boolean;
  filePath?: string;
  filename?: string;
  message?: string;
}>
```
- **Purpose**: Generates user data export file
- **Edge Function**: `export-user-data`
- **File Handling**: Creates JSON file in device cache

##### Share Exported File
```typescript
shareExportedFile(fileUri: string, filename: string): Promise<{
  success: boolean;
  message?: string;
}>
```
- **Purpose**: Uses native sharing to export data
- **Platform Support**: iOS and Android native sharing

##### Cleanup Temporary File
```typescript
cleanupTemporaryFile(filePath: string): Promise<void>
```
- **Purpose**: Removes temporary export files
- **Storage Management**: Prevents cache bloat

### 5. Prompt API (`src/api/promptApi.ts`)

##### Get Random Active Prompt
```typescript
getRandomActivePrompt(): Promise<DailyPrompt | null>
```
- **Purpose**: Fetches random prompt for varied experience
- **RPC Call**: `get_random_active_prompt`
- **Returns**: Prompt object or null if none available

## 🛡️ Authentication & Security

### Session Management

All API calls include automatic session validation:

```typescript
// Session check pattern used across all APIs
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !sessionData.session) {
  throw sessionError || new Error('No active session');
}
```

### Row Level Security (RLS)

All database tables are protected with RLS policies:

```sql
-- Example: Gratitude entries policy
CREATE POLICY "Users can view own entries" ON gratitude_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries" ON gratitude_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON gratitude_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON gratitude_entries
  FOR DELETE USING (auth.uid() = user_id);
```

### Input Validation

All inputs validated with Zod schemas:

```typescript
// Example validation
const validationResult = addStatementPayloadSchema.safeParse({
  entry_date: entryDate,
  statement: statementText,
});

if (!validationResult.success) {
  throw new Error(`Invalid input: ${validationResult.error.message}`);
}
```

## 🔧 RPC Functions

### Database Functions

#### `add_gratitude_statement`
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
```
- **Purpose**: Atomically adds statement to entry (creates entry if needed)
- **Concurrency**: Handles concurrent updates safely
- **Validation**: Server-side input validation

#### `edit_gratitude_statement`
```sql
CREATE OR REPLACE FUNCTION edit_gratitude_statement(
  p_entry_date DATE,
  p_statement_index INTEGER,
  p_updated_statement TEXT
)
RETURNS void
```
- **Purpose**: Updates statement at specific index
- **Error Handling**: Validates index bounds server-side

#### `delete_gratitude_statement`
```sql
CREATE OR REPLACE FUNCTION delete_gratitude_statement(
  p_entry_date DATE,
  p_statement_index INTEGER
)
RETURNS void
```
- **Purpose**: Removes statement and cleans up empty entries
- **Behavior**: Deletes entire entry if no statements remain

#### `calculate_streak`
```sql
CREATE OR REPLACE FUNCTION calculate_streak(
  p_user_id UUID
)
RETURNS INTEGER
```
- **Purpose**: Calculates current streak based on entry dates
- **Logic**: Counts consecutive days with entries
- **Performance**: Optimized for large datasets

#### `get_entry_dates_for_month`
```sql
CREATE OR REPLACE FUNCTION get_entry_dates_for_month(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(entry_date DATE)
```
- **Purpose**: Gets all entry dates for calendar display
- **Optimization**: Index-optimized for fast calendar rendering

#### `get_random_gratitude_entry`
```sql
CREATE OR REPLACE FUNCTION get_random_gratitude_entry(
  p_user_id UUID
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  entry_date DATE,
  statements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```
- **Purpose**: Selects random entry for throwback feature
- **Algorithm**: Efficient random sampling

#### `get_user_gratitude_entries_count`
```sql
CREATE OR REPLACE FUNCTION get_user_gratitude_entries_count()
RETURNS INTEGER
```
- **Purpose**: Returns total entry count for authenticated user
- **Performance**: Uses COUNT(*) with user filter

#### `get_random_active_prompt`
```sql
CREATE OR REPLACE FUNCTION get_random_active_prompt()
RETURNS TABLE(
  id UUID,
  prompt_text_tr TEXT,
  prompt_text_en TEXT,
  category TEXT
)
```
- **Purpose**: Returns random active prompt
- **Filtering**: Only returns active prompts

## 🌐 Edge Functions

### `export-user-data`

**Endpoint**: `https://<project>.supabase.co/functions/v1/export-user-data`

**Purpose**: Generates comprehensive user data export

**Authentication**: Requires valid JWT token

**Response Format**:
```json
{
  "user_profile": {
    "id": "uuid",
    "username": "string",
    "settings": { ... }
  },
  "gratitude_entries": [
    {
      "date": "2024-01-15",
      "statements": ["statement1", "statement2"]
    }
  ],
  "streak_data": {
    "current_streak": 10,
    "longest_streak": 25
  },
  "statistics": {
    "total_entries": 150,
    "total_statements": 450,
    "account_created": "2023-01-01"
  }
}
```

## 🔄 Error Handling

### Error Types

#### API Errors
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: any;
  hint?: string;
}
```

#### Common Error Codes
- `PGRST116`: No rows found
- `23505`: Unique constraint violation
- `42501`: Insufficient privilege
- `23503`: Foreign key violation

### Error Handling Pattern

```typescript
try {
  const result = await apiCall();
  return result;
} catch (error) {
  if (error.code === 'PGRST116') {
    return null; // No data found
  }
  
  console.error('API Error:', error);
  throw new Error(getUserFriendlyMessage(error));
}
```

## 📝 API Usage Examples

### Complete User Flow Example

```typescript
// 1. User authentication
await authService.signInWithEmail({
  email: 'user@example.com',
  password: 'password'
});

// 2. Fetch user profile
const profile = await getProfile();

// 3. Add gratitude statement
const entry = await addStatement(
  '2024-01-15',
  'Grateful for good health'
);

// 4. Get user's streak
const streak = await fetchUserStreak();

// 5. Export user data
const exportResult = await prepareUserExportFile();
if (exportResult.success) {
  await shareExportedFile(
    exportResult.filePath!,
    exportResult.filename!
  );
}
```

### Batch Operations Example

```typescript
// Get month's data for calendar
const entryDates = await getEntryDatesForMonth(2024, 1);
const entries = await Promise.all(
  entryDates.map(date => getGratitudeDailyEntryByDate(date))
);

// Process all entries
const totalStatements = entries
  .filter(entry => entry !== null)
  .reduce((sum, entry) => sum + entry.statements.length, 0);
```

## 🚀 Performance Considerations

### Optimization Strategies

1. **Pagination**: Large datasets paginated for performance
2. **Caching**: Frequently accessed data cached locally
3. **Batching**: Multiple operations batched when possible
4. **Indexing**: Database indexes optimized for common queries
5. **RPC Functions**: Complex operations moved to server-side

### Rate Limiting

Supabase provides built-in rate limiting:
- **Anonymous requests**: 100 requests per hour
- **Authenticated requests**: 1000 requests per hour
- **Custom limits**: Can be configured per project

## 🔮 Future API Enhancements

### Planned Features

1. **Real-time Subscriptions**: Live updates for collaborative features
2. **GraphQL Support**: More efficient data fetching
3. **Bulk Operations**: Batch import/export capabilities
4. **Webhook Integration**: External service integrations
5. **Advanced Analytics**: Detailed usage statistics

---

This API documentation provides a complete reference for all backend integrations in the Yeser gratitude app, enabling developers to understand and extend the system effectively. 