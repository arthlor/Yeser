### Phase 3: Advanced Features & User Empowerment
**Goal:** Introduce features that provide more value, reflection opportunities, and user control.
**User Stories Covered:** C8 (Calendar view), D13, E15, E16.

**Legend:**
*   `[ ]` Not Started
*   `[/]` Partially Completed
*   `[x]` Completed
*   `[?]` Status Unknown (requires further check, e.g., CI setup, full SQL deployment, specific configurations)

---

*   **Tasks:**
    *   `[x]` "Spark of Memory" (Throwback Feature):
        *   `[x]` Occasionally call `get_random_gratitude_entry` RPC.
            *   *Details: Implemented trigger in `RootNavigator.tsx` to fetch entry once per session if enabled and frequency criteria met. `getRandomGratitudeEntry` in `gratitudeApi.ts` is used.*
        *   `[x]` Display the fetched entry in a non-intrusive modal or dedicated section.
            *   *Details: `ThrowbackModal.tsx` displays the entry. Date formatting uses centralized `formatDate` utility from `src/utils/dateUtils.ts`.*
        *   `[x]` Implement frequency logic (daily, weekly, monthly).
            *   *Details: Added `lastThrowbackShownAt` to `throwbackStore` (persisted via AsyncStorage). `RootNavigator.tsx` now checks this against `throwback_reminder_frequency` from `profileStore` before showing a new throwback.*
        *   *(User Story D13)*
    *   `[x]` Throwback Reminder Preferences:
        *   `[x]` Settings UI to enable/disable "Spark of Memory" and set frequency.
            *   *Details: Confirmed UI in `SettingsScreen.tsx` and state management in `profileStore.ts` are functional for enabling/disabling and setting frequency (daily, weekly, monthly). Preferences are saved via `profileApi.updateProfile` to Supabase `profiles` table.*
        *   *(User Story E15)*
    *   `[x]` Calendar View for Past Entries:
        *   `[x]` Implement a new screen or view mode using a calendar component.
            *   *Details: Installed `react-native-calendars` library. Created `CalendarViewScreen.tsx` in `src/screens/`. Integrated as a new "Takvim" tab in `MainAppNavigator` (`RootNavigator.tsx`).*
        *   `[x]` Highlight dates with entries (use `get_entry_dates_for_month` RPC).
            *   *Details: Added `getEntryDatesForMonth` function to `gratitudeApi.ts` (calls Supabase RPC `get_entry_dates_for_month`). `CalendarViewScreen.tsx` fetches and marks dates with entries on the calendar component.*
        *   `[x]` Tap a date to see entries for that day.
            *   *Details: `CalendarViewScreen.tsx` handles `onDayPress` to fetch the specific entry using `getGratitudeEntryByDate` (from `gratitudeApi.ts`) and navigates to `EntryDetailScreen`.*
        *   `[x]` Ensure calendar theming aligns with app theme.
            *   *Details: Reviewed `CalendarViewScreen.tsx`; the `Calendar` component's `theme` prop is configured using `AppTheme` tokens from `useTheme()` for colors and typography, ensuring consistency with light/dark modes.*
        *   *(User Story C8 - Calendar)*
