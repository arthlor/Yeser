# Yeşer Feature Inventory

Generated from the current codebase on 2026-05-21. This document describes implemented or code-backed product surfaces in the current working tree, including reachable screens, subscription gates, Supabase contracts, Edge Functions, and platform integrations.

## Product Summary

Yeşer is an Expo React Native gratitude journal for iOS and Android. The app centers on daily gratitude statements, streaks, calendar/history review, mood tagging, AI-assisted reflection, memories/throwbacks, reminders, localization, and a RevenueCat-backed Pro subscription.

Core stack:

- Expo SDK 53 / React Native app with React Navigation.
- Supabase Auth, Database, Storage, Edge Functions, RPCs, RLS, and pg_cron-backed notification jobs.
- RevenueCat subscriptions and native paywalls.
- TanStack Query for server-state caching, pagination, invalidation, and optimistic updates.
- i18next localization for Turkish, English, and Spanish.
- Expo Notifications, Image Picker, Audio, Print, Sharing, Tracking Transparency, Video, and Updates.

## Navigation And App Shell

### Root Flow

| State                           | Destination          | Notes                                                        |
| ------------------------------- | -------------------- | ------------------------------------------------------------ |
| Auth state loading              | Splash               | Splash is kept during auth bootstrap and app initialization. |
| Not authenticated               | Login                | Google and Apple OAuth entry points.                         |
| Authenticated, profile loading  | Splash               | Prevents onboarding/main app flashes.                        |
| Profile load error              | Profile error screen | Retryable error surface with network-aware error type.       |
| Authenticated but not onboarded | Onboarding           | Eight-step guided onboarding flow.                           |
| Authenticated and onboarded     | Main app             | Bottom tabs plus stack/modal screens.                        |
| Unknown route                   | Not Found            | Falls back to previous route or main app tabs.               |

### Main Tabs

| Tab          | Screen               | Purpose                                                                 |
| ------------ | -------------------- | ----------------------------------------------------------------------- |
| Home         | `HomeScreen`         | Dashboard, today summary, mood widget, streak, throwback, shortcuts.    |
| Daily Entry  | `DailyEntryScreen`   | Main gratitude writing surface.                                         |
| Past Entries | `PastEntriesScreen`  | Searchable, paginated history list.                                     |
| Calendar     | `CalendarViewScreen` | Month map of entry dates and selected-day preview.                      |
| Settings     | `SettingsScreen`     | Account, profile, goals, reminders, theme, language, Pro, export, help. |

### Stack And Modal Screens

- Entry detail by entry id/date.
- Mood analysis deep dive.
- Past entry creation modal.
- RevenueCat Customer Center fallback screen.
- Privacy policy, terms, help.
- Why Gratitude educational screen.
- Not found and profile error screens.

### Deep Links And Notification Routing

- Environment-specific URL schemes: `yeser://`, `yeser-dev://`, `yeser-preview://`.
- Auth deep links support `/auth/callback`, `/auth/confirm`, `/confirm`, and `/callback`.
- Notification taps route to the Daily Entry tab once navigation and the main app are ready.
- Duplicate deep-link processing is guarded with in-memory URL processing state and cleanup.

## Authentication And Account Lifecycle

### Login

- Full-screen login experience with background video, brand mascot, and localized copy.
- Google OAuth and Apple OAuth.
- OAuth initialization waits for Supabase client readiness.
- OAuth callbacks can queue access/refresh tokens during cold start until the database layer is ready.
- Login callback timeout and success/error toast handling.

### Session Management

- Supabase session bootstrap through a central auth store.
- Auth state listener handles signed-in, signed-out, and token-refreshed events.
- RevenueCat identity is linked on sign-in and logged out on sign-out.
- Query cache is cancelled/cleared during auth transitions to prevent stale private data.
- Push token cleanup is attempted during logout.

### Profile

- Profile is fetched through TanStack Query.
- Profile fields include username, onboarded status, daily goal, varied prompt preference, notification time, timezone, avatar path, language, and Pro flag.
- Username validation uses the `check_username_availability` RPC with Turkish-aware normalization.
- Timezone is synced from device locale data when an authenticated profile loads with a mismatch.
- Account deletion is invoked through the `delete-user` Edge Function from the client, which handles database cascade deletes, deletes authentication users, and removes files from avatars and gratitude-media storage buckets.

## Onboarding

The onboarding flow has eight ordered steps:

