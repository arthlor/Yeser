# Yeşer - Architecture & Technical Strategy

## 1. Introduction

This document outlines the technical choices, architectural patterns, and overall strategy employed in the development of the Yeşer application. The primary goals are to build a high-quality, scalable, and maintainable mobile application that provides a seamless and calming user experience for gratitude journaling.

## 2. Core Technology Stack

| Component         | Technology                                      | Rationale                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mobile App**    | React Native + Expo SDK                         | **Cross-platform development (iOS/Android)** from a single codebase. Expo's **managed workflow** simplifies development, provides easy access to native APIs (e.g., Notifications), enables **EAS Build/Submit**, and supports **Over-The-Air (OTA) updates**. |
| **Backend (BaaS)**| Supabase                                        | Comprehensive **open-source Firebase alternative**. Provides **Authentication** (Email/Password, Google OAuth), **PostgreSQL Database** with Row Level Security (RLS), **Storage**, and serverless **Edge Functions (RPCs for custom PL/pgSQL functions)**. Offers auto-generated APIs, **database triggers for automated backend logic**, and a generous free tier. Leverages PostgreSQL's capabilities for complex queries and data integrity. |
| **Language**      | TypeScript                                      | Enhances JavaScript with **static typing**, leading to improved code quality, better developer experience (autocompletion, refactoring), and early error detection. **End-to-end type safety is a key goal, facilitated by Supabase's auto-generated database types** (as seen in `src/types/database.types.ts`) and Zod for schema validation. |
| **State Mgmt**  | Zustand                                         | A small, fast, and scalable state management solution. Chosen for its **simplicity, minimal boilerplate** compared to Redux, and ease of use with React hooks for managing global application state.        |
| **Navigation**    | React Navigation                                | The de-facto standard for routing and navigation in React Native applications, offering a flexible and robust **declarative navigation structure** (stack, tab navigators).                               |
| **Validation**    | Zod                                             | **TypeScript-first schema declaration and validation** library. Used for validating data structures, particularly API request/response payloads, form inputs, and environment variables, ensuring data integrity and type safety. Facilitates deriving TypeScript types from schemas. |
| **Analytics**     | Google Analytics 4 (via `@react-native-firebase/analytics`) | To gather insights into user behavior, feature adoption, and app performance. Integrated via `analyticsService.ts`. Chosen for robust general analytics and ecosystem integration.                     |
| **Notifications** | Expo Notifications                              | Leverages Expo's unified API for scheduling **local notifications** for daily and throwback reminders across iOS and Android.                                                                             |
| **Code Quality**  | ESLint + Prettier                               | Enforces consistent coding styles and identifies potential errors, contributing to **code readability and maintainability**. Configured according to Yeşer's Core Coding Standards.                       |

## 3. Application Architecture

The Yeşer application follows a modular, component-based architecture designed for separation of concerns and maintainability.

*   **Presentation Layer (UI):**
    *   Composed of React Native components, organized into screens (`src/screens`) and reusable UI elements (`src/components`).
    *   Theming is managed via a centralized theme provider (`src/providers/EnhancedThemeProvider.tsx` and theme definitions in `src/themes`) supporting light/dark modes using semantic tokens as defined in the `EnhancedAppTheme` type.

*   **State Management Layer:**
    *   Global application state (e.g., user session, profile data, theme preference, gratitude entries) is managed by Zustand stores located in `src/store` (e.g., `authStore.ts`, `profileStore.ts`, `themeStore.ts`, `gratitudeStore.ts`).

*   **Service Layer:**
    *   Encapsulates business logic and external API interactions.
    *   `src/services`: Handles client-side services like authentication (`authService.ts`), analytics (`analyticsService.ts`), and notification scheduling (`notificationService.ts`).
    *   `src/api`: Manages direct data interactions with the Supabase backend (e.g., `profileApi.ts`, `gratitudeApi.ts`), **including invoking custom PL/pgSQL functions via Supabase RPCs** for complex operations and business logic (e.g., `add_gratitude_statement`, `update_user_streak`).

*   **Navigation Layer:**
    *   Defined in `src/navigation` using React Navigation.
    *   Manages different navigation stacks like `AuthStack.tsx` (for login/signup flows) and `AppStack.tsx` (main application flow post-authentication, including `AppTabs.tsx` for bottom tab navigation).
    *   `RootNavigator.tsx` orchestrates the switch between these stacks based on authentication state.

