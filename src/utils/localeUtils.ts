import i18n from '@/i18n';

// Returns a BCP 47 language tag such as 'en-US' or 'tr-TR'
export const getCurrentLocale = (): string => {
  const lang = i18n?.language || Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  if (lang.startsWith('en')) {
    return 'en-US';
  }
  if (lang.startsWith('tr')) {
    return 'tr-TR';
  }
  return lang;
};
