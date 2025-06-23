// src/services/notificationService.ts (FCM-enhanced ~250 lines)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '@/utils/debugConfig';

/**
 * 🔥 ENHANCED: FCM-enabled notification service with graceful fallbacks
 * Simplified notification service - only handles permissions and token management
 * All scheduling is done server-side via cron jobs
 */
class NotificationService {
  private initialized = false;
  private expoPushToken: string | null = null;
  private fcmAvailable = false;

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

    // 🔥 NEW: Check FCM availability
    this.checkFCMAvailability();
  }

  /**
   * 🔥 NEW: Check if FCM is properly configured
   */
  private async checkFCMAvailability(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Check if we're running on a physical device
        const isDevice = Device.isDevice;

        // 🔥 UPDATED: Simplified FCM availability check
        const fcmExplicitlyEnabled = process.env.EXPO_PUBLIC_FCM_ENABLED === 'true';

        // Always allow FCM on physical devices if enabled
        this.fcmAvailable = isDevice && fcmExplicitlyEnabled;

        logger.debug('FCM Availability Check:', {
          platform: Platform.OS,
          isDevice,
          fcmExplicitlyEnabled,
          fcmAvailable: this.fcmAvailable,
          env: process.env.EXPO_PUBLIC_ENV || 'development',
        });
      } else {
        // iOS doesn't need FCM configuration
        this.fcmAvailable = true;
      }
    } catch (error) {
      logger.warn('FCM availability check failed:', { error: error as Error });
      this.fcmAvailable = false;
    }
  }

  /**
   * 🔥 ENHANCED: Initialize with FCM support and graceful fallbacks
   * @returns Promise resolving to whether permissions were granted
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      logger.debug('Initializing notification service...');

      // Request permissions first
      const permitted = await this.requestPermissions();
      if (!permitted) {
        logger.warn('Notification permissions denied');
        this.initialized = true; // Still mark as initialized
        return false;
      }

      // Try to register push token with FCM support
      await this.registerPushToken();

      this.initialized = true;
      logger.debug('Notification service initialized successfully', {
        fcmAvailable: this.fcmAvailable,
        hasToken: !!this.expoPushToken,
      });

      return true;
    } catch (error) {
      logger.error('Failed to initialize notification service:', { error: error as Error });

      // 🔥 GRACEFUL FALLBACK: Mark as initialized even if FCM fails
      this.initialized = true;
      return false;
    }
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

      // 🔥 ENHANCED: Always try to get a token when enabling notifications
      if (enabled) {
        logger.debug('Notifications enabled - ensuring push token is registered');
        await this.registerPushToken();
      }

      logger.debug('Notifications toggled successfully', {
        enabled,
        hasToken: !!this.expoPushToken,
        fcmAvailable: this.fcmAvailable,
      });

      return true;
    } catch (error) {
      logger.error('Failed to toggle notifications:', error as Error);
      return false;
    }
  }

  /**
   * 🔥 ENHANCED: Register push token with FCM handling
   */
  private async registerPushToken(): Promise<void> {
    try {
      if (!Device.isDevice) {
        logger.debug('Not a physical device, skipping push token registration');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        logger.warn('No EAS project ID found');
        return;
      }

      logger.debug('Attempting to register push token...', {
        projectId,
        platform: Platform.OS,
        fcmAvailable: this.fcmAvailable,
      });

      // 🔥 ENHANCED: Get Expo push token with better error handling
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      if (!tokenData || !tokenData.data) {
        throw new Error('Failed to get push token - no data returned');
      }

      this.expoPushToken = tokenData.data;
      logger.debug('Push token obtained successfully', {
        tokenLength: this.expoPushToken.length,
        tokenPreview: this.expoPushToken.substring(0, 20) + '...',
      });

      // Update token in database with timestamp
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (session?.user) {
        const { error } = await supabaseService
          .getClient()
          .from('profiles')
          .update({
            expo_push_token: this.expoPushToken,
            push_token_updated_at: new Date().toISOString(),
            push_notification_failures: 0, // Reset failures on new token
          })
          .eq('id', session.user.id);

        if (error) {
          throw new Error(`Database update failed: ${error.message}`);
        }

        logger.debug('Push token registered successfully', {
          userId: session.user.id,
          tokenLength: this.expoPushToken.length,
          fcmAvailable: this.fcmAvailable,
          platform: Platform.OS,
        });
      } else {
        logger.warn('No session found, cannot save token to database');
      }
    } catch (error) {
      logger.error('Failed to register push token:', {
        error: error as Error,
        platform: Platform.OS,
        fcmAvailable: this.fcmAvailable,
      });

      // 🔥 ENHANCED: Better error reporting
      if (Platform.OS === 'android') {
        if (!this.fcmAvailable) {
          logger.info(
            'Android FCM not available - check EXPO_PUBLIC_FCM_ENABLED and google-services.json'
          );
        } else {
          logger.error('Android FCM failed despite being configured - this needs investigation');
        }
      }

      // Don't throw - let the app continue working
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
      } else {
        // No token update timestamp, refresh to be safe
        await this.registerPushToken();
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

  /**
   * 🔥 NEW: Check if FCM is available
   */
  isFCMAvailable(): boolean {
    return this.fcmAvailable;
  }

  /**
   * 🔥 NEW: Get comprehensive status for debugging
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasToken: !!this.expoPushToken,
      fcmAvailable: this.fcmAvailable,
      platform: Platform.OS,
      tokenLength: this.expoPushToken?.length || 0,
    };
  }

  /**
   * 🔥 NEW: Force token re-registration (for fixing existing users)
   */
  async forceTokenRefresh(): Promise<boolean> {
    try {
      logger.debug('Forcing token refresh...');

      // Clear existing token
      this.expoPushToken = null;

      // Try to register new token
      await this.registerPushToken();

      const success = !!this.expoPushToken;
      logger.debug('Force token refresh result:', {
        success,
        hasToken: success,
      });

      return success;
    } catch (error) {
      logger.error('Failed to force token refresh:', error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