### Typical Data Flow Example (e.g., Adding a Gratitude Entry):

1.  **User Interaction:** User types their gratitude entry in `EnhancedDailyEntryScreen.tsx` and taps the "Save" button.
2.  **UI Event Handler:** The button's `onPress` handler calls a function within the screen component.
3.  **Store Action:** This function typically dispatches an action to a Zustand store (e.g., `gratitudeStore.addEntry(entryText)`).
4.  **API Service Call:** The store action invokes a function in the `gratitudeApi.ts` service (e.g., `gratitudeApi.addGratitudeEntry(userId, entryData)`).
5.  **Supabase Request:** The API service function constructs and sends a request to Supabase (e.g., an `insert` operation on the `gratitude_entries` table, **or a call to an RPC like `add_gratitude_statement`**).
6.  **Supabase Processing:** Supabase processes the request. If it's a direct table operation, data is inserted/updated. **If it's an RPC, the corresponding PL/pgSQL function (e.g., `add_gratitude_statement`) executes, potentially modifying data and/or triggering other database functions (e.g., `update_user_streak` via the `on_gratitude_entry_change` trigger).** Supabase then returns a response.
7.  **API Service Response Handling:** The `gratitudeApi.ts` function receives the response, handles potential errors, and returns data/status to the store action.
8.  **Store State Update:** The Zustand store action updates the relevant parts of its state (e.g., adding the new entry to a list, setting loading/error flags).
9.  **UI Re-render:** React components subscribed to the `gratitudeStore` (like `EnhancedDailyEntryScreen.tsx` or `EnhancedPastEntriesScreen.tsx`) automatically re-render to reflect the new state (e.g., clearing the input, showing a success message, updating the list of entries).

### 3.1 Backend Logic & Data Integrity

A significant portion of Yeşer's business logic and data integrity enforcement resides within the Supabase PostgreSQL backend, leveraging its powerful features:

*   **Custom SQL Functions (PL/pgSQL):** Core operations are encapsulated in SQL functions, callable via Supabase RPC. This centralizes logic, ensures atomicity, and reduces client-side complexity. Examples include:
    *   `add_gratitude_statement`: Adds or appends a gratitude statement to an entry for a specific date.
    *   `edit_gratitude_statement`: Modifies an existing gratitude statement.
    *   `delete_gratitude_statement`: Removes a statement; if an entry becomes empty, the entry itself is deleted.
    *   `update_user_streak`: Recalculates and updates the user's current and longest streaks based on their gratitude entries. This is a critical piece of backend logic.
    *   `get_random_gratitude_entry`: Fetches a random past gratitude entry for the user.
    *   `get_entry_dates_for_month`: Retrieves all dates within a given month/year for which a user has entries.
*   **Database Triggers:** Automated actions are performed in response to data modifications, ensuring consistency and timely updates:
    *   `handle_gratitude_entries_update_updated_at`: Automatically updates the `updated_at` timestamp for gratitude entries.
    *   `on_gratitude_entry_change`: Triggered after `INSERT`, `DELETE`, or `UPDATE` on `gratitude_entries` to call `update_user_streak`, ensuring streak data is always current.
    *   `handle_updated_at` (for `profiles`): Uses `moddatetime` to update `updated_at` on profile changes.
    *   `handle_streaks_update_updated_at`: Automatically updates the `updated_at` timestamp for streaks.
    *   A trigger for `handle_new_user` (based on the `handle_new_user` function definition) populates the `profiles` and `streaks` table upon new user creation in `auth.users`.
*   **Data Validation & Constraints:** Beyond client-side validation with Zod, the database enforces integrity through:
    *   **PostgreSQL Constraints:** `NOT NULL`, `UNIQUE` (e.g., `unique_user_entry_date` on `gratitude_entries`, `streaks_user_id_key`), primary keys, and foreign key constraints (e.g., linking `gratitude_entries`, `profiles`, `streaks` to `auth.users(id)` with `ON DELETE CASCADE`).
    *   **Data Types:** Strict data typing within PostgreSQL tables (e.g., `date`, `timestamp with time zone`, `uuid`, `jsonb`). Careful handling of type conversions between the database (e.g., string dates from `profileApi.ts` as noted in memory `8826eab6-18e2-41e8-b2a7-67d14d175d25`) and the frontend is crucial, sometimes requiring utility functions on the client like `parseTimeStringToValidDate` (memory `4e9b8b72-c338-4177-8bbc-ee9d91d53e78`).
