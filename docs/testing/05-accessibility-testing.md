# Accessibility Testing (A11y)

**Focus:** Ensure the app is usable by people with disabilities, adhering to WCAG 2.1 AA guidelines where applicable for mobile.

**Tools:** Screen readers (VoiceOver for iOS, TalkBack for Android), manual inspection, accessibility linters/checkers if available.

**Scope (Based on Phases 0-2 Features):**

### 1. Screen Reader Support (VoiceOver/TalkBack)
- **Navigation:**
  - All interactive elements (buttons, links, input fields, tabs) must be focusable and have clear, concise, and accurate labels in Turkish.
  - Logical focus order when swiping through elements.
  - Screen titles should be announced when navigating to a new screen.
- **Content Reading:**
  - Text content (gratitude entries, onboarding text, privacy info) should be read out clearly.
  - Important images or icons that convey information should have alternative text (accessibilityLabel).
  - Decorative images should be ignored by screen readers.
- **Interactive Elements:**
  - Buttons: Announce purpose and state (e.g., "Kaydet, düğme", "Günlük Hatırlatıcılar, açık, anahtar").
  - Input Fields: Announce label, current value, and placeholder/hint text.
  - Custom Controls (e.g., date picker, streak visual): Ensure they are accessible and their state is conveyed.

### 2. Touch Target Size
- All interactive elements (buttons, toggles, list items) should have a minimum touch target size (e.g., 44x44dp or Apple's recommended 44x44 points) to be easily tappable.
- Sufficient spacing between interactive elements.

### 3. Color Contrast
- **Text vs. Background:** Ensure sufficient color contrast for all text content against its background (aim for WCAG AA ratio of 4.5:1 for normal text, 3:1 for large text).
- **UI Elements vs. Background:** Non-text elements like icons or visual indicators that convey meaning should also have sufficient contrast.
- Test in various lighting conditions if possible.

### 4. Dynamic Font Size Support
- The app should respect the user's system-level font size settings.
- Test by increasing the device font size and ensuring text scales appropriately without truncation or layout breakage.
- All text should remain readable and usable.

### 5. Content Scaling & Reflow
- When font sizes are increased, content should reflow and remain usable without requiring horizontal scrolling (for portrait orientation).

### 6. Clear Visual Focus Indication
- When navigating with a keyboard (if applicable, e.g., on tablets or with assistive tech) or when an element is focused by a screen reader, there should be a clear visual indicator of focus.

### 7. User Interface Consistency
- Consistent navigation patterns and element behaviors across the app make it easier for users with cognitive disabilities.

### Specific Areas to Check:
- **Onboarding Flow:** All text, images, and interactive elements.
- **Login/Sign Up Screens:** Input fields, buttons, error messages.
- **Daily Entry Screen:** Text input, date picker, save button.
- **Past Entries Screen:** List items, navigation to detail.
- **Entry Detail Screen:** Content, edit/delete buttons.
- **Settings Screens:** Toggles, pickers, descriptive labels.
- **Streak Display & "Gratitude Blooming" Visual:** Ensure the meaning and state are conveyed accessibly.
- **Alerts and Modals:** Ensure they trap focus and are properly announced.

**Methodology:**
- Manual testing with VoiceOver and TalkBack on real devices.
- Use accessibility inspector tools provided by iOS and Android.
- Check color contrast with dedicated tools.
- Test with increased font size settings.
