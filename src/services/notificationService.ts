// src/services/notificationService.ts (simplified to ~200 lines)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { logger } from '@/utils/debugConfig';

/**
 * Simplified notification service - only handles permissions and token management
 * All scheduling is done server-side via cron jobs
 */
class NotificationService {
  private initialized = false;
  private expoPushToken: string | null = null;

  constructor() {
    // Set the notification handler for when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  /**
   * Initialize the notification service
   * @returns Promise resolving to whether permissions were granted
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    const permitted = await this.requestPermissions();
    if (permitted) {
      await this.registerPushToken();
    }

    this.initialized = true;
    return permitted;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        logger.warn('[NOTIFICATION] Must use physical device for notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      logger.error('[NOTIFICATION] Failed to request permissions:', error as Error);
      return false;
    }
  }

  /**
   * Toggle notifications on/off
   */
  async toggleNotifications(enabled: boolean): Promise<boolean> {
    try {
      // Simply update the database field
      const { updateProfile } = await import('@/api/profileApi');
      await updateProfile({ notifications_enabled: enabled });

      // If enabling and we don't have a token yet, get one
      if (enabled && !this.expoPushToken) {
        await this.registerPushToken();
      }

      return true;
    } catch (error) {
      logger.error('Failed to toggle notifications:', error as Error);
      return false;
    }
  }

  /**
   * Register push token with backend
   */
  private async registerPushToken(): Promise<void> {
    try {
      if (!Device.isDevice) {
        logger.debug('[NOTIFICATION] Skipping push token on simulator/emulator');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        logger.warn('[NOTIFICATION] No EAS project ID found');
        return;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token;

      // Update token in database with timestamp
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (session?.user) {
        await supabaseService
          .getClient()
          .from('profiles')
          .update({
            expo_push_token: token,
            push_token_updated_at: new Date().toISOString(),
            push_notification_failures: 0, // Reset failures on new token
          })
          .eq('id', session.user.id);

        logger.debug('[NOTIFICATION] Push token registered successfully');
      }
    } catch (error) {
      logger.error('Failed to register push token:', error as Error);
    }
  }

  /**
   * Refresh token if needed (called periodically)
   */
  async refreshTokenIfNeeded(): Promise<void> {
    try {
      // Get current profile to check token age
      const { getProfile } = await import('@/api/profileApi');
      const profile = await getProfile();

      if (profile?.push_token_updated_at) {
        const lastUpdate = new Date(profile.push_token_updated_at);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

        // Refresh if older than 30 days
        if (daysSinceUpdate > 30) {
          await this.registerPushToken();
        }
      }
    } catch (error) {
      logger.error('Failed to refresh token:', error as Error);
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current push token
   */
  getCurrentPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if push notifications are available
   */
  async checkPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Reset the service (for logout)
   */
  reset(): void {
    this.initialized = false;
    this.expoPushToken = null;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
