# Turkish UI & Localization Testing

**Focus:** Ensure all UI text is correctly translated to Turkish, special characters are handled, layouts are not broken, and the app functions correctly when the device language is set to Turkish.

**Scope (Based on Phases 0-2 Features):**

### 1. Textual Content Verification
- **All Screens:** Systematically go through every screen and UI element (buttons, labels, placeholders, titles, messages, alerts).
  - Verify all static text is in Turkish.
  - Check for any untranslated English strings.
  - Ensure grammatical correctness and natural phrasing in Turkish.
- **Dynamic Content:**
  - Date formats (e.g., on Past Entries, Daily Entry date picker): Ensure they use Turkish month names, day names, and conventional Turkish date formats.
  - Streak counter messages: "Günlük Seri" and any related phrases.
  - Confirmation messages (e.g., after saving an entry).
  - Error messages: Ensure they are clear and in Turkish.

### 2. Special Character Handling
- Verify correct rendering of all Turkish special characters: `ğ`, `ü`, `ş`, `ı`, `ö`, `ç`, `İ`, `Ğ`, `Ü`, `Ş`, `Ö`, `Ç`.
- Check in input fields (e.g., gratitude entry text) and displayed text.
- Ensure no encoding issues (e.g., mojibake).

### 3. UI Layout & Text Overflow
- **General Layout:**
  - Check for text overflow or truncation issues, especially with longer Turkish words/phrases compared to potential English source text.
  - Ensure buttons, labels, and other text elements expand or wrap correctly without breaking the UI.
  - Verify alignment and spacing are maintained.
- **Specific Components:**
  - Buttons with text.
  - Titles and headings.
  - Multi-line text displays (e.g., entry details, privacy policy).

### 4. Device Language Setting
- **Test with Device Language:**
  - Set the test device's primary language to Turkish.
  - Launch and use the app extensively.
  - Verify that all app-provided text defaults to Turkish.
  - Check if any system-level UI elements (e.g., standard alerts, permission dialogs if not customized) appear in Turkish as expected.

### 5. Input Methods
- **Turkish Keyboard:**
  - Ensure text input fields work correctly with a Turkish software keyboard.
  - Test inputting all special Turkish characters.

### 6. Dates & Numbers
- **Date Pickers:** Confirm localization (month names, day names).
- **Displayed Dates/Times:** Ensure they follow Turkish conventions.
- **Numbers:** (e.g., streak count) - usually not an issue unless specific formatting is applied.

**Methodology:**
- Primarily manual testing, involving a native or fluent Turkish speaker.
- Use a checklist of all screens and text elements.
- Test on various device sizes to catch layout issues.