*   **Supabase-Generated TypeScript Types:** The `supabase gen types typescript` command generates detailed TypeScript definitions from the database schema (`Database` type in `src/types/database.types.ts`), enabling strong typing for all database interactions on the client-side, significantly reducing integration errors.

## 4. Directory Structure (`src/`)

The `src/` directory is organized to promote modularity and maintainability:

*   `api/`: Functions for interacting with the Supabase backend, **including direct table operations and invoking custom PL/pgSQL business logic via RPC calls** (for `profiles`, `gratitude_entries`, `streaks`). Includes Supabase client initialization.
*   `assets/`: Static assets such as images, custom fonts, and icons.
*   `components/`: Reusable UI components shared across multiple screens.
    *   `common/`: Generic, widely applicable components (e.g., `ThemedText`, `ThemedButton`, `ThemedView`).
    *   `features/`: Components specific to certain features (e.g., `GratitudeInputForm`, `StreakDisplay`).
*   `constants/`: Application-wide constants, such as route names, Supabase table names, event names, or potentially color palettes if not fully managed by the theme system.
*   `hooks/`: Custom React hooks (e.g., `useAuthStatus`, `useUserProfile`, `useAppTheme`).
*   `navigation/`: React Navigation setup, including navigators (stack, tab), route definitions, and screen stack configurations (e.g., `RootNavigator.tsx`, `AuthStack.tsx`, `AppStack.tsx`, `AppTabs.tsx`).
*   `providers/`: React Context providers, primarily for theming (`EnhancedThemeProvider.tsx`).
*   `screens/`: Top-level screen components, each representing a distinct view in the application (e.g., `EnhancedLoginScreen.tsx`, `EnhancedDailyEntryScreen.tsx`, `EnhancedSettingsScreen.tsx`).
*   `services/`: Client-side service integrations and business logic (e.g., `authService.ts` for authentication flows, `analyticsService.ts` for event tracking, `notificationService.ts` for managing local notifications).
*   `store/`: Zustand store definitions for global state management (e.g., `authStore.ts`, `profileStore.ts`, `themeStore.ts`, `gratitudeStore.ts`).
*   `themes/`: Theme definitions, including light and dark color schemes, typography scales, spacing, and semantic design tokens (`lightTheme.ts`, `darkTheme.ts`, `appTheme.ts`, `semanticTokens.ts`).
*   `types/`: TypeScript type definitions, interfaces, and enums. **Crucially, this includes `database.types.ts` which contains auto-generated types from the Supabase schema, ensuring type safety for all backend interactions.** Also includes custom application types (e.g., `GratitudeEntry.ts`, `UserProfile.ts`, `AppTheme.ts`).
*   `utils/`: Utility functions and helpers (e.g., date formatters, **utility functions like `parseTimeStringToValidDate` for handling potential `HH:MM:SS` string to `Date` object conversions (memory `4e9b8b72-c338-4177-8bbc-ee9d91d53e78`)**, string manipulation, validation helpers).

## 5. Coding Standards & Linting

Development adheres to the **Yeşer - Core Coding Standards** (see `MEMORY[user_global]` or the root `docs/coding-standards.md` if it were a separate file). These standards are enforced through **ESLint** and **Prettier** configurations, covering TypeScript best practices, React-specific rules, import ordering, and code formatting to ensure consistency, readability, and maintainability across the codebase.

## 6. Scalability & Maintainability

The chosen technology stack and architectural patterns are designed with scalability and maintainability in mind:
*   **Modularity:** Separation of concerns into distinct layers (UI, state, services, API) allows for easier updates and debugging.
*   **TypeScript:** Static typing reduces runtime errors and improves code comprehensibility.
*   **Supabase:** Offers a scalable backend infrastructure that can grow with user demand.
*   **Expo (EAS):** Simplifies the build, deployment, and update process, allowing for efficient iteration.
*   **Zustand:** Its simplicity and performance characteristics are well-suited for managing state in a growing application.
*   **Coding Standards:** Consistent code structure makes it easier for developers to understand and contribute to the project.
*   **Centralized Backend Logic:** Utilizing Supabase SQL functions and triggers centralizes critical business logic, making it more robust, easier to manage, and independent of client-side changes.

Use code with caution.
