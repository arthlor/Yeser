Scoping & Design
This document outlines the scope and design considerations for Yeşer, a minimalist gratitude journaling application, designed with "Ayşe, The Peace-Seeking Millennial" in mind.
1. User Persona: Ayşe, "The Peace-Seeking Millennial"
Name: Ayşe Yılmaz
Age: 28
Occupation: Marketing Specialist (works remotely, values work-life balance)
Goals:
Reduce daily anxiety and overwhelm.
Cultivate a more positive and mindful outlook on life.
Establish a simple, sustainable daily self-care habit.
Find a digital sanctuary that feels personal and uncluttered.
Frustrations:
Other wellness apps are too complex, feature-heavy, or demand too much time.
Subscription fatigue; prefers one-time purchase or truly free valuable experiences.
Notifications that feel demanding rather than supportive.
Cluttered interfaces that increase, rather than decrease, stress.
Tech Savviness: High. Comfortable with mobile apps, expects intuitive design. Values privacy.
Needs:
Simplicity and ease of use.
A calming and aesthetically pleasing interface.
Gentle encouragement and positive reinforcement.
Control over her data and notifications.
A sense of accomplishment and progress.
Quote: "I just want a quiet corner in my digital life to reflect and feel a bit better each day, without it feeling like another chore."
2. Core User Stories & Key Features

This section outlines the key features of Yeşer, driven by user stories. Features are marked as (Implemented), (Planned - Phase 2), or (Planned - Phase 3) to reflect their current development status.

(A) Onboarding & Setup (Implemented):
A1: As Ayşe, I want to easily sign up with my email and password OR using a social login (e.g., Google via Supabase) so that I can quickly start using the app and secure my data.
A2: As Ayşe, I want a brief, welcoming onboarding that explains the core benefit of gratitude journaling and how the app works in simple steps, so that I feel comfortable and know what to do immediately.
A3: As Ayşe, I want to set a daily reminder time during onboarding or later in settings, so that I don't forget to log my gratitude.
A4: As Ayşe, I want to be informed about privacy and how my entries are stored (e.g., cloud-synced with Supabase), so that I feel safe sharing personal reflections (via Privacy Policy access in Settings).

(B) Daily Journaling (Implemented):
B5: As Ayşe, I want to log at least one thing I'm grateful for each day in a simple text field, so that I can fulfill the core purpose of the app.
B6: As Ayşe, I want the option to add multiple gratitude items for a single day so that I can capture all my positive thoughts if I have more than one.
B7: As Ayşe, I want to see a confirmation after successfully logging an entry, so that I know my entry is saved and I feel a small sense of accomplishment.

(C) Review & Reflection:
C8: As Ayşe, I want to view a chronological list of my past gratitude entries (Implemented), and a calendar view (Planned - Phase 3) of my past gratitude entries, so that I can reflect on my journey and revisit positive memories.
C9: As Ayşe, I want to be able to tap on a past entry to read its full content (Implemented), so that I can easily access details.
C10: As Ayşe, I want the ability to edit or delete a past entry (Implemented), so that I can correct mistakes or remove entries I no longer wish to keep.

(D) Motivation & Engagement:
D11: As Ayşe, I want to see my current consistency streak (number of consecutive days with entries) (Implemented), so that I feel motivated to maintain my habit.
D12: As Ayşe, I want a simple, visual reward or acknowledgment ("Gratitude Blooming" - Planned - Phase 2) when I reach milestones (e.g., 7-day streak, 30-day streak, 100 entries), so that I feel encouraged and my progress is celebrated.
D13: As Ayşe, I want to occasionally receive "throwback" reminders ("Spark of Memory" - Planned - Phase 3) of a randomly selected past positive entry, so that I can re-experience past joys and stay motivated. (This should be configurable and not too frequent).

(E) Settings & Customization:
E14: As Ayşe, I want to manage my daily reminder (time, on/off) (Implemented), so that it fits my schedule.
E15: As Ayşe, I want to manage my "throwback" reminder preferences (frequency, on/off) (UI Planned - Phase 3 functionality), so that I control how often I see them.
E16: As Ayşe, I want to be able to switch between light and dark themes (Implemented) for comfortable viewing.
E17: As Ayşe, I want access to legal documents like Privacy Policy and Terms of Service, and an option to log out (Implemented). A simple FAQ or help section (Planned - Future) would also be useful if I have questions.

