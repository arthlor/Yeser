# Developer Guide: Yeşer App Theming System

This guide details how to work with and extend the theming system in the Yeşer app.

### Using the `useTheme` Hook

*   **Purpose:** To access the current theme object, theme name, and theme toggling function within your React components.
*   **Usage:** Import `useTheme` from `src/providers/ThemeProvider.tsx` and call it within your functional component.
*   **Returns:** An object `{ theme: AppTheme, currentThemeName: 'light' | 'dark', toggleTheme: () => void }`.
*   **Example:**
    ```tsx
    import React from 'react';
    import { View, Text, Button } from 'react-native';
    import { useTheme } from '../providers/ThemeProvider'; // Adjust path as necessary

    const MyComponent = () => {
      const { theme, currentThemeName, toggleTheme } = useTheme();

      return (
        <View style={{ backgroundColor: theme.colors.background, padding: theme.spacing.medium }}>
          <Text style={{ color: theme.colors.text, ...theme.typography.body1 }}>
            Current theme: {currentThemeName}
          </Text>
          <Button title="Toggle Theme" onPress={toggleTheme} color={theme.colors.primary} />
        </View>
      );
    };

    export default MyComponent;
    ```
*   **Note:** Ensure the component using this hook is a descendant of the `ThemeProvider` (located in `src/App.tsx`) for the hook to correctly access the theme context.

### Adding New Themed Components

*   **Principle:** Components should derive all theme-dependent styles (colors, fonts, spacing, border radii, etc.) from the theme object provided by `useTheme`. Avoid hardcoding these values directly in components.
*   **Pattern (`createStyles`):** A common and recommended pattern is to define a `createStyles` function that accepts the `AppTheme` object (and potentially other component-specific props like `variant` or `disabled` state) and returns a `StyleSheet.create` object. This keeps styles co-located with the component and makes them reactive to theme changes. This function is typically defined outside the component to avoid re-creation on every render, unless it depends on props.
*   **Example (`src/components/ThemedButton.tsx`):
    A `ThemedButton.tsx` component in `src/components/ThemedButton.tsx` demonstrates this pattern effectively. It includes:
    *   Usage of `useTheme` to get the current theme.
    *   A `createStyles` function that adapts styles based on the theme, button `variant` (e.g., 'primary', 'secondary', 'outline'), and `isLoading`/`disabled` states.
    *   Application of `theme.colors`, `theme.typography`, `theme.spacing`, and `theme.borderRadius`.

    Refer to `/src/components/ThemedButton.tsx` for a complete, practical example. Here's a conceptual snippet highlighting the core idea:

    ```tsx
    // In your component file, e.g., src/components/MyCustomComponent.tsx
    import React from 'react';
    import { View, Text, StyleSheet } from 'react-native';
    import { useTheme } from '../providers/ThemeProvider'; // Adjust path as necessary
    import { AppTheme } from '../themes/types'; // Adjust path

    // Define createStyles outside the component if it only depends on theme
    const createStyles = (theme: AppTheme) => StyleSheet.create({
      container: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.medium,
        borderRadius: theme.borderRadius.small,
      },
      label: {
        color: theme.colors.onSurface,
        // Example of applying a full typography style object
        ...theme.typography.body1, 
      },
    });

    const MyCustomComponent = () => {
      const { theme } = useTheme();
      // Call createStyles inside the component to get the themed styles
      const styles = createStyles(theme);

      return (
        <View style={styles.container}>
          <Text style={styles.label}>Hello Themed World!</Text>
        </View>
      );
    };

    export default MyCustomComponent;
    ```
*   **Key Takeaways from `ThemedButton.tsx`:**
    *   **Dynamic Styling:** The `createStyles` function can take `theme` and other parameters (like `variant`, `disabled`) to return different style objects.
    *   **Comprehensive Theme Usage:** Utilizes various parts of the theme object (`colors`, `typography`, `spacing`, `borderRadius`).
    *   **State Awareness:** Handles `isLoading` and `disabled` states by adjusting styles accordingly.

### Structure of Theme Objects (`AppTheme`)

