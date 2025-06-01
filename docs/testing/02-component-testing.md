# Component Testing (React Native Testing Library)

**Focus:** Individual UI components in isolation, verifying rendering and basic interactions.

**Tools:** React Native Testing Library (RNTL)

**Scope (Based on Phases 0-2):**

### 1. Common Components (`src/components/common/`)
- `Button`: Renders text/icon, handles `onPress`.
- `Input`/`TextInput`: Renders placeholder, value, handles `onChangeText`, displays error messages.
- `LoadingIndicator`: Renders correctly.
- `ErrorMessage`: Displays error message.
- `Card`: Renders children, applies styles.
- Any other generic, reusable components.

### 2. Feature-Specific Components (`src/components/features/`)
- **Authentication:**
  - `AuthForm` (if used by Login/SignUp): Renders fields, handles input, calls submit function.
  - `SocialLoginButton` (Google): Renders icon/text, handles `onPress`.
- **Onboarding:**
  - `OnboardingSlide` (if using a carousel): Renders content for each step.
  - `ReminderSetupOption`: Renders options, handles selection.
- **Gratitude:**
  - `GratitudeEntryForm`: Renders input for text and date, handles submission.
  - `GratitudeEntryCard` (for lists): Displays date, entry snippet, handles `onPress`.
  - `GratitudeEntryDetail`: Displays full entry content.
  - `StreakDisplay`: Renders streak count and label, updates with different values.
  - `GratitudeBloomingVisual`: Renders different visual stages based on streak milestones.
- **Settings:**
  - `ReminderSettingsToggle`: Renders label, handles toggle.
  - `TimePickerInput`: Renders current time, opens time picker on press.
- **Privacy:**
  - `PrivacyInfoDisplay`: Renders privacy text.

### 3. Screen Components (`src/screens/` - Basic Interaction & Structure)
*While full screen logic is better for E2E, basic rendering and presence of key elements can be component-tested.*

- **`LoginScreen.tsx`:**
  - Renders email/password inputs, login button, sign-up link, Google sign-in button.
  - Test form submission (mocking auth functions).
- **`SignUpScreen.tsx`:**
  - Renders email/password inputs, sign-up button, login link.
  - Test form submission (mocking auth functions).
- **`DailyEntryScreen.tsx`:**
  - Renders text input, date picker, save button.
  - Test input changes and save button press (mocking API calls).
- **`PastEntriesScreen.tsx`:**
  - Renders list of entries (with mocked data).
  - Renders empty state, loading state, error state.
  - Test `onPress` for an entry item.
- **`EntryDetailScreen.tsx`:**
  - Renders entry details (with mocked data).
  - Renders Edit/Delete buttons.
- **`OnboardingScreen.tsx` / `OnboardingReminderSetupScreen.tsx`:**
  - Renders onboarding content, navigation buttons.
  - Test interaction with reminder setup options.
- **`ReminderSettingsScreen.tsx`:**
  - Renders toggle for enabling reminders, time picker input.
  - Test interaction with settings controls (mocking profile updates).
- **`PrivacyScreen.tsx`:**
  - Renders privacy policy text.
- **`HomeScreen.tsx` (or main dashboard screen):**
  - Renders key elements like streak display, navigation to other screens.

**Mocking Strategy:**
- Mock navigation hooks (`useNavigation`, `useRoute`) where necessary.
- Mock Zustand store hooks to provide initial state and mock actions.
- Mock API service calls (`authService`, `profileApi`, `gratitudeApi`).
- Mock `expo-notifications` if components directly interact with it.
