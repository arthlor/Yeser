# Yeşer - Testing & Quality Assurance

## 1. Introduction

This document outlines the testing strategy, types of tests, tools, and quality assurance (QA) processes implemented for the Yeşer application. The primary objective is to ensure a stable, reliable, and user-friendly experience, verifying that all features function as intended and the application meets high-quality standards, particularly for its target user, Ayşe, who values a calm and dependable app.

## 2. Testing Philosophy & Strategy

Our testing strategy emphasizes a multi-layered approach:
*   **Preventative Measures:** Strong typing with TypeScript, linting with ESLint, and formatting with Prettier to catch errors early.
*   **Unit Tests:** Focus on isolating and testing the smallest units of code (functions, store logic) to ensure correctness of core business logic.
*   **Component Tests:** Verify that individual UI components render correctly and respond to basic interactions.
*   **Integration Tests (Conceptual):** Test the interaction between different parts of the application (e.g., a screen interacting with a service and a store).
*   **End-to-End (E2E) Tests (Future Goal):** Automate critical user flows from start to finish.
*   **Manual Testing:** Essential for exploratory testing, usability, UI/UX validation, and areas difficult to automate.

## 3. Types of Tests & Scope

### 3.1. Unit Tests
*   **Tool:** Jest
*   **Focus:** Pure business logic, utility functions, state management logic (Zustand stores - actions, selectors, initial state), custom hooks, and service layer methods (e.g., `authService.ts`, `gratitudeApi.ts`).
*   **Mocking:** Supabase client calls, external services (e.g., `@react-native-firebase/analytics`, `expo-notifications`), and native modules are mocked to ensure tests are fast and isolated.
*   **Examples:**
    *   `utils/dateUtils.ts`: Functions for formatting, comparing dates.
    *   `utils/validation.ts`: Legacy input validation logic (if any). New validation logic will primarily use Zod schemas.
    *   `schemas/*.ts`: Zod schemas for validating data structures (API responses, form inputs, etc.). Tests will verify these schemas correctly accept valid data and reject invalid data.
    *   `services/gratitudeApi.ts`: Mocking Supabase RPC calls like `calculate_streak`, `add_gratitude_statement`, `edit_gratitude_statement`, `delete_gratitude_statement`, `get_random_gratitude_entry`, and `get_entry_dates_for_month` to test different scenarios (e.g., successful operations, error handling, various input conditions) and ensure the service layer correctly interacts with these backend functions.
    *   `store/authStore.ts`: Testing actions like `signInWithEmail`, `signOut`, and selectors for user state and authentication status.
    *   `store/profileStore.ts`: Testing profile fetching and update logic.

### 3.2. Component Tests
*   **Tool:** Jest with React Native Testing Library (RNTL)
*   **Focus:** Testing individual UI components in isolation. Verifying they render correctly based on props, handle user interactions (presses, text input), and display expected information.
*   **Examples:**
    *   `components/ui/Button.tsx`: Renders with correct text/style, `onPress` handler is called.
    *   `components/GratitudeInput.tsx`: Text input updates value, character limit is respected.
    *   `components/GratitudeListItem.tsx`: Displays date and text snippet correctly.
    *   `components/StreakDisplay.tsx`: Shows correct streak count based on props.

### 3.3. Integration Tests (Conceptual / Planned)
*   **Tool:** Jest with React Native Testing Library (RNTL)
*   **Focus:** Testing the interaction between several components, screens, services, and stores. For example, a screen that fetches data using a service and updates its state via a store.
*   **Examples:**
    *   **Authentication Flow:** Testing the sequence from `LoginScreen` -> `authService.signIn` -> `authStore` update -> navigation to `HomeScreen`.
    *   **Gratitude Entry Submission:** `DailyEntryScreen` input -> `gratitudeApi.ts` (calling `add_gratitude_statement` RPC) -> mock Supabase RPC success/failure response -> `gratitudeStore` update -> UI confirmation/error display.

### 3.4. End-to-End (E2E) Tests (Future Consideration)
*   **Tools:** Detox or Maestro
*   **Focus:** Simulating complete user flows through the compiled application running on a simulator/emulator or real device.
*   **Examples:**
    *   Full onboarding process.
    *   Adding, viewing, editing, and deleting a gratitude entry.
    *   Changing settings and verifying their effect.

### 3.5. Manual Testing
*   **Scope:** Exploratory testing, UI/UX validation, visual regression, accessibility checks, performance observation, and testing on physical devices.
*   **Localization:** Verifying all Turkish text, layout adjustments for longer words, and correct character display (ğ, ü, ş, ı, ö, ç, İ).
*   **Accessibility (A11y):** Manual checks using VoiceOver (iOS) and TalkBack (Android), keyboard navigation (if applicable), color contrast, touch target sizes, and dynamic font scaling.
*   **Performance:** Observing app responsiveness, screen load times, list scrolling, and API response times during typical usage.

