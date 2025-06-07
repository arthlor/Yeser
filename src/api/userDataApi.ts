// src/api/userDataApi.ts
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { supabase } from '../utils/supabaseClient'; // Ensure this path is correct for your Supabase client
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';

const EXPORT_FUNCTION_NAME = 'export-user-data';

/**
 * Creates an HTML template for the PDF export
 */
const createPDFTemplate = (data: any): string => {
  const profile = data.profile || {};
  const entries = data.gratitude_entries || [];
  const metadata = data.metadata || {};

  // Group entries by month for better organization
  const entriesByMonth = entries.reduce((acc: any, entry: any) => {
    const date = new Date(entry.entry_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(entry);
    return acc;
  }, {});

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });
  };

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Yeşer - Minnet Günlüğü Verilerim</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
          background-color: #fff;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #4CAF50;
          padding-bottom: 20px;
        }
        
        .header h1 {
          color: #4CAF50;
          font-size: 2.5em;
          margin: 0;
          font-weight: 700;
        }
        
        .header p {
          color: #666;
          font-size: 1.1em;
          margin: 10px 0;
        }
        
        .profile-section {
          background-color: #f8f9fa;
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 30px;
          border-left: 5px solid #4CAF50;
        }
        
        .profile-section h2 {
          color: #4CAF50;
          margin-top: 0;
          font-size: 1.5em;
        }
        
        .profile-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }
        
        .profile-item {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        
        .profile-item label {
          font-weight: 600;
          color: #555;
          display: block;
          margin-bottom: 5px;
        }
        
        .profile-item span {
          color: #333;
          font-size: 1.1em;
        }
        
        .stats-section {
          background: linear-gradient(135deg, #4CAF50, #45a049);
          color: white;
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .stat-item {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }
        
        .stat-number {
          font-size: 2em;
          font-weight: bold;
          display: block;
        }
        
        .stat-label {
          font-size: 0.9em;
          opacity: 0.9;
          margin-top: 5px;
        }
        
        .entries-section {
          margin-bottom: 30px;
        }
        
        .month-group {
          margin-bottom: 40px;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
        }
        
        .month-header {
          background: #f5f5f5;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }
        
        .month-header h3 {
          margin: 0;
          color: #4CAF50;
          font-size: 1.3em;
        }
        
        .entry {
          padding: 20px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .entry:last-child {
          border-bottom: none;
        }
        
        .entry-date {
          font-weight: 600;
          color: #4CAF50;
          margin-bottom: 15px;
          font-size: 1.1em;
        }
        
        .statements-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .statements-list li {
          background: #f8f9fa;
          margin: 8px 0;
          padding: 12px 15px;
          border-radius: 6px;
          border-left: 3px solid #4CAF50;
          position: relative;
        }
        
        .statements-list li:before {
          content: "🙏";
          margin-right: 10px;
        }
        
        .footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          color: #666;
        }
        
        .footer p {
          margin: 5px 0;
          font-size: 0.9em;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 15px;
          }
          
          .month-group {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌿 Yeşer</h1>
        <p>Minnet Günlüğü Verilerim</p>
        <p>Dışa aktarılma tarihi: ${formatDate(data.export_date || new Date().toISOString())}</p>
      </div>

      <div class="profile-section">
        <h2>👤 Profil Bilgileri</h2>
        <div class="profile-info">
          <div class="profile-item">
            <label>İsim:</label>
            <span>${profile.full_name || 'Belirtilmemiş'}</span>
          </div>
          <div class="profile-item">
            <label>E-posta:</label>
            <span>${profile.email || 'Belirtilmemiş'}</span>
          </div>
          <div class="profile-item">
            <label>Günlük Hedef:</label>
            <span>${profile.daily_gratitude_goal || 3} minnet</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <h2>📊 İstatistikler</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-number">${metadata.total_entries || 0}</span>
            <div class="stat-label">Toplam Giriş</div>
          </div>
          <div class="stat-item">
            <span class="stat-number">${metadata.total_statements || entries.reduce((total: number, entry: any) => total + (entry.statements?.length || 0), 0)}</span>
            <div class="stat-label">Toplam Minnet</div>
          </div>
          <div class="stat-item">
            <span class="stat-number">${metadata.active_months || Object.keys(entriesByMonth).length}</span>
            <div class="stat-label">Aktif Ay</div>
          </div>
        </div>
      </div>

      <div class="entries-section">
        <h2>📝 Minnet Girişlerim</h2>
        
        ${Object.keys(entriesByMonth)
          .sort((a, b) => b.localeCompare(a)) // Most recent first
          .map(
            (monthKey) => `
            <div class="month-group">
              <div class="month-header">
                <h3>${formatMonthYear(monthKey)}</h3>
              </div>
              ${entriesByMonth[monthKey]
                .sort(
                  (a: any, b: any) =>
                    new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
                )
                .map(
                  (entry: any) => `
                  <div class="entry">
                    <div class="entry-date">${formatDate(entry.entry_date)}</div>
                    <ul class="statements-list">
                      ${(entry.statements || [])
                        .map(
                          (statement: string) => `
                        <li>${statement}</li>
                      `
                        )
                        .join('')}
                    </ul>
                  </div>
                `
                )
                .join('')}
            </div>
          `
          )
          .join('')}
      </div>

      <div class="footer">
        <p><strong>Yeşer</strong> - Minnet Günlüğü Uygulaması</p>
        <p>Bu veriler ${formatDate(data.export_date || new Date().toISOString())} tarihinde dışa aktarılmıştır.</p>
        <p>Toplam ${metadata.total_entries || 0} giriş ve ${metadata.total_statements || entries.reduce((total: number, entry: any) => total + (entry.statements?.length || 0), 0)} minnet içermektedir.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Invokes the Supabase Edge Function to get user data and generates a PDF file.
 * Returns the URI of the temporary PDF file and the generated filename.
 */
export const prepareUserExportFile = async (): Promise<{
  success: boolean;
  filePath?: string;
  filename?: string;
  message?: string;
}> => {
  try {
    logger.debug(`Invoking Supabase function: ${EXPORT_FUNCTION_NAME}`);
    const { data, error: invokeError } = await supabase.functions.invoke(EXPORT_FUNCTION_NAME, {});

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

    // Debug: Log the received data structure
    logger.debug('Received data from export function:', {
      hasProfile: !!data.profile,
      hasEntries: !!data.gratitude_entries,
      hasMetadata: !!data.metadata,
      entriesCount: data.gratitude_entries?.length || 0,
      profileKeys: data.profile ? Object.keys(data.profile) : [],
      metadataKeys: data.metadata ? Object.keys(data.metadata) : [],
    });

    // Create HTML template for PDF
    const htmlContent = createPDFTemplate(data);

    // Generate PDF from HTML
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

    // Use cacheDirectory for temporary files
    const directory = FileSystem.cacheDirectory + 'exports/';
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const finalFileUri = directory + generatedFilename;

    // Move the generated PDF to our exports directory
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

/**
 * Shares the exported PDF file using the expo-sharing API.
 */
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
      dialogTitle: `Paylaş: ${filename}`,
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

/**
 * Cleans up (deletes) a temporary file.
 */
export const cleanupTemporaryFile = async (filePath: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    logger.debug('Temporary file deleted:', { filePath });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'delete temporary file');
  }
};
