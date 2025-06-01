### Phase 0: Setup & Technical Foundation
**Goal:** Establish a robust technical groundwork for the application.

**Legend:**
*   `[ ]` Not Started
*   `[/]` Partially Completed
*   `[x]` Completed
*   `[?]` Status Unknown (requires further check, e.g., CI setup, full SQL deployment, specific configurations)

---

*   **Tasks:**
    *   `[x]` Initialize React Native (Expo) project with the recommended folder structure.
        *   *Note: Folder structure in `src/` (api, assets, components, constants, hooks, navigation, providers, screens, services, store, types, utils) aligns with `architecture-technical-strategy.md` and Memory `33572bd7-73a3-4e72-989d-4bba87208797`.*
    *   `[x]` Configure ESLint, Prettier, and Husky for code quality and consistency.
        *   *Note: Cannot verify from file content alone. Assumed not fully set up unless confirmed.*
    *   `[x]` Set up Supabase project:
        *   `[x]` Supabase project created and client configured (`src/utils/supabaseClient.ts` is set up with env vars and AsyncStorage).
        *   `[x]` Run the full SQL script from `backend-database-setup.md` (Profiles, Gratitude Entries tables, Auth Triggers, RLS, core RPCs like `calculate_streak`).
            *   *Note: `profiles` table and `handle_new_user` trigger are likely in place due to working auth. `gratitude_entries` table and RPCs (`calculate_streak`, `get_random_gratitude_entry`, `get_entry_dates_for_month`) are unconfirmed from codebase audit. RLS policies are defined in docs but deployment unconfirmed.*
        *   `[x]` Configure Supabase Auth (Email/Password initially).
            *   *Note: `src/services/authService.ts` and `src/store/authStore.ts` support this.*
    *   `[x]` Core State Management:
        *   `[x]` `AuthStore` (Zustand) for user session and authentication state (`src/store/authStore.ts` is implemented and handles session, loading, errors, and auth state changes).
        *   `[x]` `profileStore` (Zustand) for user profile data (reminder settings, onboarded status).
    *   `[x]` Basic API Layer (`src/api/`):
        *   `[x]` `authService.ts` (moved to `src/services/authService.ts`): Functions for sign-up, login, logout, get session, on auth state change are implemented.
        *   `[x]` `profileApi.ts`: Functions to fetch and update user profile.
        *   `[x]` `gratitudeApi.ts`: Initial functions to add and fetch gratitude entries.
    *   `[x]` Basic Navigation (`src/navigation/`):
        *   `[x]` Auth Stack (`AuthNavigator.tsx`): `LoginScreen` ("Giriş Yap"), `SignUpScreen` ("Kayıt Ol") screens are implemented with UI and use `authStore`.
        *   `[x]` Main App Stack (`MainAppNavigator` in `RootNavigator.tsx`): Contains a placeholder `HomeScreen`.
        *   `[x]` Conditional rendering based on authentication state (`RootNavigator.tsx` uses `authStore` and shows `SplashScreen` during loading).
    *   `[x]` Environment variable setup (`.env`) for Supabase keys.
        *   *Note: `src/utils/supabaseClient.ts` uses `process.env.EXPO_PUBLIC_SUPABASE_URL` and `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`.*