3. UI/UX & Design System
(A) Philosophy:
Minimalist & Uncluttered: Every element must serve a purpose. Avoid visual noise.
Calm & Serene: The app should feel like a peaceful digital space.
Intuitive & Effortless: Interactions should be obvious and require minimal cognitive load.
Positive Reinforcement: Gentle nudges and rewards.

(B) Wireframes (Low-Fidelity - Figma/Excalidraw):
Screen List (Reflecting current implementation and planned phases):
*   **Splash/Loading Screen** (Implemented)
*   **Onboarding Screens** (Welcome, Benefit Explanation, Reminder Setup) (Implemented)
*   **Auth Stack Screens:** (Implemented)
    *   `LoginScreen` (Email/Password, Google Login options)
    *   `SignUpScreen` (Email/Password, Google Login options)
*   **Main App Screens (Bottom Tab Navigation - `AppTabs.tsx`):** (Implemented)
    *   **Daily Entry Screen (`EnhancedDailyEntryScreen.tsx` - Tab 1):** (Implemented)
        *   Prompt for today's entry ("Bugün neye minnettarsın?")
        *   Current streak display ("Günlük Seri")
        *   Input for gratitude items
        *   Save button ("Kaydet")
    *   **Past Entries Screen (`EnhancedPastEntriesScreen.tsx` - Tab 2):** (Implemented)
        *   Chronological list of past entries with snippets.
        *   Ability to tap to view/edit details (`EntryDetailScreen`).
    *   **Calendar View Screen (`EnhancedCalendarViewScreen.tsx` - Tab 3):** (Planned - Phase 3)
        *   Monthly calendar display.
        *   Dates with entries highlighted.
        *   Tap date to see entries for that day (potentially navigating to `EntryDetailScreen` or a filtered list).
    *   **Settings Screen (`EnhancedSettingsScreen.tsx` - Tab 4):** (Implemented)
        *   Navigation to `EnhancedReminderSettingsScreen` (daily reminder time, on/off; throwback reminder settings - UI for Phase 3 functionality).
        *   Theme selection (Light/Dark).
        *   Links to `EnhancedPrivacyPolicyScreen`, `EnhancedTermsOfServiceScreen`.
        *   Logout.
        *   (Future: FAQ, Delete Account with clear warnings).
*   **Modal/Standalone Screens:**
    *   **New/Edit Entry Screen (`EntryEditorScreen` or similar - used by Daily Entry & Past Entries for editing):** (Implemented)
        *   Date display (auto-filled for new, shows entry date for edit).
        *   Text input field for gratitude items.
        *   Save/Confirm button.
    *   **Entry Detail View Screen (`EntryDetailScreen.tsx`):** (Implemented)
        *   Full text of a selected entry.
        *   Edit/Delete options (Edit navigates to `EntryEditorScreen`).
*   **Conceptual/Future Screens/Modals:**
    *   **Streak/Milestone Celebration Modal/Screen:** (Planned - Phase 2 - "Gratitude Blooming" visual)
    *   **Throwback Notification/Modal ("Spark of Memory"):** (Planned - Phase 3)

