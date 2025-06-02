# Roadmap: Basic Profile System for Yeşer App

This document outlines the steps to implement a basic profile system in the Yeşer application. The goal is to allow users to view their registered email and view/edit their username, with considerations for future enhancements like profile pictures and bios.

This plan adheres to the existing architecture (Supabase backend, Zustand for state, themed components) and the Yeşer Core Coding Standards.

## I. Backend (Supabase)

1.  **Verify `profiles` Table Schema:**
    *   **Action:** Check your `profiles` table in Supabase.
    *   **Confirmation:**
        *   Ensure a `username` column (type `TEXT`, nullable or with a default) exists. (Already in use based on `api/profileApi.ts`).
        *   Ensure `created_at` (type `TIMESTAMPTZ`) exists (Supabase usually adds this by default). This can be useful for displaying "Member since" information.
    *   **(Future Enhancement Consideration):**
        *   When ready to expand, add `avatar_url` (type `TEXT`, nullable) for profile pictures and `bio` (type `TEXT`, nullable) for a short user biography.

2.  **Review Row Level Security (RLS) Policies for `profiles` Table:**
    *   **Action:** Examine the RLS policies on your `profiles` table.
    *   **Ensure:**
        *   Users can only select their own profile data (e.g., `auth.uid() = id`).
        *   Users can only update their own profile data (e.g., `auth.uid() = id`).
    *   **(Future Enhancement Consideration for Avatars):** If implementing avatar uploads to Supabase Storage, ensure appropriate RLS policies for the avatar storage bucket (e.g., users can upload to their own designated path, public read access or signed URLs for displaying avatars).

### Supabase `profiles` Table Schema Reminder

This section serves as a quick reference for the `profiles` table structure in Supabase.

**Core Fields (as per current implementation & `profileApi.ts`):**

*   `id` (UUID, Primary Key, Foreign Key to `auth.users.id`): User's unique identifier.
*   `username` (TEXT, nullable): User's display name.
*   `reminder_enabled` (BOOLEAN, default: `true`): Daily reminder preference.
*   `reminder_time` (TIME, default: `'20:00:00'`): Preferred time for daily reminders.
*   `onboarded` (BOOLEAN, default: `false`): Tracks if the user has completed onboarding.
*   `throwback_reminder_enabled` (BOOLEAN, default: `true`): Throwback reminder preference.
*   `throwback_reminder_frequency` (TEXT, default: `'weekly'`): Frequency for throwback reminders (e.g., 'daily', 'weekly', 'monthly').
*   `updated_at` (TIMESTAMPTZ, nullable): Timestamp of the last profile update.
*   `created_at` (TIMESTAMPTZ, default: `now()`): Timestamp of profile creation.

## II. API Layer (`src/api/profileApi.ts`)

1.  **For Basic Profile (Email/Username):**
    *   **`getProfile()`:** Already fetches `username`. No changes needed for this basic scope.
    *   **`updateProfile()`:** Already supports updating `username` as it accepts `Partial<ProfileResponse>`. No changes needed for this basic scope.
    *   **`ProfileResponse` type:** Already includes `username`.
2.  **(Future Enhancement Consideration):**
    *   If adding `avatar_url`, `bio`, or fetching `created_at`:
        *   Update the `select` statement in `getProfile()`.
        *   Update `updateProfile()` to handle these fields in `profileUpdates` and its `select` statement.
        *   Update the `ProfileResponse` type.

## III. State Management (`src/store/profileStore.ts`)

1.  **Review `ProfileState` Interface:**
    *   The `username: string | null;` field is already present.
    *   **(Future Enhancement Consideration):** Add `avatar_url: string | null;` and `bio: string | null;` to the state and `initialState`.

2.  **Add Action for Username Update:**
    *   **Action:** Define a new action in `ProfileActions` and implement it in `useProfileStore`.
    *   **Example Action:**
        ```typescript
        // In ProfileActions interface
        updateUsername: (newUsername: string) => Promise<void>;

        // In useProfileStore implementation
        updateUsername: async (newUsername) => {
          set({ loading: true, error: null });
          try {
            const updatedProfile = await updateProfileApi({ username: newUsername });
            if (updatedProfile) {
              set(state => ({ ...state, ...updatedProfile, loading: false }));
            } else {
              throw new Error('Failed to update profile with new username.');
            }
          } catch (e: any) {
            console.error('[profileStore] Error updating username:', e);
            set({ error: e.message || 'Could not update username.', loading: false });
          }
        },
        ```
    *   **(Future Enhancement Consideration):** Generalize to `updateCoreProfile(updates: Partial<Pick<ProfileState, 'username' | 'avatar_url' | 'bio'>>) => Promise<void>;`.

