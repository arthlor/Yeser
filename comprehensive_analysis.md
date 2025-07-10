# Comprehensive Application Analysis

This document provides a deep-dive analysis of the Yeşer application, covering its architecture, features, and user flows. The goal is to provide a complete overview to inform a future simplification and refactoring of the project.

## 1. High-Level Architecture

The application is a well-structured React Native project built with Expo. It follows modern best practices and a feature-sliced architecture.

- **Frontend Framework:** React Native with Expo
- **Language:** TypeScript
- **State Management:**
  - **Server State:** TanStack Query is used extensively for all server-side data fetching, caching, and mutations. This is the primary state management solution.
  - **Client State:** Zustand is used for managing global client-side state, such as authentication status and theme.
- **Navigation:** React Navigation is used for all screen transitions, with a clear separation between authentication, onboarding, and the main application flows.
- **Backend:** Supabase is used as the backend, with communication happening through its JavaScript client library. The application makes heavy use of Supabase's authentication and RPC (Remote Procedure Calls) features.
- **Styling:** A custom theme system is in place, with support for light and dark modes. Styles are created using `StyleSheet.create`, and theme variables are used for colors and spacing.
- **Data Validation:** Zod is used for schema definition and validation, ensuring data integrity from the API layer to the UI.
- **Code Quality:** The project is configured with ESLint and Prettier to enforce a consistent code style.

## 2. Core Features & User Flows

The application can be broken down into three main user flows: Authentication, Onboarding, and the Core Application.

### 2.1. Authentication Flow

The authentication flow is robust and supports two methods: Magic Link (email) and Google OAuth.

- **Entry Point:** `LoginScreen.tsx`
- **UI:** Provides a clean interface for users to either enter their email for a magic link or sign in with their Google account.
- **State Management:**
  - `coreAuthStore.ts`: A Zustand store that holds the primary authentication state (`isAuthenticated`, `user`).
  - `magicLinkStore.ts` & `googleOAuthStore.ts`: Separate Zustand stores to manage the state and logic for each authentication method.
- **Core Logic:**
  - `authCoordinator.ts`: A facade that centralizes the authentication logic, delegating tasks to the specific service for each method.
  - `magicLinkService.ts`: Manages the entire magic link flow, including validation, rate-limiting, and communication with the backend. It uses optimistic updates for a responsive user experience.
  - `expoGoogleOAuthService.ts`: Manages the Google OAuth flow using Supabase's native `signInWithOAuth` method and `expo-web-browser` for a seamless in-app browser experience.
  - `deepLinkService.ts`: Handles the callback from Google's OAuth flow to complete the authentication process.
- **API Layer:**
  - The services call functions in `authService.ts` (which is a wrapper around the Supabase client) to perform the actual authentication with the backend.

### 2.2. Onboarding Flow

New users who have successfully authenticated are guided through a multi-step onboarding process.

- **Entry Point:** `EnhancedOnboardingFlowScreen.tsx`
- **UI:** A state machine that manages a series of steps:
  1.  `WelcomeStep.tsx`: A static screen that introduces the user to the app's features.
  2.  `InteractiveDemoStep.tsx`: An interactive demo to showcase the app's functionality.
  3.  `GoalSettingStep.tsx`: Allows the user to set a daily gratitude goal.
  4.  `PersonalizationStep.tsx`: Collects the user's name and theme preference. It features a real-time, debounced username availability check.
  5.  `CompletionStep.tsx`: A summary screen that confirms the completion of the onboarding process.
- **State Management:** The `EnhancedOnboardingFlowScreen` uses local `useState` to manage the collected data. Upon completion, it uses the `useUserProfile` hook to persist the data.
- **Core Logic:**
  - `useUsernameValidation.ts`: A reusable hook that provides debounced, real-time username validation by calling the `profileApi`.
  - `useUserProfile.ts`: A TanStack Query hook that encapsulates all profile-related data operations, including the `updateProfile` mutation used to save the onboarding data.
- **API Layer:**
  - `profileApi.ts`: Contains the `checkUsernameAvailability` and `updateProfile` functions that communicate with the Supabase backend.

### 2.3. Core Application: Gratitude Journal

This is the main part of the application, where users can create, view, and manage their gratitude entries. It's accessible via a five-tab navigator.

- **Primary Screen:** `DailyEntryScreen.tsx`
  - **UI:** This is the main screen for adding and viewing gratitude statements for a specific day. It shows the user's progress towards their daily goal and allows for in-place editing of statements.
  - **State & Logic:**
    - `useGratitudeQueries.ts` (`useGratitudeEntry`): Fetches the gratitude entry for the selected day.
    - `useGratitudeMutations.ts`: A sophisticated hook that handles all CUD operations for gratitude statements. It uses optimistic updates and a robust locking mechanism to prevent race conditions.
    - `usePromptText`: Fetches a daily inspirational prompt.
- **Viewing Past Entries:**
  - `PastEntriesScreen.tsx`: Likely uses `useGratitudeEntriesPaginated` to display a list of all past entries.
  - `CalendarViewScreen.tsx`: Uses `useEntryDatesForMonth` to display a calendar view, highlighting the days with entries.
- **API Layer (`gratitudeApi.ts`):**
  - This file contains all the functions that interact with the Supabase backend for gratitude-related data.
  - It makes heavy use of **RPC (Remote Procedure Calls)** for CUD operations, which encapsulates business logic on the database side, making the client-side code cleaner and more secure.
  - For fetching data, it uses standard `select` queries on the `gratitude_entries` table.

