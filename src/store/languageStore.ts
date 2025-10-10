import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';

export type SupportedLanguage = 'tr' | 'en';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: (i18n.language as SupportedLanguage) === 'en' ? 'en' : 'tr',
      setLanguage: (lang: SupportedLanguage) => {
        if (get().language === lang) {
          return;
        }
        i18n.changeLanguage(lang).catch(() => {});
        set({ language: lang });
      },
    }),
    {
      name: 'language-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
      version: 1,
      onRehydrateStorage: () => (state) => {
        const lang = state?.language ?? 'tr';
        i18n.changeLanguage(lang).catch(() => {});
      },
    }
  )
);
