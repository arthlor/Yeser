# End-to-End (E2E) Testing

**Focus:** Simulating critical user flows through the entire application.

**Tools:** Maestro or Detox (To be decided/configured)

**Scope (Based on Phases 0-2 Features):**

### 1. Onboarding & Authentication Flows
- **Sign Up & First Entry (Email):**
  - Navigate to Sign Up screen.
  - Enter valid email/password, submit.
  - Complete multi-step onboarding (welcome, benefit explanation).
  - Opt-in to daily reminders, set a time.
  - Land on main app screen (e.g., HomeScreen).
  - Navigate to Daily Entry screen.
  - Enter a gratitude item, save.
  - Verify entry is saved (e.g., by checking Past Entries or a success message).
  - Verify streak counter shows '1'.
- **Sign Up & First Entry (Google):**
  - Tap 'Sign in with Google'.
  - (Requires handling OAuth flow - may need specific test environment setup or mocking at OS level if possible with chosen tool).
  - Complete multi-step onboarding.
  - Opt-out of daily reminders.
  - Land on main app screen.
  - Log first entry, verify save and streak.
- **Login (Email):**
  - Navigate to Login screen.
  - Enter valid credentials for an existing user, submit.
  - Verify landing on main app screen.
  - Verify correct user data is displayed (e.g., streak).
- **Login (Google):**
  - Tap 'Sign in with Google' for an existing Google-linked user.
  - Verify landing on main app screen.
- **Logout:**
  - From main app, find and tap logout.
  - Verify user is returned to Login/Auth screen.

### 2. Core Journaling Flows
- **Log Daily Entry:**
  - From main screen, navigate to Daily Entry.
  - Enter single gratitude item, save.
  - Verify success and return to a relevant screen.
  - Log another entry for the same day (if multiple items are via separate saves or editing an existing day's entry).
  - Enter multiple items (newline separated) in one go, save.
  - Verify all items are stored correctly for that day.
- **View Past Entries:**
  - Navigate to Past Entries screen.
  - Verify list loads, scroll if many entries.
  - Tap an entry, verify detail screen opens with full content.
  - Navigate back to list.
- **Edit Gratitude Entry:**
  - Navigate to Past Entries, select an entry.
  - Tap 'Edit'.
  - Modify entry text and/or date.
  - Save changes.
  - Verify entry is updated in the list and detail view.
- **Delete Gratitude Entry:**
  - Navigate to Past Entries, select an entry.
  - Tap 'Delete'.
  - Confirm deletion.
  - Verify entry is removed from the list.

### 3. Engagement & Settings Flows
- **Streak Progression & Visual Milestone:**
  - Log entries for several consecutive days (e.g., 3-5 days).
  - Verify streak counter increments correctly each day.
  - Verify 'Gratitude Blooming' visual updates at defined milestones (e.g., day 3, day 7 if milestones are set).
- **Daily Reminder Management:**
  - Navigate to Settings -> Reminder Settings.
  - Disable daily reminders, save.
  - (Verify notification is cancelled - requires tool/environment support for checking scheduled notifications).
  - Enable daily reminders, change time, save.
  - (Verify notification is scheduled for new time).
- **View Privacy Information:**
  - Navigate to Privacy Information screen.
  - Verify content is displayed.

### 4. Navigation & Basic App Integrity
- **Deep Linking (Post-Auth):**
  - If applicable (e.g., from a notification), test deep linking to specific screens like Daily Entry.
- **App Backgrounding & Foregrounding:**
  - Perform an action (e.g., typing an entry).
  - Send app to background, then bring to foreground.
  - Verify state is preserved.
- **Network Interruption:**
  - While performing a Supabase-dependent action (e.g., saving entry), simulate network loss.
  - Verify graceful error handling (e.g., error message, no crash).
  - Restore network, verify app recovers or allows retry.

**Test Data Strategy:**
- Requires pre-seeded users with varying states (new user, user with entries, user with streak).
- May require ability to reset app state or use fresh installs for each major flow.