### 3.6. Backend Logic Testing (Supabase - PL/pgSQL & Triggers)
*   **Context:** A significant portion of Yeşer's business logic, including streak calculations, data integrity enforcement, and automated timestamp updates, is implemented directly within the Supabase PostgreSQL database using PL/pgSQL functions (RPCs) and database triggers (as detailed in `backend-database-setup.md`).
*   **Tools & Approach:**
    *   **Supabase Local Development Environment:** Use `supabase start` to run a local instance of the database.
    *   **SQL Client:** Utilize `psql`, Supabase Studio's SQL Editor, or other database GUI tools to directly execute functions and inspect data.
    *   **Test Scripts:** Write SQL scripts to set up test data, invoke functions/RPCs with various parameters, perform DML operations that fire triggers, and then query the database to assert expected outcomes and data changes.
    *   **pgTAP (Advanced/Future):** For more structured SQL unit testing, `pgTAP` is a PostgreSQL extension that allows writing TAP-compliant tests directly in SQL. This could be considered for more complex backend logic in the future.
*   **Scope & Examples:**
    *   **Individual RPC Testing:** Call functions like `calculate_streak(user_id)`, `add_gratitude_statement(user_id, date, statements_jsonb)`, etc., with diverse inputs (valid, invalid, edge cases) and verify their return values and any data modifications they perform.
    *   **Trigger Testing:** Perform `INSERT`, `UPDATE`, `DELETE` operations on tables like `gratitude_entries` and `profiles` to ensure triggers (e.g., `on_gratitude_entry_change`, `handle_updated_at`) fire correctly and execute their intended logic (e.g., calling `update_user_streak`, setting `updated_at` timestamps).
    *   **Constraint Verification:** Test that database constraints (e.g., `UNIQUE`, `NOT NULL`, `FOREIGN KEY`, `CHECK`) correctly prevent invalid data insertion or modification.
    *   **`handle_new_user()` Trigger:** Verify that inserting a new user into `auth.users` correctly creates corresponding entries in `public.profiles` and `public.streaks`.

## 4. Testing Tools & Libraries

*   **Jest:** Primary test runner for unit and component tests.
*   **React Native Testing Library (RNTL):** For writing user-centric component and integration tests.
*   **TypeScript:** Ensures type safety within tests.
*   **Supabase Client Mocks:** Custom mocks for `@supabase/supabase-js` to simulate API calls.
*   **ESLint/Prettier:** Static analysis and formatting, contributing to code quality.
*   **Expo Profiler / Flipper:** For performance monitoring during development and manual testing.
*   **Detox/Maestro (Future):** For E2E automation.

## 5. Quality Assurance (QA) Process

1.  **Static Code Analysis:** ESLint and Prettier are run automatically (e.g., pre-commit hooks if set up, or manually) to enforce coding standards and catch early errors.
2.  **Code Reviews:** All new code and significant changes are reviewed by at least one other developer (or lead) before merging to `develop` or `main` branches. Reviews focus on correctness, adherence to standards, performance, and test coverage.
3.  **Automated Testing:** Unit and component tests are written alongside feature development. These should be run locally by developers and ideally in a CI environment.
4.  **Developer Testing:** Developers manually test their features on simulators and physical devices before creating a pull request.
5.  **Sprint/Feature Testing:** At the end of a development cycle or before a release, dedicated manual testing is performed covering all new features and critical existing functionality. This includes verifying any backend logic changes by interacting with the application or, if necessary, directly testing RPCs/triggers in a staging-like environment.
6.  **Regression Testing:** Before releases, a suite of manual or (in future) automated regression tests is executed to ensure existing features are not broken.
7.  **Device Testing:** Testing on a range of physical iOS and Android devices to catch device-specific issues.
8.  **User Acceptance Testing (UAT) (Informal):** For Yeşer, this involves the primary stakeholder (representing Ayşe) reviewing and approving features and overall app quality before public release.

## 6. Current Test Coverage & Future Goals

*   **Current:**
    *   Basic ESLint and Prettier setup is in place.
    *   Unit tests for some utility functions and core service logic are being developed.
    *   Component tests for common UI elements are planned.
*   **Future Goals:**
    *   Achieve >80% unit test coverage for services, stores, and critical utility functions.
    *   Implement component tests for all reusable UI components and screen-level components.
    *   Develop integration tests for key user flows (authentication, gratitude management).
    *   Explore and implement E2E tests for the most critical paths using Detox or Maestro.
    *   Integrate automated tests (unit, component, E2E) into a CI/CD pipeline (e.g., EAS Build or GitHub Actions) to run on every pull request.

This structured approach to testing and QA aims to deliver a high-quality, robust, and delightful Yeşer application.
