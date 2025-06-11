import { Linking, Platform } from 'react-native';
import { logger } from './debugConfig';

/**
 * Device utility functions for cross-platform operations
 */

/**
 * Opens the device's notification settings
 * iOS: Opens app-specific settings
 * Android: Opens general notification settings
 */
export const openNotificationSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    logger.error('Failed to open notification settings:', error as Error);
    throw new Error('Ayarlar açılırken bir hata oluştu');
  }
};

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