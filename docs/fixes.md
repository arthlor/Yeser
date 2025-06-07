# Application Deployment Checklist

This document contains a comprehensive and prioritized list of action items identified during a multi-pass audit of the codebase. Completing these tasks will harden the application for a robust, secure, and scalable production deployment.

## Priority Levels

- **⚫ Ultimate Priority:** System-level issues that affect core stability and integrity. Fix alongside Critical items.
- **🔴 Critical:** Bugs that will cause significant user-facing failures. **Deployment blockers.**
- **🟡 High Priority:** Issues posing significant risks to user experience, data integrity, security, and scalability. Strongly recommended to fix before launch.
- **🟢 Medium Priority:** Important items for improving code quality, developer experience, and preventing future technical debt.
- **🔵 Low Priority:** Code quality and "housekeeping" tasks that are good to complete but not essential for launch.

---

### ⚫ Ultimate Priority (System Integrity)

- [ ] **Handle Catastrophic Auth Initialization Failure**

  - **File(s):** `src/store/authStore.ts`, `src/navigation/RootNavigator.tsx`
  - **Task:** The app must gracefully handle a failure to connect to Supabase on initial load. Currently, this would result in a frozen splash screen.
  - **Action:** In `RootNavigator.tsx`, consume the `error` state from `useAuthStore`. If an error exists after `isLoading` is false, render a dedicated error screen with a "Try Again" button that re-runs `initializeAuth`.

- [ ] **Fix Data Inconsistency with Default Reminder Time**

  - **File(s):** `src/utils/dateUtils.ts`, Reminder Settings UI Component
  - **Task:** The app incorrectly shows "20:00" for users who have never set a reminder time, creating a data integrity bug.
  - **Action:** Modify `parseTimeStringToValidDate` to return `null` if the input is `null`. The UI must then handle this null value by showing appropriate placeholder text (e.g., "Not set").

- [ ] **Make Build Environment a Hard Requirement**
  - **File(s):** Build scripts (e.g., `eas.json`), documentation
  - **Task:** Prevent accidental deployment of non-production builds, which could leak sensitive debug information.
  - **Action:** Add a pre-build step to your CI/CD pipeline that fails the build if `EXPO_PUBLIC_APP_ENVIRONMENT` is not set to `'production'` for a production release. Document this requirement.

---

### 🔴 Critical (Deployment Blockers)

- [ ] **Fix Onboarding Loop on Profile Fetch Failure**

  - **File(s):** `src/navigation/RootNavigator.tsx`
  - **Task:** An authenticated user will be incorrectly forced into the onboarding flow if their profile fails to load, creating a frustrating loop.
  - **Action:** Explicitly handle the `isLoading` and `isError` states from the `useUserProfile` hook. Only check the `onboarded` status after a successful profile load.

