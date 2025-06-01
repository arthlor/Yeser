# Phase 1: Foundation & Core Implementation

This phase focuses on establishing the foundational elements of the theming system.

### 1. Define Theme Scope & Requirements

*   **Themes:** Start with a 'light' theme and a 'dark' theme. Both have been refined with new color palettes focusing on improved readability, accessibility (contrast), and a calming, minimalist aesthetic suitable for the Yeşer app.
*   **Selection:** User-selectable via app settings. System preference synchronization can be a future enhancement.
*   **Coverage:** The theme now covers an extensive range of properties defined in `EnhancedAppTheme` (`src/themes/types.ts`). This includes a rich semantic color palette (with base, 'on', container, and 'onContainer' variants), detailed typography scales, granular spacing units, elevation styles for depth, animation presets, responsive breakpoints, and pre-defined component variants for common UI elements like buttons, inputs, and cards.

### 2. Choose Theming Technology & Approach

*   **Context:** Utilize React Context (`ThemeContext`) to provide theme data throughout the application.
*   **State Management:** Employ Zustand (`src/store/themeStore.ts`) for managing the active theme name (e.g., 'light', 'dark') and theme switching logic. This includes persisting the selected theme using AsyncStorage.
*   **TypeScript:** Define clear TypeScript interfaces for the theme structure, primarily `EnhancedAppTheme` and its constituent types like `ThemeColors`, `ThemeTypography`, `ThemeSpacing`, `ThemeElevation`, `ThemeAnimations`, `ThemeBreakpoints`, and `ComponentVariants` in `src/themes/types.ts`.

### 3. Create Theme Definitions

*   **Directory:** Establish a dedicated directory `src/themes/` for theme files.
*   **Files:** Create `lightTheme.ts` and `darkTheme.ts` within this directory.
*   **Structure:** Each theme file (`lightTheme.ts`, `darkTheme.ts`) exports a theme object conforming to the `EnhancedAppTheme` interface, including `colors`, `typography`, `spacing`, `borderRadius`, `elevation`, `animations`, `breakpoints`, and `components` (variants).
*   **Semantic Naming:** Use extensive semantic names for colors as defined in `ThemeColors`. This includes primary, secondary, tertiary, and accent colors with their 'on', 'container', and 'onContainer' counterparts. It also covers various surface colors, content colors (like `outline`, `scrim`), state colors (success, warning, error, info) with their containers, and interaction state colors. Legacy tokens are also supported for smoother transition.
*   **Dark Theme Palette:** The dark theme palette has been designed to complement the app's aesthetic, ensuring good contrast and readability with muted teals, dark greys, and soft reds.

### 4. Implement `ThemeProvider` and `useTheme` Hook

*   **`ThemeProvider.tsx`** (to be created in `src/providers/`):
    *   Consumes `currentTheme` (e.g., 'light' or 'dark') from the `themeStore`.
    *   Selects the appropriate theme object (`lightTheme` or `darkTheme`) based on the `currentTheme`.
    *   Provides this theme object to its children via `ThemeContext.Provider`.
*   **`useTheme` Hook** (provided by `ThemeProvider.tsx` in `src/providers/`):
    *   A custom hook that components use to access the current `theme` object, the `currentThemeName` ('light' | 'dark'), and the `toggleTheme` function from the context (e.g., `const { theme, currentThemeName, toggleTheme } = useTheme();`).

### 5. Create Theme Store (`themeStore.ts`)

*   **Location:** `src/store/themeStore.ts`.
*   **State:** Will hold the `currentTheme: 'light' | 'dark'`.
*   **Actions:** Include `setTheme(themeName: 'light' | 'dark')` and `toggleTheme()`.
*   **Persistence:** Leverage Zustand's `persist` middleware with AsyncStorage to save the user's theme preference across app sessions.
*   **Selectors:** Provide a basic selector like `selectCurrentTheme()` to get the active theme name.

**Phase 1 is now complete. The foundational elements for the theming system are in place.**
