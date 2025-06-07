# Yeşer App: Production Readiness Roadmap

## 1. Introduction

This document outlines the recommended steps to move the Yeşer application from its current, high-quality state to a fully production-ready and scalable product. The existing codebase is exceptionally well-architected, demonstrating strong adherence to modern best practices. This roadmap focuses on addressing critical blockers, optimizing for performance and scale, and refining the user experience.

The tasks are organized into phases based on priority.

---

## 2. Priority Legend

- **🔴 Phase 1: Critical Blockers** - Must be resolved before any production launch. These issues will cause core functionality to fail.
- **🟠 Phase 2: Major Priorities** - Address significant performance, scalability, or security risks. Highly recommended to fix before launch.
- **🟡 Phase 3: Moderate Priorities** - Focus on improving user experience, consistency, and refinement. Can be addressed in a "day one" patch but are best fixed before launch.
- **🟢 Phase 4: Minor Priorities** - Code health, refactoring, and minor optimizations.
- **🚀 Phase 5: Post-Launch & Future Enhancements** - Strategic improvements for long-term health and growth.

---

## 🔴 Phase 1: Critical - Blockers for Launch

### 1.1 Fix iOS Google Sign-In Configuration

- **Priority:** 🔴 Critical
- **File:** `app.json`
- **Description:** The `iosUrlScheme` for the Google Sign-In plugin is a placeholder value. This will cause the OAuth flow to fail on all production and ad-hoc iOS builds.
- **Risk:** **Complete failure of Google Sign-In on iOS.** The app would be rejected by the App Store or be non-functional for iOS users using this sign-in method.
- **Action Items:**
  1.  Obtain the **Reversed Client ID** for your iOS app from your Google Cloud Console credentials page (or `GoogleService-Info.plist` file).
  2.  In `app.json`, replace `"com.googleusercontent.apps.YOUR_IOS_CLIENT_ID"` with the correct reversed client ID.
  3.  Rebuild the development client (`expo run:ios`) or a production build.
  4.  Thoroughly test the Google Sign-In flow on a physical iOS device to confirm it works.
- **Acceptance Criteria:** A user can successfully sign in with Google on a production build of the iOS app.

---

## 🟠 Phase 2: Major - Scalability & Performance

### 2.1 Optimize Multi-Prompt Fetching

- **Priority:** 🟠 Major
- **File:** `promptApi.ts`, Supabase Dashboard
- **Description:** The `getMultipleRandomActivePrompts` function currently fetches _all_ active prompts from the database and performs shuffling on the client.
- **Risk:** This is not scalable. As the number of prompts grows, this will cause slow load times, high data consumption, and increased memory usage on the client device.
- **Action Items:**

  1.  Create the following PostgreSQL function in your Supabase SQL Editor as suggested in the code's `TODO`:
      ```sql
      CREATE OR REPLACE FUNCTION get_multiple_random_active_prompts(p_limit INTEGER)
      RETURNS SETOF daily_prompts AS $$
      BEGIN
        RETURN QUERY
        SELECT * FROM daily_prompts
        WHERE is_active = true
        ORDER BY RANDOM()
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
      ```
  2.  Update the `getMultipleRandomActivePrompts` function in `promptApi.ts` to call this new RPC:

      ```typescript
      // In promptApi.ts
      export const getMultipleRandomActivePrompts = async (
        limit: number = 10
      ): Promise<DailyPrompt[]> => {
        try {
          const { data, error } = await supabase.rpc('get_multiple_random_active_prompts', {
            p_limit: limit,
          });

          if (error) {
            throw handleAPIError(new Error(error.message), 'fetch multiple random active prompts');
          }

          return (data as DailyPrompt[]) || [];
        } catch (err) {
          // ... (error handling remains the same)
        }
      };
      ```

  3.  Remove the now-redundant client-side fetching and shuffling logic.

- **Acceptance Criteria:** The app fetches only the required number of prompts from the API, minimizing data transfer.

### 2.2 Optimize Deletion of Gratitude Entries

- **Priority:** 🟠 Major
- **File:** `useGratitudeMutations.ts`, Supabase Dashboard
- **Description:** The `deleteAllStatementsForEntryMutation` function deletes all statements for an entry by looping and calling the `deleteStatement` RPC multiple times.
- **Risk:** This is inefficient, generates unnecessary network requests, and is not an atomic operation. It could fail midway, leaving the entry in a corrupted state.
- **Action Items:**
  1.  Create a new, dedicated RPC function in Supabase that deletes an entire entry by its date. This is more efficient than deleting by ID, as the date is the primary user-facing identifier.
      ```sql
      CREATE OR REPLACE FUNCTION delete_gratitude_entry_by_date(p_entry_date DATE)
      RETURNS VOID AS $$
      BEGIN
        DELETE FROM gratitude_entries
        WHERE user_id = auth.uid() AND entry_date = p_entry_date;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      ```
  2.  Create a new API helper function in `gratitudeApi.ts` to call this RPC.
  3.  Replace the `deleteAllStatementsForEntryMutation` logic in `useGratitudeMutations.ts` with a new `deleteEntryMutation` that calls the new, single RPC.
