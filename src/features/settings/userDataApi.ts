import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import i18n from '@/i18n';
import { getAuthedClient } from '@/services/session';
import type { SupportedLanguage } from '@/store/languageStore';
import { useLanguageStore } from '@/store/languageStore';
import { handleAPIError } from '@/utils/apiHelpers';
import { logger } from '@/utils/debugConfig';

const EXPORT_FUNCTION_NAME = 'export-user-data';

type ExportLanguage = SupportedLanguage;

interface CreateTemplateOptions {
  language: ExportLanguage;
  data: ExportData;
}

interface UserProfile {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  language?: string | null;
  daily_gratitude_goal?: number | null;
  created_at?: string | null;
  [key: string]: unknown;
}

interface ExportMetadata {
  total_entries?: number;
  total_statements?: number;
  active_months?: number;
  first_entry_date?: string | null;
  last_entry_date?: string | null;
  export_language?: string;
  localized_content_included?: boolean;
  language_detection_method?: string;
  language_detection_confidence?: string;
  [key: string]: unknown;
}

interface ExportGratitudeEntry {
  id?: string;
  entry_date: string;
  statements?: unknown;
  created_at?: string;
  updated_at?: string | null;
  [key: string]: unknown;
}

interface ExportData {
  language?: string;
  profile?: UserProfile;
  gratitude_entries?: ExportGratitudeEntry[];
  metadata?: ExportMetadata;
  export_date?: string;
  [key: string]: unknown;
}

const LANGUAGE_TO_LOCALE: Record<ExportLanguage, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
};

const normalizeLanguage = (value?: string | null): ExportLanguage | null => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'tr' || normalized.startsWith('tr-')) {
    return 'tr';
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (normalized === 'es' || normalized.startsWith('es-')) {
    return 'es';
  }
  return null;
};

const getTranslation = (language: ExportLanguage) => i18n.getFixedT(language);