*   The `AppTheme` interface defines the comprehensive shape of your theme objects. This is crucial for TypeScript type safety and ensuring predictability when accessing theme properties.
*   It's recommended to define this and related types in a dedicated file, for example, `src/themes/types.ts`.
*   **Example `AppTheme` Structure:**
    ```typescript
    // src/themes/types.ts (Example)
    export interface ThemeColors {
      primary: string;        // Main brand color for interactive elements
      onPrimary: string;      // Text/icons on primary background
      secondary: string;      // Secondary brand color
      onSecondary: string;    // Text/icons on secondary background
      accent: string;         // Accent color for highlights, CTAs
      onAccent: string;       // Text/icons on accent background
      background: string;     // Default screen/app background
      onBackground: string;   // Text/icons on main background
      surface: string;        // Background for components like cards, dialogs, sheets
      onSurface: string;      // Text/icons on surface background
      text: string;           // General purpose text color (often alias for onBackground or onSurface)
      textSecondary: string;  // Muted text color for less emphasis
      border: string;         // Color for borders and dividers
      error: string;          // Color indicating an error state
      onError: string;        // Text/icons on error background
      primaryVariant: string; // A lighter or darker shade of primary
      inputBackground: string;  // Background for text inputs
      inputText: string;        // Text color inside inputs
      disabled: string;         // Color for disabled elements or text
      shadow: string;           // Color for shadows, can be semi-transparent
      danger: string;           // Color for destructive actions or critical alerts
      onDanger: string;         // Text/icons on danger background
    }

    export interface ThemeTypographyStyle {
      fontFamily?: string;
      fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
      fontSize?: number;
      lineHeight?: number;
      letterSpacing?: number;
      // ... other React Native TextStyle properties
    }

    export interface ThemeTypography {
      fontFamilyRegular: string; // Base regular font family
      fontFamilyBold: string;    // Base bold font family
      h1: ThemeTypographyStyle;
      h2: ThemeTypographyStyle;
      h3: ThemeTypographyStyle;
      body1: ThemeTypographyStyle; // Standard body text
      body2: ThemeTypographyStyle; // Smaller or secondary body text
      button: ThemeTypographyStyle;
      caption: ThemeTypographyStyle;
      overline: ThemeTypographyStyle;
      subtitle1: ThemeTypographyStyle; // For subtitles under main titles
      label: ThemeTypographyStyle;     // For form labels, small info text
    }

    export interface ThemeSpacing {
      xxs: number; // e.g., 2
      xs: number;  // e.g., 4
      small: number; // e.g., 8 (s)
      medium: number;// e.g., 12 or 16 (m)
      large: number; // e.g., 20 or 24 (l)
      xl: number;  // e.g., 32
      xxl: number; // e.g., 48
    }

    export interface ThemeBorderRadius {
      none: number;   // 0
      small: number;  // e.g., 4
      medium: number; // e.g., 8
      large: number;  // e.g., 16
      xl: number;     // e.g., 24
      full: number;   // e.g., 9999 (for creating pills or fully rounded corners)
    }

    // Main Theme Interface
    export interface AppTheme {
      name: 'light' | 'dark'; // Identifier for the current theme
      colors: ThemeColors;
      typography: ThemeTypography;
      spacing: ThemeSpacing;
      borderRadius: ThemeBorderRadius;
      // Future additions could include elevations, icon sets, etc.
    }
    ```

### Integrating with React Navigation

Theming for React Navigation (headers, tab bars, etc.) is handled in `src/App.tsx`. The app's `AppTheme` is dynamically mapped to a theme object that React Navigation understands.

*   **Mechanism:** Inside the `AppContent` component in `src/App.tsx`, the `useTheme` hook provides the current `theme` object. This is then used to construct a `navigationTheme`.
*   **Mapping:**
    *   The base for `navigationTheme` is either `DefaultTheme` or `DarkTheme` from `@react-navigation/native`.
    *   Key colors from our `AppTheme` are then overlaid:
        *   `navigationTheme.colors.primary` is set to `theme.colors.primary` (for active tints, etc.).
        *   `navigationTheme.colors.background` is set to `theme.colors.background` (for screen backgrounds).
        *   `navigationTheme.colors.card` is set to `theme.colors.surface` (for header and tab bar backgrounds).
        *   `navigationTheme.colors.text` is set to `theme.colors.text` (for header titles and tab labels).
        *   `navigationTheme.colors.border` is set to `theme.colors.border`.
