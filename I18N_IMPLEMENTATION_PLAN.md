### i18n Implementation Plan – English Localization

A step-by-step plan to add English alongside Turkish using `i18next` and `react-i18next`, integrated with Expo.

---

## 1) Dependencies & Project Structure

Install:

```bash
npm i i18next react-i18next
```

Create structure:

- `src/i18n/index.ts`
- `src/i18n/resources/en.json`
- `src/i18n/resources/tr.json`

Notes:

- We already have `expo-localization`; use it to detect device locale initially.
- Keep namespaces by feature for maintainability.

---

## 2) Initialize i18n

`src/i18n/index.ts` (pseudo):

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './resources/en.json';
import tr from './resources/tr.json';

const device = (Localization.getLocales?.()[0]?.languageCode || 'tr').toLowerCase();

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: { en: { translation: en }, tr: { translation: tr } },
  lng: device === 'en' ? 'en' : 'tr',
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
```

Wire into app entry:

- Import `src/i18n` in `src/App.tsx` or `src/providers/AppProviders.tsx` before rendering providers.

---

## 3) Language Store (Zustand)

`src/store/languageStore.ts`:

- State: `language: 'tr' | 'en'` + `setLanguage`.
- Persist with `persist` middleware.
- On `setLanguage`, call `i18n.changeLanguage(lang)`.

App boot:

- On hydration, if store has language, apply it to i18n immediately.

---

## 4) Calendar Localization

- Move current `TURKISH_LOCALIZATION` to `CALENDAR_TR` and add `CALENDAR_EN` in `src/components/calendar/utils.ts`.
- Replace `LocaleConfig.defaultLocale = 'tr'` with a reactive effect in `CalendarView` or a calendar setup module:
  - On language change, set `LocaleConfig.locales.en` and `LocaleConfig.locales.tr`, then set `LocaleConfig.defaultLocale` to the current language.
  - Ensure month/day arrays match library format.

---

## 5) Error Translation Pipeline

- Update `src/utils/errorTranslation.ts` to output keys + params instead of hardcoded Turkish.
  - Example: return `{ key: 'errors.auth.sessionExpired' }` then map via `t(key)` where displayed.
- Alternatively, keep the same function signature but call `t()` inside the helper, using keys for each branch.
- Add keys to `errors.*` in JSON resources.

---

## 6) Notifications & Alerts

- In `src/services/notificationService.ts`, route all `Alert` text via `t()` keys:
  - Titles, messages, and button labels.
- Add a small helper for alerts to centralize.

---

## 7) String Extraction Sweep

Process:

1. Search for Turkish characters and literals, replace with `t('namespace.key')`.
2. Use feature namespaces: `onboarding`, `gratitude`, `home`, `settings`, `calendar`, `errors`, `notifications`, `common`.
3. Keep placeholders and interpolation tokens in JSON (e.g., `"welcome": "Welcome, {{name}}"`).

Priority order:

1. Onboarding screens; 2) Gratitude screens; 3) Home/Streak/Throwback; 4) Settings; 5) Shared UI.

---

## 8) Settings: Language Selector

- Create `src/features/settings/components/LanguageSettings.tsx` with radio or picker for TR/EN.
- Persist to `languageStore`; optionally sync to Supabase profile.
- Call `i18n.changeLanguage(lang)` and re-render.

---

## 9) Testing & QA Checklist

- Verify all screens in TR and EN; no hardcoded leftovers.
- Unit tests for `errorTranslation` keys mapping.
- Calendar renders EN month/day names when English selected.
- Notifications show localized text.
- Snapshots for critical screens.

---

## 10) Developer Guide

- Add a short guide: use `useTranslation()` and `t('...')`, never hardcode user-facing text.
- Namespacing conventions and file locations for resources.
- How to add a key: update both `tr.json` and `en.json`.

---

## 11) Incremental PR Plan

1. Add i18n foundation (deps, provider, store, base `en.json`/`tr.json`).
2. Calendar dynamic locale.
3. Error translation keys + notifications.
4. Onboarding strings.
5. Gratitude/Home/Throwback/Streak.
6. Settings + Language picker.
7. QA fixes and missing keys.

Each PR should include resource updates, code changes, and a short test list.
