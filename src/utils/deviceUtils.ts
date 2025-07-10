import { Linking, Platform } from 'react-native';
import { logger } from './debugConfig';

/**
 * Device utility functions for cross-platform operations
 */

/**
 * Checks if the device can open settings
 */
export const canOpenSettings = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      return await Linking.canOpenURL('app-settings:');
    } else {
      return true; // Android always supports opening settings
    }
  } catch (error) {
    logger.error('Failed to check settings availability:', error as Error);
    return false;
  }
};
