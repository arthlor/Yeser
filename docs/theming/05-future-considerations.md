# Future Considerations for Theming

This section outlines potential future enhancements for the Yeşer app's theming system, to be considered post-MVP.

*   **System Theme Sync:** Implement functionality to detect and apply the user's OS-level theme preference (light/dark mode) automatically. This could be the default behavior, with an option for users to override it within the app settings.
*   **Additional Themes:** Consider if more themes might be desired in the future. This could include:
    *   A high-contrast theme specifically designed for enhanced accessibility.
    *   Other color variations based on user feedback or to offer more personalization options.
*   **Theme-specific Assets:** If certain images, illustrations, or icons need to vary with the selected theme (e.g., a light version of an icon for dark mode and vice-versa), plan a strategy for managing and serving these assets. This might involve:
    *   A naming convention (e.g., `icon-name-light.png`, `icon-name-dark.png`).
    *   Logic within components to select and display the appropriate asset based on the current theme.
*   **Dynamic Theming Elements:** For advanced scenarios, explore the possibility of allowing users to customize specific parts of the theme beyond predefined theme sets, such as selecting their own primary color from a limited palette.
