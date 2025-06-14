# 05: Key Features

This document details the implementation of Yeşer's core user-facing features, highlighting how our architecture supports them.

## 1. Daily Gratitude Entry

This is the heart of the application. The user is presented with an input to add gratitude statements for the current day.

- **Screen**: `DailyEntryScreen.tsx`
- **Data**: The screen uses the `useGratitudeEntryForDate` hook to fetch the current day's entry. This hook gets the data from the TanStack Query cache.
- **Mutations**: When the user adds, edits, or deletes a statement, the component calls a mutation hook (e.g., `useAddStatement`).
- **Optimistic Updates**: The mutation provides instant UI feedback. When adding a statement, it appears in the list immediately. If the server call fails, it's automatically removed, and an error is shown.
- **Backend**: The mutations call RPC functions in Supabase (`add_gratitude_statement`, etc.) which handle the logic of updating the `statements` JSONB array.

## 2. Streak Tracking

Streaks are a powerful motivator. Our system is designed to be accurate and performant.

- **Data Source**: We do not calculate streaks on the client. A Supabase RPC function, `calculate_user_streak`, does the heavy lifting by analyzing the `gratitude_entries` table.
- **Caching**: The result of the streak calculation is stored in the `streaks` table and fetched into the TanStack Query cache via the `useStreakData` hook.
- **Invalidation**: After any mutation to `gratitude_entries` (adding/deleting), the `streaks` query key is invalidated, causing TanStack Query to refetch the latest streak data from the backend. This ensures the streak count is always up-to-date.

## 3. Smart Notifications

Yeşer's notification system is highly customizable and reliable.

- **Configuration**: All notification settings (daily reminder time, throwback frequency, etc.) are stored in the user's `profiles` table.
- **Management**: The `SettingsScreen` uses mutation hooks to update the user's profile.
- **Scheduling**: A `notificationService.ts` contains the logic to interact with `Expo Notifications`. When settings are updated, this service is responsible for canceling old notifications and scheduling new ones based on the user's preferences.
- **Deep Linking**: When a user taps a notification, it opens the app and can navigate them to a specific screen, such as the `DailyEntryScreen`.

## 4. Varied Prompts System

To help users who need inspiration, we provide a dynamic prompt system.

- **User Preference**: A boolean flag, `use_varied_prompts`, in the user's `profiles` table controls this feature.
- **Data Source**: Prompts are stored in the `daily_prompts` table in our Supabase database. This allows us to add or change prompts without an app update.
- **API**: The `promptApi.ts` has a function `getRandomActivePrompt` that fetches a random prompt from the database.
- **Logic**: On the `DailyEntryScreen`, we first check the user's profile.
  - If `use_varied_prompts` is `true`, we call the `useRandomPrompt` hook to fetch a prompt from the API.
  - If `false`, we display the default, static prompt text.
- **Caching**: Prompts are cached by TanStack Query to avoid refetching on every screen load.

## 5. Throwback Memories

This feature helps users reflect on their past gratitude.

- **Logic**: The feature is powered by the `get_random_gratitude_entry` RPC function in Supabase, which efficiently selects a random past entry for the user.
- **Hook**: The `useRandomGratitudeEntry` hook calls this RPC.
- **UI**: A modal or dedicated screen displays the fetched throwback entry.
- **Trigger**: This can be triggered manually by the user or automatically via a throwback notification.
