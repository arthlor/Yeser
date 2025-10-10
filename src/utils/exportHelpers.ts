import { useCallback, useState } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { supabase } from '@/utils/supabaseClient';
import { logger } from '@/utils/debugConfig';
import i18n from '@/i18n';

/**
 * Exports user data with proper localization support.
 * Sends the user's language preference to ensure localized content.
 *
 * @returns Promise<ExportData> The export data with localized content
 * @throws {Error} When export fails or user is not authenticated
 */
interface ExportData {
  export_date: string;
  user_id: string;
  language: 'tr' | 'en';
  profile: {
    full_name: string | null;
    email: string | null;
    username: string | null;
    daily_gratitude_goal: number;
    reminder_enabled: boolean;
    throwback_reminder_enabled: boolean;
    use_varied_prompts: boolean;
    created_at: string | null;
    updated_at: string | null;
  };
  gratitude_entries: Array<{
    id: string;
    entry_date: string;
    statements: unknown[];
    created_at: string;
    updated_at: string;
  }>;
  reference_data: {
    gratitude_benefits: unknown[];
    daily_prompts_sample: unknown[];
  };
  metadata: {
    total_entries: number;
    total_statements: number;
    active_months: number;
    first_entry_date: string | null;
    last_entry_date: string | null;
    export_language: string;
    localized_content_included: boolean;
    language_detection_method?: string;
  };
}

export const exportUserDataWithLocalization = async (): Promise<ExportData> => {
  try {
    // Get current user's language preference
    const language = useLanguageStore.getState().language;
    logger.debug('Exporting user data with language:', { language });

    // Get current session for auth token
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error(
        i18n.isInitialized ? i18n.t('errors.auth.noActiveSession') : 'No active session found'
      );
    }

    // Prepare the request with language information
    const requestBody = {
      language: language,
      timestamp: new Date().toISOString(),
    };

    // Call the edge function with proper headers and body
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/export-user-data`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'X-User-Language': language, // Primary language source
          'Accept-Language': language === 'en' ? 'en-US,en;q=0.9' : 'tr-TR,tr;q=0.9', // Fallback
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({
          error: i18n.isInitialized ? i18n.t('errors.export.unknownError') : 'Unknown error',
        }));
      throw new Error(
        errorData.error ||
          `HTTP ${response.status}: ${i18n.isInitialized ? i18n.t('errors.export.exportFailed') : 'Export failed'}`
      );
    }

    const exportData = await response.json();

    // Verify that we got the expected language
    if (exportData.language !== language) {
      logger.warn('Language mismatch in export data:', {
        expected: language,
        received: exportData.language,
      });
    }

    logger.debug('Export completed successfully:', {
      language: exportData.language,
      entries: exportData.gratitude_entries?.length || 0,
      benefits: exportData.reference_data?.gratitude_benefits?.length || 0,
      prompts: exportData.reference_data?.daily_prompts_sample?.length || 0,
    });

    return exportData;
  } catch (error) {
    logger.error('Failed to export user data:', { error });
    throw error;
  }
};

/**
 * Generates a localized filename for export data.
 *
 * @param language - The language for localization
 * @param customFilename - Optional custom filename
 * @returns Localized filename string
 */
export const generateLocalizedFilename = (
  language: 'tr' | 'en',
  customFilename?: string
): string => {
  if (customFilename) {
    return customFilename;
  }

  const date = new Date().toISOString().split('T')[0];
  const t = i18n.getFixedT(language);
  return t('settings.data.exportFilename', { date });
};

/**
 * React hook for exporting user data with proper state management.
 *
 * @returns Object with export function and loading state
 */
export const useUserDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const data = await exportUserDataWithLocalization();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : i18n.isInitialized
            ? i18n.t('errors.export.exportFailed')
            : 'Export failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, []);

  const getLocalizedFilename = useCallback((customFilename?: string) => {
    const language = useLanguageStore.getState().language;
    return generateLocalizedFilename(language, customFilename);
  }, []);

  return {
    exportData,
    getLocalizedFilename,
    isExporting,
    error,
    clearError: () => setError(null),
  };
};
