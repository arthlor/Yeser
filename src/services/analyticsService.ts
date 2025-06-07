import { getAnalytics } from '@react-native-firebase/analytics';
import { logger } from '@/utils/debugConfig';

const analytics = getAnalytics();

/**
 * Logs a screen view event to Firebase Analytics.
 * Screen names should be clear and descriptive.
 * @param screenName The name of the screen to track.
 */
const logScreenView = async (screenName: string): Promise<void> => {
  try {
    await analytics.logScreenView({
      screen_name: screenName,
      screen_class: screenName, // Often same as screen_name for RN apps
    });
    // logger.debug(`Analytics: Screen view logged - ${screenName}`);
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
    await analytics.logEvent(eventName, params);
    // logger.debug(`Analytics: Event logged - ${eventName}`, params || '');
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
    await analytics.logAppOpen();
    // logger.debug('Analytics: App open event logged');
  } catch (error) {
    logger.error('Failed to log app_open event to Firebase Analytics', error as Error);
  }
};

export const analyticsService = {
  logScreenView,
  logEvent,
  logAppOpen,
};