## IV. Frontend UI (`src/screens/EnhancedSettingsScreen.tsx`)

1.  **Update `EnhancedSettingsScreen.tsx` for Profile Management:**
    *   **Purpose:** Integrate basic profile viewing and editing directly within the existing settings screen.
    *   **Additions to `EnhancedSettingsScreen.tsx` Content & Layout:**
        *   **Account Information Section:** Consider grouping profile-related items under a new sub-header like "Account Information" or "Profile".
        *   **User Email (Read-Only):** Display `user.email` from `useAuthStore()`. This can be a simple text display, perhaps next to a label like "Email:".
        *   **Username (View & Edit):**
            *   Display current `username` from `useProfileStore()`. 
            *   Use a `TextInput` component (e.g., a themed one if available) to allow editing the username. Populate it with the current username.
        *   **(Optional) Member Since (Read-Only):** If you decide to fetch and store `created_at` in `profileStore`, display it here formatted nicely (e.g., "Member since: January 1, 2024").
        *   **Save Username Button:**
            *   A `ThemedButton` labeled "Save Username" or "Update Username".
            *   This button should be specifically for saving username changes.
            *   On press, it should call the `updateUsername` action from `useProfileStore()` with the new username value from the TextInput.
            *   Disable the button and show a loading indicator (e.g., `ActivityIndicator` inline or overlay) while the update is in progress (use `profileStore.loading`).
            *   Display success or error messages (e.g., using an inline `Text` component or a toast notification).
        *   **(Future Enhancement Consideration):** When adding profile picture and bio, these would also be integrated into this screen with their respective input fields and save mechanisms.
    *   **Styling:** Continue using themed components for consistency. Ensure the settings screen remains scrollable (`ScrollView`) if new content makes it longer.

2.  **Onboarding Integration (`src/screens/onboarding/`)**
    *   **Goal:** Allow users to set their username during the initial onboarding flow.
    *   **Affected Files (Likely):**
        *   `EnhancedOnboardingScreen.tsx`: This is the most probable place to add a username input step.
        *   Possibly `EnhancedOnboardingReminderSetupScreen.tsx` if the flow is multi-step and username selection fits better there or if data needs to be passed along.
    *   **Modifications:**
        *   **Add Username Input Step:**
            *   In `EnhancedOnboardingScreen.tsx` (or the appropriate onboarding screen), add a new view/step where the user can input their desired username.
            *   Use a `TextInput` component for username entry.
            *   Provide clear instructions and perhaps some validation (e.g., character limits, allowed characters if any).
        *   **Save Username Logic:**
            *   Upon the user proceeding from this step (e.g., pressing a "Next" or "Continue" button), call the `updateUsername` action from `useProfileStore` (or a more general `updateProfile` action if you create one that also sets `onboarded: true`).
            *   Alternatively, you can collect the username and update the profile (including setting `onboarded: true`) at the very end of the entire onboarding flow.
        *   **Update `onboarded` Status:**
            *   Ensure that after the username is set (and any other onboarding steps are completed), the `onboarded` status in the `profiles` table (and `profileStore`) is set to `true`. This is crucial for logic that depends on whether a user has completed onboarding (e.g., `RootNavigator` logic).
            *   The `profileStore` already has an `onboarded` field and `fetchProfile` retrieves it. The `updateProfileApi` can be used to set `onboarded: true` along with the username.
        *   **Error Handling:** Display any errors if the username update fails (e.g., network issue, validation error if you implement server-side validation for usernames).
        *   **UI/UX:** Ensure this new step integrates smoothly into the existing onboarding flow. Use themed components (e.g., for `TextInput`, buttons, text) to maintain Yeşer's calm, minimalist aesthetic and adapt to the app's theming logic.

## V. Navigation (`src/navigation/`)

*   **No Changes Needed for Basic Profile:** Since profile management features (viewing email, viewing/editing username) will be integrated directly into `EnhancedSettingsScreen.tsx`, no new screens are being added. Therefore, no modifications to navigation stacks (e.g., `RootNavigator.tsx`) or navigation types (e.g., `src/types/navigation.ts`) are required for this part of the profile system implementation.