- **Acceptance Criteria:** An entire day's entry can be deleted with a single, atomic API call.

---

## 🟡 Phase 3: Moderate - User Experience & Polish

### 3.1 Unify UI with a Reusable Toggle Component

- **Priority:** 🟡 Moderate
- **Files:** `AppearanceSettings.tsx`, `DailyReminderSettings.tsx`, `SettingsScreen.tsx`, `FeatureIntroStep.tsx`
- **Description:** The settings screens use a custom-built animated toggle, while the onboarding flow uses a standard `Switch` from React Native Paper.
- **Risk:** Minor UI inconsistency, which can detract from a polished, professional feel.
- **Action Items:**
  1.  Create a new reusable component, `ThemedSwitch.tsx`, in `/src/shared/components/ui/`.
  2.  Encapsulate the custom animated toggle logic from `AppearanceSettings.tsx` into this new component.
  3.  Replace all instances of `Switch` and the custom toggle logic with the new `ThemedSwitch` component to ensure a consistent look and feel across the app.
- **Acceptance Criteria:** All toggle/switch controls in the app share the same design and behavior.

### 3.2 Implement a Non-Blocking Notification System (Toasts/Snackbars)

- **Priority:** 🟡 Moderate
- **Files:** `DailyEntryScreen.tsx`, `EnhancedOnboardingFlowScreen.tsx`, `GlobalErrorProvider.tsx`
- **Description:** The app frequently uses `Alert.alert()` for showing mutation errors and other feedback, which is a blocking, jarring user experience.
- **Risk:** Poor UX that interrupts the user's flow.
- **Action Items:**
  1.  Choose a library (e.g., `react-native-toast-message`) or build a custom `ToastProvider` using a `Portal`.
  2.  Integrate this provider at the root of the application, likely within `AppProviders.tsx`.
  3.  Modify `GlobalErrorProvider.tsx` to use this new toast/snackbar system instead of `Alert.alert`.
  4.  Refactor screens like `DailyEntryScreen` to use this system for non-critical feedback (e.g., "Settings saved").
- **Acceptance Criteria:** Errors and notifications are displayed in a non-blocking manner, improving the overall user flow.

---

## 🟢 Phase 4: Minor - Code Health & Refinement

### 4.1 Optimize Total Entry Count Query

- **Priority:** 🟢 Minor
- **File:** `gratitudeApi.ts`
- **Description:** The `getTotalGratitudeEntriesCount` function uses a `select('*')` query, which is slightly less efficient than a dedicated count query. The function's JSDoc already suggests a more optimal RPC.
- **Risk:** Negligible at small scale, but could become a minor performance issue with very large tables.
- **Action Items:**
  1.  Implement the `get_user_gratitude_entries_count` RPC in Supabase if it doesn't already exist.
  2.  Update the `getTotalGratitudeEntriesCount` function to call this RPC instead of the `select` query.
- **Acceptance Criteria:** The total entry count is fetched using the most efficient query possible.

### 4.2 Refactor Auth Logic into Service Layer

- **Priority:** 🟢 Minor
- **File:** `authStore.ts`, `authService.ts`
- **Description:** The `loginWithGoogle` action in the Zustand store (`authStore.ts`) contains complex business logic related to `expo-web-browser` and OAuth redirects.
- **Risk:** This violates the principle of separation of concerns, making the state management store harder to test and maintain.
- **Action Items:**
  1.  Ensure the full implementation of the `signInWithGoogle` flow resides within `authService.ts`.
  2.  Update the `loginWithGoogle` action in `authStore.ts` to be a simple proxy that calls `authService.signInWithGoogle()` and handles setting the `isLoading` and `error` state.
- **Acceptance Criteria:** The `authStore` is responsible only for state, while the `authService` handles all implementation details of authentication.

---

## 🚀 Phase 5: Post-Launch & Future Enhancements

### 5.1 Implement CI/CD Pipeline

- **Description:** Automate the build, test, and deployment process for consistency and speed.
- **Action Items:**
  - Set up GitHub Actions or a similar service.
  - Create workflows for linting, testing, and running validation scripts on every pull request.
  - Automate builds and submissions to app stores using EAS Submit.

### 5.2 Enhance Monitoring & Crash Reporting

- **Description:** Proactively monitor application health and track errors in production.
- **Action Items:**
  - Integrate a service like Sentry or Firebase Crashlytics.
  - Add more detailed context (e.g., user ID, current screen) to error reports within the `ErrorBoundary` and `GlobalErrorProvider`.
  - Set up performance monitoring to track API response times and screen load times.

### 5.3 Introduce Feature Flags

- **Description:** Implement a system for remotely enabling or disabling features without requiring a new app release.
- **Action Items:**
  - Use a service like Statsig, LaunchDarkly, or a simple Supabase table.
  - Wrap new or experimental features (like `ThrowbackTeaser`) in a feature flag check.