*   **Usage:** This `navigationTheme` is passed to the `theme` prop of the `<NavigationContainer />`.
*   **Status Bar:** The `StatusBar` style (`light-content` or `dark-content`) is also dynamically set in `App.tsx` based on `theme.name` to ensure good contrast.

This setup ensures that when the app's theme changes, React Navigation components automatically update their appearance.

### Theme Color Palettes and Semantic Meanings

*   **Semantic Tokens:** The core idea is to use semantic tokens (e.g., `theme.colors.primary`, `theme.colors.background`) throughout the application instead of raw color values (e.g., `#FFFFFF`, `#000000`). This abstraction is what allows themes to be swapped easily and makes the codebase more maintainable and understandable.
*   **Core Semantic Color Roles (examples, including new additions):**
    *   `primary`: The primary brand color. Used for key interactive elements like main buttons, active states, and important highlights.
    *   `onPrimary`: Color for text and icons that appear on top of `primary` colored backgrounds, ensuring readability.
    *   `secondary`: A secondary brand color, often used for less prominent interactive elements, alternative actions, or to complement the primary color.
    *   `onSecondary`: Color for text and icons on `secondary` backgrounds.
    *   `accent`: An accent color used sparingly for calls to action (CTAs) or specific highlights that need to stand out.
    *   `onAccent`: Color for text and icons on `accent` backgrounds.
    *   `background`: The default background color for most screens and the overall application window.
    *   `onBackground`: The color for primary text and icons appearing directly on the `background`.
    *   `surface`: The background color for components that are perceived to be on a layer above the main `background`, such as cards, dialogs, modals, and bottom sheets.
    *   `onSurface`: The color for primary text and icons appearing on `surface` backgrounds.
    *   `text`: Often an alias for `onBackground` or `onSurface`, representing the most common text color.
    *   `textSecondary`: A more muted or de-emphasized text color for secondary information, hints, or captions.
    *   `border`: Color used for component borders, outlines, and dividers.
    *   `error`: A color used to indicate errors or failed validation.
    *   `onError`: Color for text and icons on `error` backgrounds.
    *   `primaryVariant`: A lighter or darker shade of the primary color, used for subtle variations or states (e.g., pressed button).
    *   `inputBackground`: Specific background color for text input fields.
    *   `inputText`: Text color specifically for content within input fields.
    *   `disabled`: Color used for disabled interactive elements or text, indicating non-interactivity.
    *   `shadow`: Color used for drop shadows, often semi-transparent to create depth.
    *   `danger`: Color for critical alerts or destructive actions (e.g., delete operations).
    *   `onDanger`: Text/icons on `danger` backgrounds.

*   **Current Theme Palettes (`lightTheme.ts`, `darkTheme.ts`):**
    *   The Yeşer app now features carefully designed `lightTheme` and `darkTheme` palettes.
    *   **Philosophy:** Both palettes prioritize a **calm and minimalist aesthetic**, aligning with the app's goal of providing a serene user experience.
    *   **Readability & Accessibility:** Significant attention has been paid to ensuring **good text readability and high contrast ratios** to meet accessibility standards (WCAG AA).
    *   **Consistency:** Semantic tokens are used consistently across both themes to ensure a predictable and harmonious visual experience when switching themes.
    *   **For concrete color values, developers should refer directly to `src/themes/lightTheme.ts` and `src/themes/darkTheme.ts`.** These files are the source of truth for all color definitions.

*   **Note:** The actual hex codes for the light theme should be precisely mapped from your established design palette. The dark theme colors require careful design to ensure they align with Yeşer's 'calm and minimalist' philosophy while maintaining excellent readability and accessibility (WCAG AA contrast ratios).