const createDateFormatter = (language: ExportLanguage) => {
  const locale = LANGUAGE_TO_LOCALE[language];
  const formatDate = (dateString?: string | null) => {
    if (!dateString) {
      return '-';
    }
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const parsedYear = Number.parseInt(year ?? '', 10);
    const parsedMonth = Number.parseInt(month ?? '', 10);

    if (
      Number.isNaN(parsedYear) ||
      Number.isNaN(parsedMonth) ||
      parsedMonth < 1 ||
      parsedMonth > 12
    ) {
      return monthKey;
    }

    const date = new Date(parsedYear, parsedMonth - 1, 1);
    return date.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  };

  return { formatDate, formatMonthYear };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getDisplayText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const getEntryStatements = (entry: ExportGratitudeEntry): string[] => {
  if (!Array.isArray(entry.statements)) {
    return [];
  }

  return entry.statements
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const createPDFTemplate = ({ language, data }: CreateTemplateOptions): string => {
  const profile = data.profile ?? {};
  const entries = data.gratitude_entries ?? [];
  const metadata = data.metadata ?? {};

  const t = getTranslation(language);
  const { formatDate, formatMonthYear } = createDateFormatter(language);
  const emptyText = t('settings.data.pdf.profile.empty');

  const entriesByMonth = entries.reduce(
    (acc: Record<string, ExportGratitudeEntry[]>, entry: ExportGratitudeEntry) => {
      const date = new Date(entry.entry_date);
      if (Number.isNaN(date.getTime())) {
        return acc;
      }
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(entry);
      return acc;
    },
    {}
  );

  const sortedMonths = Object.keys(entriesByMonth).sort((a, b) => b.localeCompare(a));
  const totalEntries = metadata.total_entries ?? entries.length;
  const totalStatements =
    metadata.total_statements ??
    entries.reduce((total, entry) => total + getEntryStatements(entry).length, 0);
  const activeMonths = metadata.active_months ?? sortedMonths.length;

  const rangeStart = formatDate(metadata.first_entry_date ?? null);
  const rangeEnd = formatDate(metadata.last_entry_date ?? null);
  const exportDate = formatDate(data.export_date ?? new Date().toISOString());

  const profileLanguageCode = normalizeLanguage(
    typeof profile.language === 'string' ? profile.language : null
  );
  const profileLanguageLabel = profileLanguageCode
    ? t(`settings.language.${profileLanguageCode}`)
    : emptyText;

  const monthBlocks =
    sortedMonths.length === 0
      ? `
        <div class="empty-state">
          ${escapeHtml(t('settings.data.pdf.entries.empty'))}
        </div>
      `
      : sortedMonths
          .map((monthKey) => {
            const monthEntries = [...entriesByMonth[monthKey]].sort(
              (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
            );

            const monthEntriesHtml = monthEntries
              .map((entry) => {
                const statements = getEntryStatements(entry);
                const statementsHtml =
                  statements.length === 0
                    ? `<li class="statement-empty">${escapeHtml(t('settings.data.pdf.entries.emptyStatements'))}</li>`
                    : statements
                        .map(
                          (statement, index) => `
                        <li>
                          <span class="statement-index">${index + 1}.</span>
                          <span class="statement-text">${escapeHtml(statement)}</span>
                        </li>
                      `
                        )
                        .join('');

                return `
                  <article class="entry-card">
                    <div class="entry-head">
                      <span class="entry-date">${escapeHtml(formatDate(entry.entry_date))}</span>
                    </div>
                    <ul class="statements-list">
                      ${statementsHtml}
                    </ul>
                  </article>
                `;
              })
              .join('');

            return `
              <section class="month-block">
                <header class="month-header">
                  <h3>${escapeHtml(formatMonthYear(monthKey))}</h3>
                </header>
                <div class="month-content">
                  ${monthEntriesHtml}
                </div>
              </section>
            `;
          })
          .join('');

  return `
    <!DOCTYPE html>
    <html lang="${language}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(t('settings.data.exportTitle'))}</title>
        <style>
          :root {
            --ink: #1f2933;
            --muted: #4f5d75;
            --line: #d9e3ee;
            --surface: #ffffff;
            --soft: #f4f8f5;
            --accent: #2f7d46;
            --accent-soft: #e8f4eb;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 20px;
            color: var(--ink);
            background: #fff;
            font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page {
            max-width: 920px;
            margin: 0 auto;
          }

          .hero {
            padding: 24px 24px 20px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: linear-gradient(180deg, #f6fbf7 0%, #ffffff 100%);
            margin-bottom: 20px;
          }

          .brand {
            font-size: 34px;
            font-weight: 800;
            color: var(--accent);
            letter-spacing: 0.2px;
            margin: 0 0 6px;
          }

          .hero-title {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: var(--ink);
          }

          .hero-meta {
            margin: 6px 0 0;
            font-size: 13px;
            color: var(--muted);
          }

          .section {
            margin-bottom: 20px;
          }

          .section-title {
            margin: 0 0 10px;
            font-size: 16px;
            font-weight: 700;
            color: var(--ink);
          }

          .profile-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .profile-item {
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 10px 12px;
          }

          .profile-label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: var(--muted);
            margin-bottom: 5px;
          }

          .profile-value {
            font-size: 14px;
            font-weight: 600;
            color: var(--ink);
            word-break: break-word;
          }

          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 10px;
          }

          .stat-card {
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 12px;
            background: var(--surface);
          }

          .stat-value {
            display: block;
            font-size: 26px;
            line-height: 1;
            font-weight: 800;
            color: var(--accent);
            margin-bottom: 6px;
          }

          .stat-label {
            font-size: 12px;
            color: var(--muted);
            font-weight: 600;
          }

          .range {
            border-left: 4px solid var(--accent);
            background: var(--soft);
            border-radius: 8px;
            padding: 9px 12px;
            font-size: 12px;
            color: var(--ink);
          }

          .month-block {
            border: 1px solid var(--line);
            border-radius: 12px;
            margin-bottom: 14px;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .month-header {
            margin: 0;
            padding: 10px 14px;
            background: var(--accent-soft);
            border-bottom: 1px solid var(--line);
          }

          .month-header h3 {
            margin: 0;
            font-size: 15px;
            color: var(--accent);
          }

          .month-content {
            padding: 12px;
          }

          .entry-card {
            border: 1px solid #e8edf2;
            border-radius: 10px;
            padding: 10px;
            margin-bottom: 10px;
            background: #fff;
          }

          .entry-card:last-child {
            margin-bottom: 0;
          }

          .entry-head {
            margin-bottom: 8px;
          }

          .entry-date {
            display: inline-block;
            font-size: 12px;
            font-weight: 700;
            color: var(--accent);
            padding: 4px 8px;
            border-radius: 999px;
            background: var(--accent-soft);
          }

          .statements-list {
            margin: 0;
            padding: 0;
            list-style: none;
          }

          .statements-list li {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 7px 0;
            border-bottom: 1px solid #eef3f8;
          }

          .statements-list li:last-child {
            border-bottom: 0;
          }

          .statement-index {
            flex: 0 0 auto;
            color: var(--muted);
            font-size: 12px;
            font-weight: 700;
            width: 18px;
          }

          .statement-text {
            flex: 1;
            color: var(--ink);
            font-size: 13px;
          }

          .statement-empty {
            color: var(--muted);
            font-style: italic;
          }

          .empty-state {
            border: 1px dashed var(--line);
            border-radius: 10px;
            padding: 18px 14px;
            text-align: center;
            font-size: 13px;
            color: var(--muted);
            background: #fafcfd;
          }

          .footer {
            margin-top: 22px;
            padding-top: 12px;
            border-top: 1px solid var(--line);
            font-size: 12px;
            color: var(--muted);
          }

          .footer p {
            margin: 4px 0;
          }

          @media print {
            body {
              padding: 0;
            }

            .section,
            .hero,
            .month-block {
              break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <header class="hero">
            <p class="brand">Yeşer</p>
            <p class="hero-title">${escapeHtml(t('settings.data.pdf.headerTitle'))}</p>
            <p class="hero-meta">${escapeHtml(
              t('settings.data.pdf.exportedAt', { date: exportDate })
            )}</p>
          </header>

          <section class="section">
            <h2 class="section-title">${escapeHtml(t('settings.data.pdf.profile.title'))}</h2>
            <div class="profile-grid">
              <article class="profile-item">
                <span class="profile-label">${escapeHtml(t('settings.data.pdf.profile.name'))}</span>
                <span class="profile-value">${escapeHtml(
                  getDisplayText(profile.full_name, emptyText)
                )}</span>
              </article>
              <article class="profile-item">
                <span class="profile-label">${escapeHtml(
                  t('settings.data.pdf.profile.email')
                )}</span>
                <span class="profile-value">${escapeHtml(
                  getDisplayText(profile.email, emptyText)
                )}</span>
              </article>
              <article class="profile-item">
                <span class="profile-label">${escapeHtml(
                  t('settings.data.pdf.profile.username')
                )}</span>
                <span class="profile-value">${escapeHtml(
                  getDisplayText(profile.username, emptyText)
                )}</span>
              </article>
              <article class="profile-item">
                <span class="profile-label">${escapeHtml(
                  t('settings.data.pdf.profile.language')
                )}</span>
                <span class="profile-value">${escapeHtml(profileLanguageLabel)}</span>
              </article>
            </div>
          </section>

          <section class="section">
            <h2 class="section-title">${escapeHtml(t('settings.data.pdf.stats.title'))}</h2>
            <div class="stats-grid">
              <article class="stat-card">
                <span class="stat-value">${totalEntries}</span>
                <span class="stat-label">${escapeHtml(
                  t('settings.data.pdf.stats.totalEntries')
                )}</span>
              </article>
              <article class="stat-card">
                <span class="stat-value">${totalStatements}</span>
                <span class="stat-label">${escapeHtml(
                  t('settings.data.pdf.stats.totalStatements')
                )}</span>
              </article>
              <article class="stat-card">
                <span class="stat-value">${activeMonths}</span>
                <span class="stat-label">${escapeHtml(
                  t('settings.data.pdf.stats.activeMonths')
                )}</span>
              </article>
            </div>
            <div class="range">${escapeHtml(
              t('settings.data.pdf.stats.dateRange', { from: rangeStart, to: rangeEnd })
            )}</div>
          </section>

          <section class="section">
            <h2 class="section-title">${escapeHtml(t('settings.data.pdf.entries.title'))}</h2>
            ${monthBlocks}
          </section>

          <footer class="footer">
            <p><strong>Yeşer</strong> - ${escapeHtml(t('settings.data.pdf.footer.app'))}</p>
            <p>${escapeHtml(t('settings.data.pdf.footer.exportedOn', { date: exportDate }))}</p>
            <p>${escapeHtml(
              t('settings.data.pdf.footer.summary', {
                entries: totalEntries,
                statements: totalStatements,
              })
            )}</p>
          </footer>
        </main>
      </body>
    </html>
  `;
};

const resolveExportLanguage = (requestedLanguage?: string | null): ExportLanguage => {
  const fromRequested = normalizeLanguage(requestedLanguage);
  if (fromRequested) {
    return fromRequested;
  }

  const stateLanguage = normalizeLanguage(useLanguageStore.getState().language);
  if (stateLanguage) {
    return stateLanguage;
  }

  const i18nLanguage = normalizeLanguage(i18n.language);
  if (i18nLanguage) {
    return i18nLanguage;
  }

  return 'tr';
};

const toAcceptLanguageHeader = (language: ExportLanguage): string => {
  if (language === 'en') {
    return 'en-US,en;q=0.9';
  }
  if (language === 'es') {
    return 'es-ES,es;q=0.9';
  }
  return 'tr-TR,tr;q=0.9';
};

export const prepareUserExportFile = async (): Promise<{
  success: boolean;
  filePath?: string;
  filename?: string;
  message?: string;
}> => {
  try {
    logger.debug(`Invoking Supabase function: ${EXPORT_FUNCTION_NAME}`);

    const exportLanguage = resolveExportLanguage(i18n.language);
    const { client } = await getAuthedClient();
    const { data, error: invokeError } = await client.functions.invoke(EXPORT_FUNCTION_NAME, {
      headers: {
        'X-User-Language': exportLanguage,
        'Accept-Language': toAcceptLanguageHeader(exportLanguage),
      },
      body: { language: exportLanguage },
    });

    if (invokeError) {
      const errorToHandle =
        invokeError instanceof Error ? invokeError : new Error(String(invokeError.message));
      throw handleAPIError(errorToHandle, `invoke ${EXPORT_FUNCTION_NAME}`);
    }

    if (typeof data === 'object' && data !== null && data.error) {
      const serverError = data.error;
      logger.error('Server-side error from export function', { extra: { serverError } });
      throw new Error(String(serverError) || 'An error occurred during data export on the server.');
    }

    if (data === null || data === undefined) {
      logger.error('Unexpected data format from export function. Expected data, received:', {
        extra: { data },
      });
      throw new Error('No data received from export function or unexpected format.');
    }

    const detectedLanguage = normalizeLanguage(
      typeof data.language === 'string' ? data.language : null
    );
    if (detectedLanguage && detectedLanguage !== exportLanguage) {
      logger.warn('Export language mismatch between request and server response', {
        requestedLanguage: exportLanguage,
        serverLanguage: detectedLanguage,
      });
    }

    logger.debug('Received data from export function:', {
      hasProfile: !!data.profile,
      hasEntries: !!data.gratitude_entries,
      hasMetadata: !!data.metadata,
      entriesCount: data.gratitude_entries?.length || 0,
      profileKeys: data.profile ? Object.keys(data.profile) : [],
      metadataKeys: data.metadata ? Object.keys(data.metadata) : [],
    });

    const htmlContent = createPDFTemplate({ language: exportLanguage, data: data as ExportData });

    const { uri: pdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      margins: {
        left: 20,
        top: 20,
        right: 20,
        bottom: 20,
      },
    });

    const filenameDate = new Date().toISOString().split('T')[0];
    const generatedFilename = `yeser_export_${filenameDate}.pdf`;

    const directory = FileSystem.cacheDirectory + 'exports/';
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const finalFileUri = directory + generatedFilename;

    await FileSystem.moveAsync({
      from: pdfUri,
      to: finalFileUri,
    });

    logger.debug('User data successfully saved to PDF file:', { finalFileUri });
    return {
      success: true,
      filePath: finalFileUri,
      filename: generatedFilename,
      message: 'PDF prepared successfully.',
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'prepare user export PDF file');
  }
};

export const shareExportedFile = async (
  fileUri: string,
  filename: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { success: false, message: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: `${i18n.t('settings.data.export')}: ${filename}`,
      UTI: Platform.OS === 'ios' ? 'com.adobe.pdf' : undefined,
    });
    return { success: true, message: 'PDF shared successfully.' };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const isUserCancellation =
      err.message.includes('cancelled') ||
      (Platform.OS === 'ios' && err.message.includes('Sharing has been cancelled'));

    if (isUserCancellation) {
      logger.debug('User cancelled sharing.');
      return { success: false, message: 'Sharing cancelled by user.' };
    }
    throw handleAPIError(err, 'share exported PDF file');
  }
};

export const cleanupTemporaryFile = async (filePath: string): Promise<void> => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      logger.debug('Invalid file path provided for cleanup:', { filePath });
      return;
    }

    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      logger.debug('File does not exist, no cleanup needed:', { filePath });
      return;
    }

    await FileSystem.deleteAsync(filePath, { idempotent: true });
    logger.debug('Temporary file successfully deleted:', { filePath });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Failed to cleanup temporary file (non-critical):', {
      filePath,
      error: error.message,
      extra: { error },
    });
  }
};
