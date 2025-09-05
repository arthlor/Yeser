### Internationalization (i18n) Roadmap – English Localization

This roadmap outlines how to localize the app to English while preserving Turkish. It is tailored to the current codebase structure and standards.

---

## 0) Current State Assessment

- **No global i18n provider** (e.g., i18next) is present.
- **Turkish hardcoded strings** appear across many screens/components (onboarding, gratitude, settings, error messages, notifications, etc.).
- **Calendar**: `react-native-calendars` is hard-wired to Turkish via `LocaleConfig.defaultLocale = 'tr'` and `TURKISH_LOCALIZATION`.
- **Error pipeline**: `src/utils/errorTranslation.ts` enforces Turkish user messages.
- **Notifications**: `src/services/notificationService.ts` shows Turkish `Alert` text.
- **Expo Localization** is installed; no language picker UI exists.

Implication: We need a central i18n system, extraction of strings, calendar locale switching, error/notification message routing through i18n, and a user setting to select language.

---

## 1) Foundation (Week 1)

- Add i18n stack:
  - `i18next`, `react-i18next`, and `i18next-browser-languagedetector` (RN compatible) or a simple custom loader using JSON resource files.
  - Directory: `src/i18n/` with `index.ts`, `resources/en.json`, `resources/tr.json`.
- Initialize i18n at app start in `src/providers/AppProviders.tsx` (or a dedicated `I18nProvider`).
- Wire detection to device locale via `expo-localization`, with fallback to Turkish.
- Provide a `LanguageStore` in `src/store/languageStore.ts` (Zustand) persisting user choice, overriding auto-detection.

Deliverables:

- Bootstrapped i18n runtime and provider.
- English/Turkish base resource files with initial keys.

---

## 2) Infrastructure Integration (Week 1–2)

- Calendar:
  - Replace `LocaleConfig.defaultLocale = 'tr'` with a dynamic setter bound to current language, and maintain two locale maps (TR, EN) in `src/components/calendar/utils.ts`.
- Errors:
  - Refactor `errorTranslation.ts` to return message keys + params, then map to localized strings via i18n.
- Notifications:
  - Route all `Alert` titles/messages/buttons through i18n keys.

Deliverables:

- Calendar respects language changes without remounting the app.
- Errors/notifications derive display strings from i18n.

---

## 3) String Extraction (Week 2–3)

- Sweep codebase for Turkish literals and replace with `t('key.path')` calls.
- Modules prioritized:
  1. Onboarding flow (`src/features/onboarding/...`)
  2. Gratitude feature (`src/features/gratitude/...`)
  3. Home, Throwback, Streak (`src/features/...`)
  4. Settings screens + shared UI components
  5. Global states: error, empty, loading messages
- Create structured namespaces: `common`, `auth`, `onboarding`, `gratitude`, `calendar`, `settings`, `errors`, `notifications`.

Deliverables:

- All user-facing strings moved to translation JSONs.

---

## 4) Language Switch UX (Week 3)

- Add Language selector:
  - `src/features/settings/components/LanguageSettings.tsx` with `en`/`tr` options.
  - Persist to `languageStore` and optionally sync to profile table in Supabase.
- Re-render app on language change (using i18n `changeLanguage`).

Deliverables:

- Working language switch in Settings.

---

## 5) QA & Validation (Week 3–4)

- Visual QA for truncations/overflows.
- RTL readiness check (future-proofing).
- Snapshot tests for key screens in both languages.
- Manual test calendar month/day names.
- Verify push notification alerts and toasts localized.

Deliverables:

- Verified English/Turkish parity across all flows.

---

## 6) Release & Maintenance

- Add docs for adding new keys and updating translations.
- Lint rules: forbid raw strings in UI with a custom ESLint rule or codemod checks.
- Monitoring: add a fallback logger when a missing key is used.

Deliverables:

- Documentation + guardrails to keep i18n healthy.

---

## Risks & Mitigations

- Missing keys at runtime → configure i18n to log and fail gracefully with a visible placeholder.
- Calendar locale edge-cases → unit tests for `LocaleConfig` switching.
- Performance → preload critical namespaces; memoize heavy `t()` usages.
