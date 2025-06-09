// 🚨 FIX: Re-enabled Firebase Analytics for production deployment
import analytics from '@react-native-firebase/analytics';
import { logger } from '@/utils/debugConfig';

/**
 * Logs a screen view event to Firebase Analytics.
 * Screen names should be clear and descriptive.
 * @param screenName The name of the screen to track.
 */
const logScreenView = async (screenName: string): Promise<void> => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
    
    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug(`Analytics: Screen view logged - ${screenName}`);
    }
  } catch (error) {
    logger.error('Failed to log screen view to Firebase Analytics', error as Error);
  }
};

/**
 * Logs a custom event to Firebase Analytics.
 * @param eventName The name of the event (e.g., 'button_click', 'item_shared').
 * @param params Optional parameters associated with the event.
 */
const logEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean | null>
): Promise<void> => {
  try {
    // Firebase Analytics parameter validation and conversion
    const sanitizedParams: Record<string, string | number | boolean> = {};
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Firebase Analytics doesn't accept null values, so filter them out
        if (value !== null) {
          sanitizedParams[key] = value;
        }
      });
    }

    await analytics().logEvent(eventName, sanitizedParams);
    
    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug(`Analytics: Event logged - ${eventName}`, sanitizedParams);
    }
  } catch (error) {
    logger.error(`Failed to log event '${eventName}' to Firebase Analytics`, error as Error);
  }
};

/**
 * Logs an 'app_open' event.
 * This can be called when the application is first initialized.
 */
const logAppOpen = async (): Promise<void> => {
  try {
    await analytics().logAppOpen();
    
    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: App open event logged');
    }
  } catch (error) {
    logger.error('Failed to log app_open event to Firebase Analytics', error as Error);
  }
};

/**
 * Sets user properties for Firebase Analytics.
 * This helps with user segmentation and understanding user behavior.
 * @param properties User properties to set
 */
const setUserProperties = async (properties: Record<string, string | null>): Promise<void> => {
  try {
    await analytics().setUserProperties(properties);
    
    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: User properties set', properties);
    }
  } catch (error) {
    logger.error('Failed to set user properties in Firebase Analytics', error as Error);
  }
};

/**
 * Sets the user ID for Firebase Analytics.
 * This should be called when user authentication state changes.
 * @param userId The user's unique identifier (or null to clear)
 */
const setUserId = async (userId: string | null): Promise<void> => {
  try {
    await analytics().setUserId(userId);
    
    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: User ID set', { userId: userId ? 'set' : 'cleared' });
    }
  } catch (error) {
    logger.error('Failed to set user ID in Firebase Analytics', error as Error);
  }
};

/**
 * Enables or disables analytics collection.
 * Useful for handling user privacy preferences.
 * @param enabled Whether to enable analytics collection
 */
const setAnalyticsCollectionEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await analytics().setAnalyticsCollectionEnabled(enabled);
    
    // Log to console in development for debugging
    if (__DEV__) {
      logger.debug('Analytics: Collection enabled status changed', { enabled });
    }
  } catch (error) {
    logger.error('Failed to set analytics collection status', error as Error);
  }
};

export const analyticsService = {
  logScreenView,
  logEvent,
  logAppOpen,
  setUserProperties,
  setUserId,
  setAnalyticsCollectionEnabled,
};
