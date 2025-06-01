# Phase 3: Testing & Finalization

This phase focuses on thoroughly testing the implemented theming system and refining it for release.

### 8. Testing and Refinement

*   **Unit Tests (Jest):**
    *   **`themeStore.ts` (Zustand):**
        *   `setTheme` action: Verify `currentTheme` state changes correctly (e.g., to 'light', 'dark').
        *   `toggleTheme` action: Verify `currentTheme` state toggles correctly between 'light' and 'dark'.
        *   Initial state: Test loading of the initial theme (defaulting to 'light' or a predefined value), especially how it interacts with persisted state from AsyncStorage.
        *   Selectors: Test `selectCurrentTheme` (or any other selectors) to ensure they return the correct theme name or derived state.
        *   Persistence (AsyncStorage): Focus on actions correctly setting the state that is intended for persistence. Mocking AsyncStorage can help verify that the store attempts to read from and write to storage as expected.
    *   **Theme Definition Files (e.g., `lightTheme.ts`, `darkTheme.ts`):**
        *   Interface Conformance: Verify that exported theme objects correctly implement the `AppTheme` TypeScript interface.
        *   Token Completeness: Check that all defined semantic tokens (including the extended set for colors like `inputBackground`, `disabled`, `primaryVariant`, `shadow`, `danger`, `onDanger`, and typography like `subtitle1`, `label`) are present and correctly typed in each theme object.
        *   Basic Value Validation: For critical tokens, perform sanity checks on values (e.g., colors are valid hex/rgba strings, spacing units are numbers). While full contrast validation is for accessibility testing, basic structural checks can be done here.
    *   **Theme Utility Functions (if any are created):**
        *   If you create utility functions (e.g., for merging theme properties, dynamic color calculations, or style generation helpers beyond the standard component pattern), ensure they are unit tested with various inputs, outputs, and edge cases.
    *   **`useTheme` Hook:**
        *   Mock the `ThemeContext` to provide different theme values and verify that the `useTheme` hook returns the expected theme object within a test component wrapper.
    *   **`ThemeProvider.tsx`:**
        *   Test that the `ThemeProvider` correctly subscribes to the `themeStore` and provides the selected theme object via context to its children. This can be tested by rendering the provider with a simple child component that consumes and displays a value from the theme context, then changing the theme in the mock store and asserting the child updates.
*   **Component Tests (React Native Testing Library):** For key UI components, verify that they render correctly with both light and dark themes. Check that styles are applied as expected when the theme changes.
*   **E2E Tests (Maestro/Detox):** Add test flows for:
    *   Switching themes via the settings UI and verifying the change across multiple screens, including navigation elements (headers, tab bars, status bar).
    *   Critical user flows (e.g., onboarding, login, creating an entry, viewing entries) running under both light and dark themes to catch any visual regressions or usability issues.
*   **Manual Testing:** Perform comprehensive manual testing on various devices and screen sizes for both themes. Pay close attention to readability, contrast, and overall aesthetic consistency with the app's 'calm and minimalist' philosophy. Specifically verify that navigation elements (headers, tab bars, status bar) correctly adapt their appearance (backgrounds, text/icon colors, border colors) to the active theme.
*   **Accessibility Testing:** Crucially, verify color contrast ratios for text, icons, and interactive elements in both themes to meet WCAG 2.1 AA guidelines. This is especially important for the dark theme.
*   **Refinement:** Based on testing, refine theme colors, component styles, and fix any bugs. The color palettes have already undergone significant refinement for improved readability and a calming aesthetic. Continue to ensure all UI elements, including navigation, are themed and no hardcoded colors remain in areas that should be theme-dependent.
