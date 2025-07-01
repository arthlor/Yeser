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

    // 🔥 NEW: Check FCM availability (async but don't await in constructor)
    this.checkFCMAvailability().catch((error) => {
      logger.error('FCM availability check failed in constructor:', error);
      this.fcmAvailable = false;
    });
  }

  /**
   * 🔥 ENHANCED: Check if FCM is properly configured AND initialized
   */
  private async checkFCMAvailability(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const isDevice = Device.isDevice;
        const fcmExplicitlyEnabled = process.env.EXPO_PUBLIC_FCM_ENABLED === 'true';
        const isEASBuild =
          process.env.EXPO_PUBLIC_ENV === 'production' || process.env.EXPO_PUBLIC_ENV === 'preview';

        // 🔍 DEBUG: Log environment variables
        logger.debug('Environment Variables Check:', {
          EXPO_PUBLIC_FCM_ENABLED: process.env.EXPO_PUBLIC_FCM_ENABLED,
          EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
          fcmExplicitlyEnabled,
          isEASBuild,
          isDevice,
          note: 'If EXPO_PUBLIC_ENV is not set, app.config.js defaults to production!',
        });

        // 🎯 DETECT ACTUAL RUNTIME ENVIRONMENT: Check if we're in local dev regardless of ENV setting
        const isActuallyLocalDev = !Constants.appOwnership || Constants.appOwnership === 'expo';
        const isRealEASBuild = !isActuallyLocalDev && isEASBuild;

        // 🎯 EAS BUILD LOGIC: In EAS builds, Firebase is only available after full build
        if (isRealEASBuild) {
          // For EAS builds, we'll rely on Expo's push notification service
          // Firebase will be available in the actual built app, but not in local runs
          this.fcmAvailable = isDevice && fcmExplicitlyEnabled;
          logger.debug('FCM Availability Check (Real EAS Build):', {
            platform: Platform.OS,
            isDevice,
            fcmExplicitlyEnabled,
            fcmAvailable: this.fcmAvailable,
            env: process.env.EXPO_PUBLIC_ENV,
            appOwnership: Constants.appOwnership,
            note: 'Firebase config handled by EAS - will work in built app',
          });
        } else {
          // For local development (including npx expo run:android), disable FCM
          this.fcmAvailable = false;
          logger.debug('FCM Availability Check (Local Development):', {
            platform: Platform.OS,
            isDevice,
            fcmExplicitlyEnabled,
            fcmAvailable: this.fcmAvailable,
            env: process.env.EXPO_PUBLIC_ENV,
            appOwnership: Constants.appOwnership,
            isActuallyLocalDev,
            isRealEASBuild,
            note: 'FCM disabled for local development - will work in EAS builds',
          });
        }
      } else {
        // iOS uses APNs through Expo - always available
        this.fcmAvailable = true;
        logger.debug('FCM Availability Check (iOS):', {
          platform: Platform.OS,
          fcmAvailable: this.fcmAvailable,
          note: 'iOS uses APNs through Expo',
        });
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

      // 🔥 ENSURE: FCM availability is checked before proceeding
      await this.checkFCMAvailability();

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

      // 🔥 ENHANCED: Re-check FCM availability before proceeding
      await this.checkFCMAvailability();

      logger.debug('Attempting to register push token...', {
        projectId,
        platform: Platform.OS,
        fcmAvailable: this.fcmAvailable,
        env: process.env.EXPO_PUBLIC_ENV,
      });

      // 🎯 CRITICAL: Skip FCM-dependent calls in local development
      if (Platform.OS === 'android' && !this.fcmAvailable) {
        logger.info('Skipping push token registration - FCM not available in local development');
        logger.info('This is normal for npx expo run:android - notifications work in EAS builds');
        return;
      }

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