(C) Color Palette & Theming:
The application utilizes a dynamic theming system (`EnhancedAppTheme`) with light and dark modes. The color palette is defined semantically to ensure consistency and adaptability across themes. Key semantic color roles include:
*   **Brand Colors:** `primary`, `secondary`, `tertiary`, `accent` (each with `on[Color]`, `[Color]Container`, `on[Color]Container` variants for accessible text and distinct component backgrounds).
*   **Surface Colors:** Various `surface` shades (e.g., `surface`, `surfaceDim`, `surfaceBright`, `surfaceContainerLowest` to `surfaceContainerHighest`) for backgrounds, cards, and component layers, each with corresponding `onSurface` and `onSurfaceVariant` colors for text and icons.
*   **Content Colors:** `outline`, `outlineVariant`, `scrim` for borders, dividers, and overlays.
*   **State Colors:** `error`, `success`, `warning`, `info` (each with `on[Color]`, `[Color]Container`, `on[Color]Container` variants) for feedback and alerts.
*   **Interaction States:** Specific colors for `pressed`, `focused`, `hovered`, `dragged` states.
*   **Legacy Colors:** A set of common legacy color names are mapped to the new semantic system for easier migration of older components (e.g., `textPrimary`, `background`).
Emphasis: The overall palette, in both light and dark themes, is designed to evoke tranquility and support readability. Specific hex values are defined within `lightTheme.ts` and `darkTheme.ts` but components should always reference the semantic theme tokens.
(D) Typography:
Primary Font (Headings): A friendly, slightly rounded Sans-Serif (e.g., Nunito, Montserrat, Lato). Must support full Turkish characters (ğ, ı, İ, ö, ş, ü, Ç).
Secondary Font (Body Text & UI Elements): A highly readable Sans-Serif (e.g., Open Sans, Roboto, Inter). Must support full Turkish characters.
Hierarchy: Clear distinction using size, weight, and color.
(E) Spacing & Grid:
8-Point Grid System: All margins, paddings, and element spacing to be multiples of 8px.
Generous White Space: To ensure a clean, uncluttered, and calming layout.
(F) Iconography:
Style: Soft, rounded, line icons. Minimalist and easily understandable.
Usage: For navigation, actions (add, edit, delete), settings, notifications.
Consistency: Uniform stroke weight and style.
(G) Imagery & Illustrations:
If used (e.g., onboarding, empty states, "Gratitude Blooming"), they should be abstract, nature-inspired, or simple geometric patterns in the calming color palette.
Avoid stock photos or complex scenes.
(H) Tone of Voice:
Supportive, gentle, encouraging, empathetic, calm. (Turkish equivalents to be used in-app)
Example prompt: "Bugün neye minnettarsın?" (What are you grateful for today?)
Example reminder: "Minnettarlık için bir an?" (A moment for gratitude?)
(I) Accessibility (A11y):
Adhere to WCAG 2.1 AA guidelines where possible.
Sufficient color contrast.
Support for dynamic font sizes.
Proper labeling for screen readers.
(K) Dynamic Theming & Styling:
*   The app uses `EnhancedAppTheme` which provides a comprehensive set of design tokens beyond colors, including typography scales, spacing units, border radius options, elevation styles for depth perception, standardized animations/transitions, responsive breakpoints, and pre-defined component variants (e.g., for buttons, inputs, cards). This ensures a consistent and maintainable UI that adapts to user preferences (light/dark mode).
(J) Micro-interactions & Animations:
Subtle and delightful, not distracting.
Examples: Gentle fade-ins, smooth transitions, a subtle shimmer on streak updates.
4. Monetization (Initial Thoughts)
Option 1: One-Time Purchase: A fair, single price for the full app.
Option 2: Freemium (Carefully Considered):
Free: Core journaling, streak, limited past entry history (e.g., last 30 days), basic reminders.
Premium (One-time unlock): Unlimited history, calendar view, advanced reminder options, themes/visual rewards.
Avoid: Ads, intrusive paywalls, or features that feel essential being locked away if a free tier exists.
Decision on monetization strategy to be made before Phase 4.
5. Technology Stack (Confirmation)
Mobile App: React Native + Expo for rapid development, managed workflow, and OTA updates.
Backend/DB: Supabase for integrated Auth, Postgres DB, Storage, and Edge Functions.
This stack is deemed suitable for achieving the desired simplicity, user experience, and feature set for Yeşer.
6. Success Metrics (How we know Ayşe is happy)
DAU/MAU (Daily/Monthly Active Users)
Retention Rate (D1, D7, D30)
Average Streak Length
Entries per User
Feature Adoption (e.g., reminder usage, throwback engagement)
App Store Ratings & Reviews
Churn Rate
7. Non-Goals / Out of Scope (For Initial Releases - V1/V2)
Social sharing features or community aspects.
Advanced analytics or mood tracking beyond simple gratitude.
Complex gamification beyond streaks and gentle rewards.
AI-powered journaling prompts or analysis.
Integration with other health apps or calendars.
Photo attachments to entries.
Web version.
Multiple journals or categories.