- [ ] **Implement Recurring Monthly Notifications**
  - **File(s):** `src/services/notificationService.ts`
  - **Task:** The monthly "throwback" reminder is currently a one-time event and does not repeat.
  - **Action:** Refactor the `'monthly'` frequency logic in `scheduleThrowbackReminder`. Since there is no direct monthly trigger, implement a reliable rescheduling mechanism (e.g., reschedule upon app open if a future notification isn't already set).

---

### 🟡 High Priority (Strongly Recommended Before Launch)

- [ ] **Implement Pagination for Gratitude Entries**

  - **File(s):** `src/api/gratitudeApi.ts`, `src/features/calendar/screens/PastEntriesScreen.tsx`
  - **Task:** Fetching all user entries at once is not scalable and will cause performance degradation and crashes.
  - **Action:** Modify the API to support pagination (`range`). Use `useInfiniteQuery` and a `FlatList` with `onEndReached` in the UI to fetch data in pages.

- [ ] **Pass IDs, Not Full Objects, in Navigation**

  - **File(s):** `src/types/navigation.ts`, components navigating to `EntryDetail`.
  - **Task:** Passing full data objects in navigation can lead to showing stale data.
  - **Action:** Change the `EntryDetail` navigation param to accept an `entryId: string`. The `EntryDetailScreen` must then use this ID to fetch the latest data with React Query.

- [ ] **Use Configured Log Level in Logger**

  - **File(s):** `src/utils/debugConfig.ts`
  - **Task:** The logger's level is hardcoded, ignoring the `EXPO_PUBLIC_LOG_LEVEL` environment variable.
  - **Action:** Initialize the logger's level based on `config.debug.logLevel` from `config.ts`.

- [ ] **Align `reminder_time` Schema with Database Constraint**

  - **File(s):** `src/schemas/profileSchema.ts`
  - **Task:** The Zod schemas allow `null` for `reminder_time`, but the database likely requires a value (`NOT NULL`), risking a runtime crash.
  - **Action:** Verify the database constraint and remove `.nullable()` from all `reminder_time` schema definitions to match.

- [ ] **Enforce Server-Side Password Strength**

  - **File(s):** N/A (Supabase Dashboard)
  - **Task:** Password complexity is only enforced on the client and can be bypassed.
  - **Action:** Configure password strength requirements in the Supabase Dashboard (`Authentication -> Settings -> Password`) to match your client-side rules.

- [ ] **Ensure Cleanup of Exported Files**

  - **File(s):** Data Export UI Component
  - **Task:** Temporary PDF export files may be left on the user's device if sharing is cancelled or fails.
  - **Action:** Wrap the export/share logic in a `try...finally` block and ensure `cleanupTemporaryFile()` is called in the `finally` block.

- [ ] **Improve API Error Debuggability**
  - **File(s):** `src/utils/apiHelpers.ts`
  - **Task:** `handleAPIError` discards the original error's stack trace, making debugging harder.
  - **Action:** Modify `handleAPIError` to enrich the original error object with a user-friendly message, rather than creating a `new Error()`. Return the original, enriched error object.

---

### 🟢 Medium Priority (Quality & Scalability)

- [ ] **Consolidate Query Retry Logic**

  - **File(s):** `src/api/queryClient.ts`, `src/utils/apiHelpers.ts`
  - **Task:** Retry logic is defined in two places.
  - **Action:** Import and use `getRetryConfig()` from `apiHelpers.ts` within the `queryClient` default options to create a single source of truth.

- [ ] **Resolve Conflicting Schema Names**

  - **File(s):** `src/schemas/gratitudeEntrySchema.ts`, `src/schemas/gratitudeSchema.ts`
  - **Task:** Two files export a schema with the same name (`gratitudeEntrySchema`), which is a bug risk.
  - **Action:** Rename `gratitudeSchema.ts` to `gratitudeFormSchema.ts` and rename its exported schemas to be more specific (e.g., `gratitudeEntryFormSchema`).

- [ ] **Improve Navigation Prop Types**

  - **File(s):** `src/types/navigation.ts`
  - **Task:** Using `any` for navigation props misses out on TypeScript's type safety.
  - **Action:** Replace `any` with strongly-typed generics from React Navigation (e.g., `StackScreenProps`, `CompositeScreenProps`).

- [ ] **Provide UI Feedback for OAuth Cancellation**

  - **File(s):** `src/services/authService.ts`, `src/store/authStore.ts`
  - **Task:** The UI doesn't know if a user cancelled the Google login flow.
  - **Action:** Modify `signInWithGoogle` to return a status object. The store and UI can then react to a `cancelled` state.

- [ ] **Add Analytics for Core Navigation Events**
  - **File(s):** `src/navigation/RootNavigator.tsx`
  - **Task:** Core user navigation between tabs is not tracked.
  - **Action:** In the `listeners` prop for each `Tab.Screen`, log an analytics event for `tab_pressed` with the tab name.

---

### 🔵 Low Priority (Code Quality & Cleanup)

- [ ] **Remove Unused Code**

  - **File(s):** `src/types/navigation.ts`, `src/utils/performanceMonitor.ts`, `src/utils/apiHelpers.ts`
  - **Task:** Dead code adds clutter.
  - **Action:** Delete the unused `MainAppStackParamList`, `PerformanceMonitor` class, and `isNetworkError` helper function.

- [ ] **Refactor Haptics Helper**

  - **File(s):** `src/utils/hapticFeedback.ts`
  - **Task:** Duplicated `try/catch` logic.
  - **Action:** Create a higher-order function `withHapticHandling` to wrap haptic calls and remove duplication.

- [ ] **Proactively Clear Cache on Logout**

  - **File(s):** `src/store/authStore.ts`
  - **Task:** Improve the robustness of the logout process.
  - **Action:** In the `logout` action, get the `userId`, sign out, and then immediately call a helper to clear that user's cached data.

- [ ] **Consider Server-Side Shuffling for Prompts (Future-proofing)**
  - **File(s):** `src/api/promptApi.ts`
  - **Task:** Client-side shuffling of prompts may become inefficient as the prompt list grows.
  - **Action:** For a future version, consider replacing the client-side logic with a database RPC that performs random shuffling and limiting on the server.
