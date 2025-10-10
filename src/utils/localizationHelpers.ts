import type { SupportedLanguage } from '@/store/languageStore';
import type { GratitudeBenefit, LocalizedGratitudeBenefit } from '@/schemas/gratitudeBenefitSchema';
import type { DailyPrompt, LocalizedDailyPrompt } from '@/schemas/gratitudeEntrySchema';

/**
 * Transforms a GratitudeBenefit with all language columns to a localized version
 * with only the selected language content.
 *
 * @param benefit - The raw benefit with all language columns
 * @param language - The target language ('tr' | 'en')
 * @returns Localized benefit with selected language content
 */
export const localizeGratitudeBenefit = (
  benefit: GratitudeBenefit,
  language: SupportedLanguage
): LocalizedGratitudeBenefit => {
  const isEnglish = language === 'en';

  return {
    id: benefit.id,
    icon: benefit.icon,
    title: isEnglish && benefit.title_en ? benefit.title_en : benefit.title_tr,
    description:
      isEnglish && benefit.description_en ? benefit.description_en : benefit.description_tr,
    stat: isEnglish && benefit.stat_en ? benefit.stat_en : benefit.stat_tr,
    cta_prompt: isEnglish && benefit.cta_prompt_en ? benefit.cta_prompt_en : benefit.cta_prompt_tr,
    display_order: benefit.display_order,
    is_active: benefit.is_active,
    created_at: benefit.created_at,
    updated_at: benefit.updated_at,
  };
};

/**
 * Transforms a DailyPrompt with all language columns to a localized version
 * with only the selected language content.
 *
 * @param prompt - The raw prompt with all language columns
 * @param language - The target language ('tr' | 'en')
 * @returns Localized prompt with selected language content
 */
export const localizeDailyPrompt = (
  prompt: DailyPrompt,
  language: SupportedLanguage
): LocalizedDailyPrompt => {
  const isEnglish = language === 'en';

  // More robust language selection with better fallback logic
  let promptText: string;

  if (isEnglish) {
    // For English: use English text if available and not empty, otherwise fallback to Turkish
    promptText =
      prompt.prompt_text_en && prompt.prompt_text_en.trim().length > 0
        ? prompt.prompt_text_en
        : prompt.prompt_text_tr;
  } else {
    // For Turkish: use Turkish text (should always be available)
    promptText = prompt.prompt_text_tr;
  }

  return {
    id: prompt.id,
    prompt_text: promptText,
    category: prompt.category,
  };
};

/**
 * Gets user's language preference from various sources.
 * Used in edge functions and API calls where Zustand store is not available.
 *
 * @param userLocale - User's locale preference (optional)
 * @param acceptLanguage - HTTP Accept-Language header (optional)
 * @returns SupportedLanguage with fallback to Turkish
 */
export const getUserLanguagePreference = (
  userLocale?: string | null,
  acceptLanguage?: string | null
): SupportedLanguage => {
  // Priority 1: Explicit user locale preference
  if (userLocale === 'en') {
    return 'en';
  }
  if (userLocale === 'tr') {
    return 'tr';
  }

  // Priority 2: Accept-Language header
  if (acceptLanguage) {
    const normalizedHeader = acceptLanguage.toLowerCase();
    if (normalizedHeader.includes('en')) {
      return 'en';
    }
    if (normalizedHeader.includes('tr')) {
      return 'tr';
    }
  }

  // Fallback: Turkish (default)
  return 'tr';
};

/**
 * Helper to extract language preference from HTTP request headers.
 * Specifically designed for edge functions.
 *
 * @param req - HTTP Request object
 * @returns SupportedLanguage
 */
export const getLanguageFromRequest = (req: {
  headers: { get: (name: string) => string | null };
}): SupportedLanguage => {
  const acceptLanguage = req.headers.get('Accept-Language');
  return getUserLanguagePreference(null, acceptLanguage);
};