1. Welcome.
2. Interactive gratitude demo.
3. Daily goal selection.
4. Personalization.
5. Notification permission.
6. Personalized plan reveal.
7. Native RevenueCat paywall.
8. Completion.

Implemented onboarding capabilities:

- Welcome story with app mascot, trust/social proof, and feature cards for daily practice, streaks, and growth.
- Interactive demo writes a real gratitude statement through the normal gratitude mutation path.
- Daily goal presets for 1, 3, 5, and a custom-labelled choice.
- Personalization collects username and theme preference.
- Username availability check against backend RPC.
- Light, dark, and auto theme preview.
- Notification permission request and push-token registration.
- Pre-paywall personalized plan using username and daily goal.
- Native RevenueCat paywall presentation with graceful continuation after purchase, restore, cancel, or error.
- Completion persists profile setup with `onboarded: true`, the selected daily goal, username fallback, and varied prompts enabled.

## Core Gratitude Journal

### Daily Entry

- Main writing screen is date-aware and defaults to today.
- Route params can provide `initialDate` and `initialPrompt`.
- Free users can add one statement for today.
- Pro users can add multiple statements and write to past dates.
- Non-Pro access to non-today dates is blocked from the daily entry route.
- Each statement supports text and an optional mood.
- Statement text limit is 300 characters, with warning styling at 90 percent.
- Daily goal progress is tied to the profile's `daily_gratitude_goal`.
- Goal completion triggers success feedback, haptics, analytics, and refreshed progress state.
- Pull-to-refresh reloads entry data.
- On successful submission, the app can surface a mood-insight teaser when enough history exists.

### Statement Management

- Add, edit, delete, and mood update operations use Supabase RPCs.
- Mutations use per-entry locks to avoid concurrent write races.
- Add operations perform optimistic cache updates with version-aware rollback.
- Streak recalculation runs after add, edit, and delete.
- Cache invalidation covers entry detail, history, calendar month dates, total counts, random throwbacks, streaks, and mood insight state.
- Delete in Daily Entry supports an undo pattern by re-adding the deleted statement.

### Entry Detail

- Entry detail can load by entry id or entry date.
- Missing id-based entries route to Not Found.
- Users can edit, delete, share, and view attachments from the detail screen.
- Mood editing is Pro-gated.
- Attachment removal is supported.
- Sharing can generate a branded throwback-style image card.

## Attachments And Media

### Image Attachments

- Pro-gated image attachment action in the gratitude input.
- Users can choose from photo library.
- Long-press camera capture support is present through image picker paths.
- Image constraints: max 8 MB and target max dimension constant of 1600.
- Uploaded files are stored in the private Supabase Storage bucket `gratitude-media`.
- Storage paths are user-scoped under the authenticated user's id.
- Signed URLs are generated and cached for display.

### Voice Notes

- Pro-gated voice note recording.
- Uses Expo Audio.
- Recording constraints: max 4 MB and max 60 seconds.
- Voice notes upload to the same private `gratitude-media` bucket.
- Audio attachments store duration and MIME metadata.

### Attachment Backend

- `gratitude_attachments` table stores attachment metadata.
- `attach_media_to_statement` enforces authenticated ownership, valid statement index, user-folder storage path, and daily cap.
- Per-day cap is 10 images and 10 audio attachments.
- `delete_attachment` removes metadata and returns storage path for client cleanup.
- `list_attachments_for_date` supports attachment lookup by entry date.
- Storage policies restrict `gratitude-media` objects to each user's own folder.

## Prompts And Inspiration

- Daily prompt fetching supports localized prompt text.
- Random active prompts can be fetched through RPC or directly from `daily_prompts`.
- Multiple prompt fetch is available for prompt pools.
- Varied prompts are Pro-gated in settings.
- Free users receive fallback/static prompt behavior.
- Prompt data supports Turkish, English, and Spanish columns.
- Why Gratitude CTAs can navigate into Daily Entry with a pre-filled prompt.

## Mood Features

### Mood Tagging

- Statements can be tagged with one of 12 mood emojis: joyful, grateful, inspired, empowered, calm, loving, content, refreshed, thoughtful, hopeful, focused, and motivated.
- Mood data is stored in `gratitude_entries.moods` as an index-keyed JSON object.
- Mood setting/clearing uses the `set_statement_mood` RPC.
- Recent mood selections are cached locally in AsyncStorage.

### AI Mood Suggestions

