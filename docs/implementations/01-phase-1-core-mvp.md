### Phase 1: Core Journaling MVP
**Goal:** Implement the fundamental gratitude logging and viewing loop.
**User Stories Covered (Primary):** A1 (Email/Pass), B5, B7, C8 (List view), C9, D11.

**Legend:**
*   `[ ]` Not Started
*   `[/]` Partially Completed
*   `[x]` Completed
*   `[?]` Status Unknown (requires further check, e.g., CI setup, full SQL deployment, specific configurations)

---

*   **Tasks:**
    *   `[x]` Authentication Screens (UI & Logic):
        *   `[x]` Login Screen ("Giriş Yap") with email/password.
        *   `[x]` Sign Up Screen ("Kayıt Ol") with email/password.
        *   *(User Story A1 - Email/Pass part completed)*
    *   `[x]` Daily Entry Screen:
        *   `[x]` UI for writing a single gratitude entry ("Bugün neye minnettarsın?" placeholder).
        *   `[x]` "Kaydet" (Save) button.
        *   `[x]` Save entry to Supabase (`gratitude_entries` table, including `entry_date`). (Requires `gratitudeApi.ts`)
        *   `[x]` Confirmation message/animation on save.
        *   *(User Stories B5, B7)*
    *   `[x]` Past Entries Screen (List View):
        *   `[x]` `FlatList` to display past entries chronologically (date, snippet). (Requires `gratitudeApi.ts`)
        *   `[x]` Tap an entry to view its full text.
        *   `[x]` Empty state if no entries.
        *   *(User Stories C8 - List, C9)*
    *   `[x]` Streak Counter:
        *   `[x]` `useStreak` custom hook that calls `calculate_streak` RPC. (Requires `gratitudeApi.ts` or similar to call RPC)
        *   `[x]` Sync streak value to Zustand store (e.g., `profileStore` or a new `gratitudeStore`).
        *   `[x]` Display streak prominently in the UI ("Günlük Seri") on `HomeScreen` or main dashboard.
        *   *(User Story D11)*
    *   `[x]` Basic Onboarding Flow (Simple):
        *   `[x]` 1-2 screens explaining app benefit after first login. (Created OnboardingScreen.tsx)
        *   `[x]` Update `profiles.onboarded` status in Supabase and store. (Handled by OnboardingScreen and profileApi)
        *   `[x]` Modify navigation to show onboarding to new users. (Implemented in RootNavigator.tsx)
        *   *(Partial User Story A2 - initial version)*
    *   `[x]` Basic Reminder Settings UI:
        *   `[x]` UI to enable/disable daily reminders and set `reminder_time` in `profiles` table. (Created `ReminderSettingsScreen.tsx` with UI elements and save logic using `profileApi.ts`)
        *   `[x]` Sync with `profileStore.ts`. (Screen reads from store and updates store on successful save)
        *   `[x]` Add navigation to the screen. (Added to `RootNavigator` and a button in `HomeScreen`)
        *   *(User Story A3 & E14 - UI only, notification logic later)*
