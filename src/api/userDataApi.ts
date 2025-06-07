// src/api/userDataApi.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { supabase } from '../utils/supabaseClient'; // Ensure this path is correct for your Supabase client
import { logger } from '@/utils/debugConfig';
import { handleAPIError } from '@/utils/apiHelpers';

const EXPORT_FUNCTION_NAME = 'export-user-data';

/**
 * Invokes the Supabase Edge Function to get user data as a JSON string.
 * Saves this data to a temporary file.
 * Returns the URI of the temporary file and the generated filename.
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
      // Ensure invokeError is an instance of Error before passing
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

    const jsonDataString = JSON.stringify(data, null, 2); // Convert the JS object/array to a JSON string
    const filenameDate = new Date().toISOString().split('T')[0];
    const generatedFilename = `yeser_export_${filenameDate}.json`;

    // Use cacheDirectory for temporary files.
    // Ensure the directory exists (though cacheDirectory usually does).
    const directory = FileSystem.cacheDirectory + 'exports/';
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const fileUri = directory + generatedFilename;

    await FileSystem.writeAsStringAsync(fileUri, jsonDataString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.debug('User data successfully saved to temporary file:', { fileUri });
    return {
      success: true,
      filePath: fileUri,
      filename: generatedFilename,
      message: 'Data prepared successfully.',
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw handleAPIError(error, 'prepare user export file');
  }
};

/**
 * Shares the exported data file using the expo-sharing API.
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
      mimeType: 'application/json',
      dialogTitle: `Paylaş: ${filename}`, // Share: filename
      UTI: Platform.OS === 'ios' ? 'public.json' : undefined, // UTI for iOS, Android infers from mimeType
    });
    return { success: true, message: 'Data shared successfully.' };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    // The user cancellation is a specific flow, not a generic error.
    // It should be handled before passing to the generic error handler.
    const isUserCancellation =
      err.message.includes('cancelled') || // Android
      (Platform.OS === 'ios' && err.message.includes('Sharing has been cancelled')); // iOS

    if (isUserCancellation) {
      logger.debug('User cancelled sharing.');
      return { success: false, message: 'Sharing cancelled by user.' };
    }
    throw handleAPIError(err, 'share exported file');
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