- Pro-only AI mood suggestion for statement text.
- Debounced suggestion after minimum text length.
- Calls the `suggest-mood` Edge Function.
- Returns multiple suggested moods, a primary mood, and remaining daily AI usage.
- Usage is recorded in the `ai_usage` table under `mood_suggest`.

### Mood Analytics And AI Insights

- Mood Analysis screen supports date ranges `15d`, `30d`, `90d` and entry-count ranges `5e`, `15e`, `30e`.
- Backend RPC `get_mood_analytics` calculates mood counts, trend data, highlighted statements, overview, and narrative fields.
- AI insight generation calls `analyze-mood-insights`.
- AI insights require at least 3 gratitude statements in the selected range.
- Latest AI insight snapshots are fetched through `get_latest_mood_insight_snapshot`.
- Snapshots are stored in `mood_insight_snapshots` with range and language.
- Home mood widget chooses an entry-count range based on total entry count and can auto-generate stale/missing Pro insights.
- Free users see locked previews and are routed to the native paywall.

## AI Assistant Features

All current AI helper surfaces are Pro-gated in the client and usage-limited by Edge Functions.

| Feature                | Client hook/surface                             | Edge Function           | Usage feature   |
| ---------------------- | ----------------------------------------------- | ----------------------- | --------------- |
| Entry enhancement      | `useEntryEnhancement`, input bar enhance button | `enhance-entry`         | `entry_enhance` |
| Personalized prompt    | `useCoachPrompt`, AI coach card                 | `coach-prompt`          | `coach_prompt`  |
| Chat assistant         | `AIChatModal`, Daily Entry FAB                  | `chat-message`          | `chat_message`  |
| Mood suggestion        | `useMoodSuggestion`, statement editing          | `suggest-mood`          | `mood_suggest`  |
| Mood insight narrative | `useMoodInsights`, Mood Analysis/Home widget    | `analyze-mood-insights` | `mood_insights` |

AI implementation details:

- Edge Functions use Gemini via `GEMINI_API_KEY`.
- Most AI functions enforce a 25-request daily limit per user.
- Limit responses include remaining count and reset timing where implemented.
- Usage is written to `ai_usage`.
- Chat assistant includes safety instructions to avoid medical, legal, or financial advice and to encourage professional help for distress.
- Entry enhancement supports poetic, detailed, and mindful styles.
- Coach prompts support focus areas such as relationships, growth, nature, health, achievements, and general reflection.

## Home Dashboard

Home combines daily progress, profile context, insight state, streak state, and quick actions.

Implemented Home capabilities:

- Profile header with avatar support.
- Avatar upload, remove, and signed URL display.
- Today entry loading and latest statements preview.
- Shows the latest five statements with a view-more affordance when more exist.
- Daily progress and goal status.
- Current and longest streak summary.
- HomeMoodWidget combining progress, streaks, AI insight teaser, and write-now CTA.
- Throwback teaser and throwback modal.
- Quick action cards into Daily Entry, Past Entries, Calendar, and Why Gratitude.
- Floating add button to start a daily entry.
- Pull-to-refresh invalidates/refetches today entry, streaks, throwback, total count, and mood insight queries.
- Streak details modal from the home surface.

## Past Entries And Calendar

### Past Entries List

- Paginated history list with page size 20.
- Backend pagination through `get_gratitude_entries_paginated`.
- Search input debounced by 250 ms.
- Search is included in the paginated RPC request.
- Entry count/stat header.
- Skeleton loading, retryable error, empty state, and search-empty state.
- Infinite load-more footer.
- Entry press opens Entry Detail.

### Calendar

- Month calendar uses `get_entry_dates_for_month` to mark days with entries.
- Current month state with previous/next navigation.
- Future month navigation is disabled.
- Selected day preview shows loading, error, first statement preview, or add-entry action.
- Existing day opens Entry Detail.
- Missing day add action is Pro-gated and opens Past Entry Creation.
- Calendar date formatting respects selected language through date-fns locales.

### Past Entry Creation

- Pro-gated with a screen-level access check against deep links.
- Date is supplied by Calendar and is not user-editable on that screen.
- Users can add, edit, and delete statements for that past date.
- Shows daily goal progress for the selected date.
- Saves through normal gratitude RPCs and mutations.
- Includes the AI coach prompt component.

## Throwbacks And Sharing

