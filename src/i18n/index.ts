import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './resources/en.json';
import tr from './resources/tr.json';

const deviceLanguage = (Localization.getLocales?.()[0]?.languageCode || 'tr').toLowerCase();

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: { en: { translation: en }, tr: { translation: tr } },
    lng: deviceLanguage === 'en' ? 'en' : 'tr',
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  .catch(() => {
    // noop; initialization errors are not fatal
  });

export default i18n;