## 3. Technical Highlights & Potential Areas for Simplification

- **Strengths:**
  - **Well-Architected:** The application follows modern best practices and has a clean, feature-sliced architecture.
  - **Robust State Management:** The use of TanStack Query for server state is excellent and implemented to a high standard, with optimistic updates and caching strategies.
  - **Reliable Mutations:** The `useGratitudeMutations` hook with its locking mechanism is a standout piece of engineering that ensures data integrity.
  - **Efficient API Layer:** The use of Supabase RPCs for mutations is an efficient and secure way to interact with the backend.
- **Potential Areas for Simplification:**
  - **Complexity:** The application is indeed very complex for its core functionality. The number of files, services, and hooks could be reduced.
  - **State Management:** While powerful, the combination of Zustand stores and callbacks for state updates in some places (like the older parts of the auth flow) could be streamlined to use a more consistent pattern, relying more heavily on TanStack Query where possible.
  - **Component Granularity:** Some components could be broken down into smaller, more reusable pieces.
  - **Over-engineering:** Some features, like the complex animation system (which has already been partially simplified) and the manual locking in `useGratitudeMutations`, might be overkill for the current requirements and could be simplified with more modern libraries or patterns if available.

## 4. Conclusion

This is a high-quality, feature-rich application with a solid technical foundation. The complexity arises from a desire to create a robust, performant, and reliable user experience.

The path to simplification should focus on:

1.  **Reducing Boilerplate:** Consolidating services and hooks where possible.
2.  **Streamlining State Management:** Adopting a more unified state management strategy.
3.  **Refactoring Key Components:** Breaking down large components into smaller, more manageable ones.
4.  **Re-evaluating Complex Logic:** Assessing whether complex patterns like manual locking are still necessary or if they can be replaced with simpler solutions.

This analysis provides the necessary foundation to begin this simplification process with a clear understanding of the application's current state.

# Notification System Audit & Refactor Plan

This document provides a comprehensive audit of the legacy notification system and outlines the necessary steps for its complete removal, preparing the codebase for a new, streamlined implementation.

## 1. High-Level Summary of Legacy System

The previous notification system was a mix of client-side logic using Expo's notification library and backend logic implemented with Supabase database functions (RPCs).

- **Client-Side:** Managed permissions, token registration, and settings UI. A central `notificationService.ts` (now deleted) likely handled these tasks.
- **Backend (Supabase):** Stored push tokens and contained RPCs for sending different types of notifications (e.g., `send_daily_reminders`, `send_throwback_reminders`), likely triggered by scheduled jobs.

## 2. Code Artifacts to be Removed or Refactored

The following is a list of files that still contain code from the old notification system.

### Files/Code to be DELETED:

1.  **`src/components/debug/ToastTester.tsx`**: A significant portion of this file is dedicated to testing the old notification service and Supabase RPCs. This should be removed. The rest of the file can be kept if it is useful for testing other features.
2.  **`src/components/index.ts`**: The export for the deleted `NotificationToggle` component must be removed.
3.  **`src/utils/cleanupSingletons.ts`**: The import and usage of `notificationService` must be removed to prevent runtime errors.
4.  **`src/types/navigation.ts`**: The `OnboardingReminderSetup` and `ReminderSettings` types should be removed as these screens are deprecated.
5.  **`src/App.tsx`**: The linking configuration for `OnboardingReminderSetup` and `ReminderSettings` should be removed.

### Files to be REFACTORED:

1.  **`src/features/settings/screens/SettingsScreen.tsx`**: This file has a lot of state and logic for handling the old `NotificationToggle`. All of this, including the `handleNotificationToggle` function, related state variables, and the component usage, must be removed.
2.  **`src/services/analyticsService.ts`**: The `trackNotificationAnalytics` function is now dead code and should be removed. The `ReminderSettings` from `ScreenName` type should also be removed.
3.  **`src/App.tsx`**: The logic for handling incoming notifications should be reviewed and adapted for the new system. The current implementation for deep linking seems valuable and could be reused.
4.  **`src/features/onboarding/screens/EnhancedOnboardingFlowScreen.tsx`**: The logic for setting `notifications_enabled` during onboarding needs to be preserved and integrated with the new notification service.
5.  **Backend (Supabase)**: You should review the existing Supabase RPCs (`send_daily_reminders`, `register_push_token`, etc.) and tables (`push_tokens`). You may want to simplify or replace them based on the new implementation. I'll remember you prefer to use the Supabase dashboard for this. [[memory:403960]]

## 3. Path to a Fresh Implementation

With the old system's remnants removed, here's a high-level approach for the new implementation:

1.  **New Notification Service:** Create a new, well-defined `notificationService.ts` that will be the single source of truth for all notification-related logic on the client-side.
2.  **Permissions and Token Management:** The new service should handle requesting permissions and managing the Expo push token.
3.  **UI Components:** A new, simplified UI for notification settings should be created if needed.
4.  **Backend Integration:** The new service will communicate with the (potentially refactored) Supabase backend to register tokens and fetch notification-related user preferences.
5.  **Deep Linking:** The existing deep linking logic in `App.tsx` should be connected to the new notification service to handle incoming notifications.

This audit provides a clear path to cleaning up the codebase. By removing all the legacy code, we can build a more robust and maintainable notification system.