- Random memory retrieval through `get_random_gratitude_entry`.
- Throwback timing logic supports daily, weekly, monthly, and disabled frequencies.
- Minimum entry counts are enforced for daily, weekly, and monthly timing checks.
- Last shown timestamp is stored locally in AsyncStorage.
- Home can show a throwback teaser.
- Throwback modal displays a branded share-card preview.
- Users can refresh for another memory.
- Sharing captures a PNG via `react-native-view-shot` at 1080 px width.
- If image capture or file sharing is unavailable, sharing falls back to text.
- Temporary share files are best-effort cleaned from cache.

## Streaks And Progress

- `streaks` table stores current streak, longest streak, and last entry date.
- `calculate_streak` RPC computes current streak with a grace rule for missing today when yesterday exists.
- `recalculate_user_streak` refreshes user streak after mutations.
- `update_user_streak` trigger runs after gratitude entry insert, update, or delete.
- Home shows current/longest streak status.
- Streak details screen shows:
  - current streak,
  - longest streak,
  - last entry date,
  - next milestone progress,
  - days left to next milestone,
  - advanced milestone achievements,
  - streak benefits,
  - research/tip content conditioned by streak length.

## Why Gratitude

- Dedicated education screen for gratitude benefits.
- Reads active benefits from `gratitude_benefits`.
- Benefit content is localized across Turkish, English, and Spanish columns.
- Cards can include icon, title, description, stat, and CTA prompt.
- CTA prompt routes into Daily Entry.
- Uses 24-hour cached query behavior.
- Shows loading, error, and content states.

## Settings

Implemented settings sections:

- Profile header and Pro status.
- Premium upsell card for free users.
- Avatar picker and avatar removal.
- Username editor modal with validation.
- Daily goal editor with 1, 3, 5 presets and custom 1-20 input.
- Notification reminder controls.
- Theme appearance controls.
- Varied prompts toggle, gated by Pro when enabling.
- Language picker for Turkish, English, and Spanish.
- Data export button, gated by Pro.
- Customer Center / subscription management.
- Mood Analysis link with Pro badge for free users.
- Why Gratitude link.
- Privacy Policy, Terms of Service, and Help links.
- Sign out.
- Delete account.
- App version footer.

## Notifications

### Client Notification Features

- Permission request during onboarding and settings.
- Expo push token registration.
- Android notification channel setup.
- User preference stored through backend RPCs and profile fallback.
- Reminder time presets: `08:00`, `12:30`, `18:00`, `21:00`.
- Push-token sync on app launch when reminders are enabled.
- Local reminder scheduling is intentionally skipped while the remote pipeline is active to avoid duplicate notifications.
- Notification tap routes to Daily Entry.

### Backend Notification Pipeline

- `push_tokens` table stores Expo tokens.
- `notification_jobs` queues reminder jobs.
- `notification_logs` records Expo dispatch results.
- `register_push_token`, `unregister_push_token`, and `set_notifications_enabled` manage preferences and tokens.
- `enqueue_notification_jobs` creates jobs for notification windows.
- `lock_notification_jobs` claims jobs for the Edge Function worker.
- `insert_notification_logs` stores dispatch results.
- `reset_stuck_notification_jobs` recovers stale jobs.
- `send-daily-reminders` Edge Function dispatches Expo push messages.
- Invalid Expo tokens are deleted after dispatch errors.
- Reminder copy supports Turkish, English, and Spanish.
- Personalized memory reminders can include older gratitude statements when metadata contains a memory statement and age.
- pg_cron jobs refresh notification windows, enqueue jobs, and reset stuck jobs.

## Subscription And Monetization

### RevenueCat Integration

- RevenueCat SDK initializes during core service startup.
- Products are monthly and yearly packages from the current offering.
- Entitlement id is `Yeşer Pro`.
- Native paywall is presented imperatively through `RevenueCatUI.presentPaywall`.
- Paywall presentation refreshes offerings before display.
- Customer info listener updates local Pro state.
- Purchase and restore refresh customer info.
- Paywall locale follows app language.
- Native Customer Center is used from settings, with React Navigation fallback.
- RevenueCat webhook Edge Function updates `profiles.is_pro`.
- `profiles.is_pro` is protected by a trigger that blocks direct client updates.

### Free Plan Behavior

- One gratitude statement for today.
- No adding to past dates through daily entry or past-entry creation.
- Can browse own historical entries and calendar data.
- Sees locked previews or paywall prompts for Pro surfaces.

### Pro-Gated Features

