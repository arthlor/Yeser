Phased Implementation Roadmap
This roadmap outlines the sequential development of Yeşer, focusing on delivering value to "Ayşe, The Peace-Seeking Millennial" by implementing features derived from the core user stories. All UI elements will be in Turkish.
Phase 0: Setup & Technical Foundation
Goal: Establish a robust technical groundwork for the application.
Tasks:
Initialize React Native (Expo) project with the recommended folder structure.
Configure ESLint, Prettier, and Husky for code quality and consistency.
Set up Supabase project:
Run the full SQL script from backend-database-setup.md (Profiles, Gratitude Entries tables, Auth Triggers, RLS, core RPCs like calculate_streak).
Configure Supabase Auth (Email/Password initially).
Core State Management:
AuthProvider (React Context) for user session and authentication state.
profileStore (Zustand) for user profile data (reminder settings, onboarded status).
Basic API Layer (src/api/):
auth.js: Functions for sign-up, login, logout.
profile.js: Functions to fetch and update user profile.
gratitude.js: Initial functions to add and fetch gratitude entries.
Basic Navigation (src/navigation/):
Auth Stack: Login ("Giriş Yap"), Sign Up ("Kayıt Ol") screens.
Main App Stack (placeholder screens initially).
Conditional rendering based on authentication state.
Environment variable setup (.env) for Supabase keys.
Phase 1: Core Journaling MVP
Goal: Implement the fundamental gratitude logging and viewing loop.
User Stories Covered (Primary): A1 (Email/Pass), B5, B7, C8 (List view), C9, D11.
Tasks:
Authentication Screens (UI & Logic):
Login Screen ("Giriş Yap") with email/password.
Sign Up Screen ("Kayıt Ol") with email/password.
(User Story A1)
Daily Entry Screen:
UI for writing a single gratitude entry ("Bugün neye minnettarsın?" placeholder).
"Kaydet" (Save) button.
Save entry to Supabase (gratitude_entries table, including entry_date).
Confirmation message/animation on save.
(User Stories B5, B7)
Past Entries Screen (List View):
FlatList to display past entries chronologically (date, snippet).
Tap an entry to view its full text (potentially on a detail screen or expandable item).
Empty state if no entries.
(User Stories C8 - List, C9)
Streak Counter:
useStreak custom hook that calls calculate_streak RPC.
Sync streak value to Zustand store.
Display streak prominently in the UI ("Günlük Seri").
(User Story D11)
Basic Onboarding Flow (Simple):
1-2 screens explaining app benefit after first login.
Update profiles.onboarded to true on completion.
(Partial User Story A2 - initial version)
Basic Reminder Settings UI:
UI to enable/disable daily reminders and set reminder_time in profiles table.
(Partial User Story A3 & E14 - UI only, notification logic later)
Phase 2: Enhancing Engagement & Core Polish     
Goal: Improve user retention, refine core features, and add initial engagement mechanics.
User Stories Covered: A2 (Full), A3 (Full), B6, C10, D12, E14 (Full).
Tasks:
Full Onboarding Experience:
Refine onboarding flow with welcome, benefit explanation.
Option to set initial daily reminder time during onboarding.
(User Story A2 - Full)
Daily Reminders (Functional):
Integrate expo-notifications service.
Schedule local daily notifications based on user's reminder_enabled and reminder_time from profiles.
Full settings UI for managing reminders (time, on/off).
(User Stories A3 - Full, E14 - Full)
Entry Enhancements:
Allow adding multiple gratitude items for a single day (e.g., simple multi-line text input, or UI for distinct items if entry_items JSONB is chosen). (User Story B6)
Implement Edit and Delete functionality for past entries (update/delete API calls, UI buttons in entry detail/list). (User Story C10)
"Gratitude Blooming" Visual (Milestone Reward):
Component that visually represents streak milestones (e.g., a simple graphic evolving from sprout to plant based on streak length).
Integrate with streak counter.
(User Story D12)
Social Logins (Google via Supabase):
Integrate Supabase Auth with Google/Apple.
Update Auth screens and logic.
(User Story A1 - Social Login part)
Privacy Information:
Simple screen or modal explaining data privacy (linked from onboarding/settings).
(User Story A4)
Phase 3: Advanced Features & User Empowerment 
Goal: Introduce features that provide more value, reflection opportunities, and user control.
User Stories Covered: C8 (Calendar view), D13, E15, E16.
Tasks:
"Spark of Memory" (Throwback Feature):
Occasionally call get_random_gratitude_entry RPC.
Display the fetched entry in a non-intrusive modal or dedicated section.
(User Story D13)
Throwback Reminder Preferences:
Settings UI to enable/disable "Spark of Memory" and set frequency (e.g., daily, weekly - store in profiles.throwback_reminder_enabled, profiles.throwback_reminder_frequency).
(User Story E15)
Calendar View for Past Entries:
Implement a new screen or view mode using a calendar component.
Highlight dates with entries (use get_entry_dates_for_month RPC).
Tap a date to see entries for that day.
(User Story C8 - Calendar)
Phase 4: Polish, Monetization & Launch Prep (Ongoing Post-MVP Phases)
Goal: Refine UX, implement legal requirements, integrate analytics, and prepare for wider release, potentially including monetization.
User Stories Covered: E17, Monetization considerations.
Tasks:
Analytics Integration:
Integrate PostHog (or chosen analytics tool).
Add event tracking for key user actions (sign-ups, entries logged, streaks achieved, feature usage) in the API layer or relevant UI components.
UX Refinements & Polish:
Address any UI/UX issues identified during testing.
Implement micro-interactions and animations for a more polished feel.
Optimize performance (client and backend queries).
Legal & Informational Content:
Create screens for Privacy Policy ("Gizlilik Politikası") and Terms of Service ("Kullanım Koşulları").
Implement FAQ/Help section within the app.
(User Story E17)
Monetization Strategy (If Pursued):
Decide on model (One-Time Purchase vs. Freemium).
If Freemium:
Define free vs. premium features clearly.
Implement paywall/unlock mechanism (e.g., using RevenueCat or Expo IAP).
If One-Time Purchase: Implement for app stores.
Comprehensive Testing:
Final E2E testing of all critical user flows.
Turkish UI and localization checks.
Accessibility review.
App Store Preparation:
Prepare all store metadata (descriptions, screenshots, keywords) in Turkish.
Set up app store listings.
Ongoing (Throughout all Phases)
Testing: Unit, component, and E2E tests as features are developed.
Code Reviews: Ensure code quality and adherence to standards.
Refactoring: Address technical debt and improve code structure.
Documentation: Keep internal documentation updated.
Bug Fixing: Address issues found during development and testing.
Feedback Iteration: (Post-launch) Incorporate user feedback for continuous improvement.
