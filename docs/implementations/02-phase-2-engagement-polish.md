### Phase 2: Enhancing Engagement & Core Polish
**Goal:** Improve user retention, refine core features, and add initial engagement mechanics.
**User Stories Covered:** A2 (Full), A3 (Full), B6, C10, D12, E14 (Full).

**Legend:**
*   `[ ]` Not Started
*   `[/]` Partially Completed
*   `[x]` Completed
*   `[?]` Status Unknown (requires further check, e.g., CI setup, full SQL deployment, specific configurations)

---

*   **Tasks:**
    *   `[x]` Full Onboarding Experience:
        *   `[x]` Refine onboarding flow with welcome, benefit explanation. (Achieved via two-step flow: OnboardingScreen for welcome/benefit, OnboardingReminderSetupScreen for reminder option)
        *   `[x]` Option to set initial daily reminder time during onboarding. (Implemented in OnboardingReminderSetupScreen)
        *   *(User Story A2 - Full)*
    *   `[x]` Daily Reminders (Functional):
        *   `[x]` Integrate `expo-notifications` service. (Installed and `notificationService.ts` created)
        *   `[x]` Schedule local daily notifications based on user's `reminder_enabled` and `reminder_time` from profiles. (Implemented in `OnboardingReminderSetupScreen` and `ReminderSettingsScreen`)
        *   `[x]` Full settings UI for managing reminders (time, on/off). (Existing UI in `ReminderSettingsScreen` now integrated with scheduling logic)
        *   *(User Stories A3 - Full, E14 - Full)*
    *   `[ ]` Entry Enhancements:
        *   `[x]` Allow adding multiple gratitude items for a single day. *(User Story B6)* (Handled by newline-separated strings in `entry_text`, UI updated in `DailyEntryScreen`, `EntryDetailScreen`)
        *   `[x]` Implement Edit and Delete functionality for past entries. *(User Story C10)* (Requires `gratitudeApi.ts`)
    *   `[x]` "Gratitude Blooming" Visual (Milestone Reward):
        *   `[x]` Component that visually represents streak milestones.
        *   `[x]` Integrate with streak counter.
        *   *(User Story D12)*
    *   `[x]` Social Logins (Google via Supabase):
        *   `[x]` Configure Google Cloud & Supabase for Google OAuth (Client IDs, Secrets, SHA-1, Redirect URIs).
        *   `[x]` Update `authService.ts` to enable Google Sign-In (uncomment WebBrowser, ensure redirect URI).
        *   *(User Story A1 - Social Login part)*
    *   `[x]` Privacy Information:
        *   `[x]` Simple screen or modal explaining data privacy.
        *   *(User Story A4)*