- Multiple gratitude statements per day.
- Adding entries to past dates.
- Past entry creation screen.
- Image attachments.
- Voice attachments.
- Mood editing and AI mood suggestions.
- AI entry enhancement.
- AI coach prompts.
- AI chat assistant.
- Mood analysis deep dive and AI insight generation.
- Home mood insight widget actions.
- Varied prompts toggle.
- PDF data export.

## Data Export And Legal Surfaces

### Export

- Pro-gated user data PDF export.
- Client invokes `export-user-data` Edge Function.
- Language is sent via request body, `X-User-Language`, and `Accept-Language`.
- Server detects language from header, body, profile, accept-language, or fallback.
- Export includes:
  - user profile,
  - email/name where available,
  - gratitude entries,
  - localized gratitude benefits,
  - localized daily prompt sample,
  - metadata such as entry count, statement count, active months, first/last date, export language.
- Client renders localized HTML to PDF through Expo Print.
- PDF is shared through Expo Sharing.
- Temporary exported files are cleaned after sharing.

### Legal And Help

- Privacy Policy screen.
- Terms of Service screen.
- Help/FAQ screen.
- Support email link: `yeserapp@gmail.com`.
- Legal/help content is localized through i18n resources.

## Localization And Personalization

- Supported app languages: Turkish (`tr`), English (`en`), Spanish (`es`).
- Device language is detected at startup with fallback to Turkish.
- User-selected language persists in AsyncStorage.
- Language changes update i18n and RevenueCat paywall locale.
- Database-backed prompts and gratitude benefits have Turkish, English, and Spanish columns.
- Date formatting in Calendar and Past Entry Creation respects language.
- Export uses localized strings and localized reference data.
- Theme modes: light, dark, and auto.
- Theme preference persists in AsyncStorage.
- App supports custom fonts and React Native Paper theme mapping.

## Reliability, Performance, And UX Infrastructure

- Three-phase app startup:
  - Critical: synchronous UI essentials, console protection, global error monitoring.
  - Core: AsyncStorage check, Supabase initialization, RevenueCat initialization, auth initialization.
  - Enhancement: background sync, network monitoring, database optimization.
- Splash screen has a 5-second safety timeout.
- Global error provider converts technical errors into user-safe messages.
- Toast provider supports success, error, warning, info, actions, i18n, and coordinated animations.
- Error boundary wraps the app.
- Network monitor tracks NetInfo, Supabase reachability, external reachability, latency, simulator-specific issues, and recommendations.
- Background sync queue stores offline add/edit/delete statement and profile update mutations.
- Background sync retries failed queued mutations up to three times.
- Cache service and query keys centralize invalidation.
- Haptic feedback is used for navigation and goal completion.
- Analytics service call sites exist for screen views and events; comments indicate route analytics is disabled in the navigation container.
- Feature flags exist for auth/magic-link optimization rollouts and performance monitoring.

## Supabase Backend Inventory

### Tables

| Table                    | Product role                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `profiles`               | User profile, onboarding, daily goal, prompt preference, notification time, timezone, avatar path, language, Pro flag. |
| `gratitude_entries`      | Per-user dated gratitude entries, JSON statements, JSON mood map.                                                      |
| `gratitude_attachments`  | Image/audio metadata linked to entry date and statement index.                                                         |
| `streaks`                | Current and longest streak tracking.                                                                                   |
| `daily_prompts`          | Localized active prompts.                                                                                              |
| `gratitude_benefits`     | Localized Why Gratitude content.                                                                                       |
| `ai_usage`               | Per-user AI usage records by feature.                                                                                  |
| `mood_insight_snapshots` | Generated AI mood insight snapshots by range and language.                                                             |
| `push_tokens`            | Expo push tokens.                                                                                                      |
| `notification_jobs`      | Queued reminder jobs.                                                                                                  |
| `notification_logs`      | Push dispatch logs.                                                                                                    |

### Key RPCs Used By The App

- `add_gratitude_statement`
- `edit_gratitude_statement`
- `delete_gratitude_statement`
- `delete_gratitude_entry_by_date`
- `set_statement_mood`
- `get_gratitude_entries_paginated`
- `get_entry_dates_for_month`
- `get_random_gratitude_entry`
- `get_user_gratitude_entries_count`
- `calculate_streak`
- `recalculate_user_streak`
- `get_random_active_prompt`
- `get_multiple_random_active_prompts`
- `get_mood_analytics`
- `get_latest_mood_insight_snapshot`
- `check_username_availability`
- `register_push_token`
- `unregister_push_token`
- `set_notifications_enabled`
- `attach_media_to_statement`
- `delete_attachment`
- `list_attachments_for_date`
- `enqueue_notification_jobs`
- `lock_notification_jobs`
- `insert_notification_logs`
- `reset_stuck_notification_jobs`

