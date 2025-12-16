import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { revenueCatService } from '@/services/revenueCatService';

export type SupportedLanguage = 'tr' | 'en' | 'es';

export interface LanguageStoreState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

export const useLanguageStore = create<LanguageStoreState>()(
  persist(
    (set, get) => ({
      language: (['en', 'es', 'tr'].includes(i18n.language)
        ? i18n.language
        : 'tr') as SupportedLanguage,
      setLanguage: (lang: SupportedLanguage) => {
        if (get().language === lang) {
          return;
        }
        i18n.changeLanguage(lang).catch(() => {});
        revenueCatService.setPaywallLocale(lang);
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
        revenueCatService.setPaywallLocale(lang);
      },
    }
  )
);
