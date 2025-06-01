# Unit Testing (Jest)

**Focus:** Pure business logic, utility functions, state management logic (Zustand stores, React Context reducers/actions), custom hooks.

**Tools:** Jest

**Scope (Based on Phases 0-2):**

### 1. Authentication (`src/services/authService.ts`, `src/store/authStore.ts`)
- **`authService.ts`:**
  - `[x] signUpWithEmail` (aliased as `signUp` in docs): Mock Supabase client, test success/error scenarios.
  - `[x] signInWithEmail` (aliased as `signInWithPassword` in docs): Mock Supabase client, test success/error (invalid credentials, network issues).
  - `[x] signInWithGoogle` (aliased as `signInWithOAuth` in docs): Mock Supabase client, test success/error, correct provider call (current behavior with disabled WebBrowser tested).
  - `[x] signOut`: Mock Supabase client, test success/error.
  - `[x] getCurrentUser` (implicitly tested via `getSession` and `onAuthStateChange`, but also directly tested): Mock Supabase client, test user retrieval.
  - `[x] getCurrentSession` (aliased as `getSession` in docs): Mock Supabase client, test session retrieval.
  - `[x] onAuthStateChange`: Mock Supabase client, test listener setup, callback execution, and subscription handling.
- **`authStore.ts` (Zustand):**
  - `[x] loginWithEmail` action: Verified state changes (user, session, loading, error) based on service responses (mocked) and `onAuthStateChange` listener interaction.
  - `[x] signUpWithEmail` action: Verified state changes (user, session, loading, error) based on service responses (mocked) and `onAuthStateChange` listener interaction.
  - `[ ] loginWithGoogle` action: (Pending implementation in store)
  - `[x] logout` action: Verified state changes (user, session, loading, error) based on service responses (mocked) and `onAuthStateChange` listener interaction.
  - `[x] initializeAuth` action: Verified session loading, listener setup, and initial state setting.
  - `[x]` Direct state setters (`setLoading`, `setError`, `clearError`): Verified direct state manipulation.
  - Selectors: Implicitly tested via state assertions. Explicit selector tests can be added if complex selectors are introduced.
  - Persistence: (Harder to unit test directly, focus on actions correctly setting state that would be persisted).

### 2. Profile Management (`src/api/profileApi.ts`, `src/store/profileStore.ts`)
- **`profileApi.ts`:**
  - `getProfile`: Mock Supabase client, test success (profile found/not found), error scenarios.
  - `updateProfile`: Mock Supabase client, test success/error, correct data mapping.
- **`profileStore.ts` (Zustand):**
  - `fetchProfile`, `updateUserProfile` actions: Verify state changes (profile data, loading, error) based on API responses (mocked).
  - Selectors: Test selectors for profile fields (username, reminder settings, onboarded status, etc.).
  - Persistence: (Focus on actions correctly setting state).

### 3. Gratitude Management (`src/api/gratitudeApi.ts`)
- **`gratitudeApi.ts`:**
  - `addGratitudeEntry`: Mock Supabase client, test success/error, correct data mapping for single/multiple items.
  - `getGratitudeEntries`: Mock Supabase client, test success/error, data transformation.
  - `updateGratitudeEntry`: Mock Supabase client, test success/error, correct data mapping.
  - `deleteGratitudeEntry`: Mock Supabase client, test success/error.
  - `calculateStreak` (RPC call): Mock Supabase client `rpc()` method, test success/error, parameter passing.

### 4. Hooks (`src/hooks/`)
- **`useStreak.ts`:**
  - Mock `gratitudeApi.calculateStreak`.
  - Test initial state, loading state, error state.
  - Test streak calculation logic for various scenarios (no entries, single entry, multiple consecutive entries, entries with gaps).
  - Test interaction with Zustand store if applicable (e.g., if it updates a global streak state).

### 5. Utilities (`src/utils/`)
- Date utility functions (e.g., formatting for display, date comparisons if any).
- Validation logic (e.g., input validation for entry text, email, password if not handled by forms/Supabase directly).
- Any other helper functions with pure logic.

### 6. Services (`src/services/`)
- **`notificationService.ts`:**
  - `scheduleDailyReminder`: Mock `expo-notifications` functions, verify correct scheduling parameters (time, content, trigger).
  - `cancelAllReminders`: Mock `expo-notifications`.
  - Permission handling logic (requesting, checking status) if any.

**Mocking Strategy:**
- Mock `src/utils/supabaseClient.ts` for all Supabase interactions.
- Mock `expo-notifications` for notification service testing.
- Mock AsyncStorage if directly used by stores and testable.
