# Zod Integration Roadmap for Yeşer

**Last Updated:** 2025-06-02 (Cascade AI)

## Guiding Principles:

*   **Incremental Adoption:** Introduce Zod gradually, one area at a time.
*   **Prioritize High-Impact Areas:** Start with areas most prone to data errors or critical for user experience (e.g., authentication, core data models).
*   **Maintain Functionality:** Ensure the app remains fully functional during each phase of integration.
*   **Testing:** Write or update tests alongside Zod integration.
*   **Documentation:** Update relevant documentation as Zod is integrated.

## Phase 0: Preparation & Setup

*   **Status:** Completed
*   **Actions Taken:**
    *   Zod installed as a project dependency.
    *   Core Coding Standards & Documentation updated to include Zod.
    *   Centralized schema location established at `src/schemas/` with files like `authSchemas.ts`, `profileSchema.ts`, `gratitudeEntrySchema.ts`, etc.
    *   Team familiarized with Zod basics.

## Phase 1: Core Data Model Validation

*   **Status:** Largely Completed
*   **Goal:** Validate data fetched from and sent to Supabase for core entities.
*   **Details:**
    *   **`profiles` (`src/schemas/profileSchema.ts`):**
        *   `rawProfileDataSchema`, `profileSchema`, and `updateProfileSchema` are defined.
        *   TypeScript types inferred using `z.infer`.
        *   **Integration:** Used in `src/api/profileApi.ts` and `src/store/profileStore.ts` to validate fetched data and update payloads. `updateProfileSchema` also used for client-side form validation in settings screens.
    *   **`gratitude_entries` (`src/schemas/gratitudeEntrySchema.ts` & `src/schemas/gratitudeSchema.ts`):**
        *   `rawGratitudeEntrySchema`, `gratitudeEntrySchema`, `addStatementPayloadSchema`, `editStatementPayloadSchema`, `deleteStatementPayloadSchema` are defined.
        *   `gratitudeStatementSchema` (from `gratitudeSchema.ts`) for individual statement text.
        *   **Integration:** Payload schemas used in `src/api/gratitudeApi.ts` for RPC calls. `gratitudeStatementSchema` used for client-side input validation in `EnhancedDailyEntryScreen.tsx`.
    *   **`streaks` (`src/schemas/streakSchema.ts`):**
        *   `rawStreakSchema` and `streakSchema` defined.
        *   **Integration:** Used in `src/api/profileApi.ts` when fetching streak data. Primarily for data structure definition, as streak logic is backend-driven.
    *   **Authentication Data (User/Session):**
        *   **Status:** Relies on Supabase client's internal types and validation. No custom Zod schemas are currently used for validating the structure of Supabase user/session objects within the app's state or services beyond form input.

## Phase 2: User Input & Form Validation

*   **Status:** Significantly Implemented
*   **Goal:** Validate all user inputs, particularly in forms, using Zod schemas before API calls or state updates.
*   **Details:**
    *   **Authentication Forms:**
        *   **Screens:** `EnhancedLoginScreen.tsx`, `EnhancedSignUpScreen.tsx`.
        *   **Schemas:** `loginSchema`, `signupSchema` from `src/schemas/authSchemas.ts`.
        *   **Integration:** Zod schemas are used for client-side validation of email, password, username, and password confirmation. Validation errors are displayed to the user.
    *   **Settings & Onboarding Forms:**
        *   **Screens:** `EnhancedReminderSettingsScreen.tsx`, `EnhancedOnboardingReminderSetupScreen.tsx`.
        *   **Schema:** `updateProfileSchema` from `src/schemas/profileSchema.ts`.
        *   **Integration:** Zod schema validates reminder settings (time, enabled status) and daily gratitude goal. Validation errors are displayed.
    *   **Gratitude Entry Forms:**
        *   **Screen:** `EnhancedDailyEntryScreen.tsx` (utilizing `GratitudeInputBar.tsx`).
        *   **Schemas:**
            *   `gratitudeStatementSchema` (from `src/schemas/gratitudeSchema.ts`) for validating individual statement text input.
            *   `addStatementPayloadSchema`, `editStatementPayloadSchema`, `deleteStatementPayloadSchema` (from `src/schemas/gratitudeEntrySchema.ts`) for validating payloads before API calls.
        *   **Integration:** Client-side validation for individual statements and for payloads sent to the backend.
    *   **General Approach:**
        *   Validation occurs within screen components upon form submission or data change.
        *   `.safeParse()` is used to handle validation results.
        *   User-friendly error messages are displayed.

## Phase 3: API Route Handler Validation (Supabase Edge Functions)

*   **Status:** Not yet implemented or audited.
*   **Goal:** Validate request bodies and parameters for any custom Supabase Edge Functions (Deno).
*   **Actions (Future):**
    *   Define Zod schemas for Edge Function payloads if/when custom functions are created.
    *   Integrate validation at the beginning of Edge Function handlers.
    *   Return appropriate HTTP error responses on validation failure.

## Phase 4: Review & Refinement

*   **Status:** Ongoing
*   **Actions:**
    *   Continuous code review for Zod integrations.
    *   Monitor performance (Zod is generally performant).
    *   Iterate on schemas as the application evolves.
    *   Explore advanced Zod features as needed.

## Dependencies & Potential Conflicts:

*   **Zod:** The primary dependency. Lightweight and generally compatible.
*   **TypeScript:** Current version `~5.8.3` is compatible.
*   **Form Libraries:** Currently not using a dedicated form library like `react-hook-form` with a Zod resolver; manual integration is in place.

## How to Avoid Breaking Anything (Key Practices Followed):

*   **Incremental Rollout:** Zod was introduced gradually.
*   **`safeParse`:** Used extensively for graceful error handling.
*   **Thorough Testing:** Manual testing and component/screen logic review accompanied changes.
*   **Co-located Types:** `z.infer` used for type generation, ensuring consistency.

This document will be updated as Zod integration evolves further.