### Edge Functions In This Checkout

| Function                    | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `analyze-mood-insights`     | Generates AI mood/meaning insights and stores snapshots.   |
| `chat-message`              | AI gratitude assistant chat reply generation.              |
| `coach-prompt`              | Personalized gratitude prompt and tip generation.          |
| `enhance-entry`             | Rewrites/improves a gratitude statement in selected style. |
| `suggest-mood`              | Suggests mood emojis for a statement.                      |
| `export-user-data`          | Localized data export payload for PDF generation.          |
| `handle-revenuecat-webhook` | Syncs RevenueCat subscription events to `profiles.is_pro`. |
| `send-daily-reminders`      | Dispatches queued Expo push notification jobs.             |

### RLS And Storage

- User-owned tables have authenticated own-row policies.
- Active prompts are readable by authenticated users.
- Gratitude benefits are publicly readable.
- `ai_usage` can be viewed by the owning user and inserted by service-role paths.
- Avatar storage policies restrict `avatars` objects to the user's own folder.
- Gratitude media storage policies restrict `gratitude-media` objects to the user's own folder.
- `profiles.is_pro` is protected from direct authenticated-client mutation.

### Cron And Scheduled Jobs

- `refresh-notification-windows`: every 5 minutes, refreshes `public.notification_windows`.
- `enqueue-notification-jobs`: at minutes 25 and 55 hourly, runs `public.enqueue_notification_jobs()`.
- `reset-stuck-notification-jobs`: every 10 minutes, runs `public.reset_stuck_notification_jobs()`.

## Platform And Build Features

- iOS bundle ids and Android package ids vary by environment:
  - production: `com.arthlor.yeser`
  - preview: `com.arthlor.yeser.preview`
  - development: `com.arthlor.yeser.dev`
- Environment-specific app names and URL schemes.
- EAS project id is configured.
- Expo Updates URL is configured.
- iOS supports tablets and Apple Sign In.
- iOS usage descriptions cover tracking, camera, microphone, photo library, and photo-library save.
- Android permissions cover boot, vibration, alarm, wake lock, camera, microphone, external storage, FCM receive, and Android 13 notifications.
- Build scripts exist for dev, preview, production, production AAB, submit, and updates.
- Validation scripts exist for environment, Google services, type-check, lint, and build validation.

## Partially Shipped Or Caveat Areas

- Account deletion is fully implemented via Deno Edge Function `delete-user` which performs user metadata cleanup and cascade deletes.
- Onboarding's custom goal option is represented as a custom-labelled choice, while numeric custom goal editing is implemented in Settings.
- Daily Entry blocks free users from writing past dates, and Past Entry Creation is Pro-gated; Entry Detail still exposes normal edit/delete affordances for loaded entries, with mood editing separately Pro-gated.
- Local reminder scheduling code exists but is intentionally disabled while the remote notification pipeline is active.
- AI usage limiting is implemented in Edge Functions, and server-side Pro enforcement is implemented across AI endpoints (including a hard Pro gate returning `403 PRO_REQUIRED` on `analyze-mood-insights`, `suggest-mood`, etc.).
- The README contains broader product language; this inventory is grounded in current routes, hooks, API calls, SQL snapshots, migrations, and Edge Functions.

## Source Areas Reviewed

- `src/App.tsx`
- `src/navigation/*`
- `src/features/auth/*`
- `src/features/onboarding/*`
- `src/features/home/*`
- `src/features/gratitude/*`
- `src/features/calendar/*`
- `src/features/mood/*`
- `src/features/streak/*`
- `src/features/throwback/*`
- `src/features/settings/*`
- `src/features/subscription/*`
- `src/features/whyGratitude/*`
- `src/providers/*`
- `src/services/*`
- `src/shared/hooks/*`
- `src/shared/query/*`
- `src/store/*`
- `src/schemas/*`
- `src/types/*`
- `src/i18n/resources/*`
- `database/*.json`
- `database/database.sql`
- `supabase/functions/*`
- `supabase/migrations/*`
- `app.config.js`
- `package.json`
