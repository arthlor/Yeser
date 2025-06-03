// src/api/userDataApi.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { supabase } from '../utils/supabaseClient'; // Ensure this path is correct for your Supabase client

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
    console.log(`Invoking Supabase function: ${EXPORT_FUNCTION_NAME}`);
    const { data, error: invokeError } = await supabase.functions.invoke(EXPORT_FUNCTION_NAME, {
      // Supabase Edge Functions invoked via the client library are typically POST requests.
      // The Edge Function is set up to handle the user context from the Authorization header.
    });

    if (invokeError) {
      console.error(`Error invoking ${EXPORT_FUNCTION_NAME} function:`, invokeError.message);
      throw new Error(invokeError.message || `Failed to invoke ${EXPORT_FUNCTION_NAME} function.`);
    }

    // Check if the data object itself represents a server-side error response
    if (typeof data === 'object' && data !== null && data.error) {
      const serverError = data.error;
      console.error(`Server-side error from ${EXPORT_FUNCTION_NAME}:`, serverError);
      throw new Error(String(serverError) || 'An error occurred during data export on the server.');
    }

    // data should be the actual array of gratitude entries (already a JS object/array)
    if (data === null || data === undefined) {
      console.error('Unexpected data format from export function. Expected data, received:', data);
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

    console.log('User data successfully saved to temporary file:', fileUri);
    return {
      success: true,
      filePath: fileUri,
      filename: generatedFilename,
      message: 'Data prepared successfully.',
    };
  } catch (err: any) {
    console.error('Client-side error during data export preparation:', err);
    const errorMessage = err.message || 'An unexpected error occurred during data export.';
    return { success: false, message: errorMessage };
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
  } catch (error: any) {
    console.error('Error sharing file:', error);
    // error.message might be empty for user cancellation on iOS
    const userCancelled = Platform.OS === 'ios' && !error.message;
    if (userCancelled) {
      console.log('User cancelled sharing.');
      return { success: false, message: 'Sharing cancelled by user.' };
    }
    return { success: false, message: error.message || 'Failed to share data.' };
  }
};

/**
 * Cleans up (deletes) a temporary file.
 */
export const cleanupTemporaryFile = async (filePath: string): Promise<void> => {
  try {
    await FileSystem.deleteAsync(filePath, { idempotent: true });
    console.log('Temporary file deleted:', filePath);
  } catch (error) {
    console.error('Error deleting temporary file:', filePath, error);
  }
};
