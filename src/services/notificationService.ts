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
      logger.debug('🔄 Toggling notifications:', { enabled });

      // First, update the profile to reflect the user's choice immediately.
      const { updateProfile } = await import('@/api/profileApi');
      await updateProfile({ notifications_enabled: enabled });
      logger.debug('✅ Database updated with notifications_enabled:', { enabled });

      // If enabling, ensure we have a valid push token registered.
      if (enabled) {
        logger.debug('🎯 Notifications enabled - ensuring push token is registered');
        try {
          await this.registerPushToken();
          logger.debug('✅ Push token registration check completed successfully');
        } catch (tokenError) {
          const error = tokenError instanceof Error ? tokenError : new Error(String(tokenError));
          logger.error('💥 Token registration failed:', {
            error: error.message,
            enabled,
            platform: Platform.OS,
          });

          // Revert the setting since token registration failed.
          try {
            await updateProfile({ notifications_enabled: false });
            logger.debug('🔄 Reverted notifications_enabled to false due to token failure');
          } catch (revertError) {
            const revertErr =
              revertError instanceof Error ? revertError : new Error(String(revertError));
            logger.error('❌ Failed to revert notification setting:', revertErr);
          }

          throw new Error(`Bildirim kaydı başarısız: ${error.message}`);
        }
      }

      logger.debug('🎉 Notifications toggled successfully', {
        enabled,
        hasToken: !!this.expoPushToken,
        fcmAvailable: this.fcmAvailable,
      });

      return true;
    } catch (error) {
      const finalError = error instanceof Error ? error : new Error(String(error));
      logger.error('❌ Failed to toggle notifications:', {
        error: finalError.message,
        enabled,
        platform: Platform.OS,
      });

      throw finalError;
    }
  }

  /**
   * 🔥 ENHANCED: Register push token with comprehensive validation and debugging
   */
  private async registerPushToken(): Promise<void> {
    logger.debug('🚀 Starting push token registration process...');

    try {
      // ✅ Step 1: Device validation
      if (!Device.isDevice) {
        logger.warn('❌ Not a physical device, skipping push token registration');
        return;
      }
      logger.debug('✅ Step 1: Physical device confirmed');

      // ✅ Step 2: Check notification permissions FIRST
      const permissionStatus = await Notifications.getPermissionsAsync();
      logger.debug('📋 Step 2: Permission status:', {
        status: permissionStatus.status,
        canAskAgain: permissionStatus.canAskAgain,
        granted: permissionStatus.granted,
      });

      if (permissionStatus.status !== 'granted') {
        logger.warn('❌ Notification permissions not granted, requesting...');
        const requestResult = await this.requestPermissions();
        if (!requestResult) {
          throw new Error('Notification permissions denied - cannot register push token');
        }
        logger.debug('✅ Permissions granted after request');
      } else {
        logger.debug('✅ Step 2: Permissions already granted');
      }

      // ✅ Step 3: EAS Project ID validation
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        logger.error('❌ No EAS project ID found in app config');
        logger.debug('App config debug:', {
          expoConfig: Constants.expoConfig?.extra,
          projectId,
          appName: Constants.expoConfig?.name,
          slug: Constants.expoConfig?.slug,
        });
        throw new Error('EAS project ID missing - check app.config.js');
      }
      logger.debug('✅ Step 3: EAS project ID found:', { projectId });

      // ✅ Step 4: FCM availability check (but don't block on it)
      await this.checkFCMAvailability();
      logger.debug('📱 Step 4: Platform info:', {
        platform: Platform.OS,
        fcmAvailable: this.fcmAvailable,
        env: process.env.EXPO_PUBLIC_ENV,
        appOwnership: Constants.appOwnership,
      });

      // ✅ Step 5: FCM blocking logic (only for local dev)
      const isLocalDev = !Constants.appOwnership || Constants.appOwnership === 'expo';
      if (Platform.OS === 'android' && !this.fcmAvailable && isLocalDev) {
        logger.info('⚠️ Skipping push token registration - FCM not available in local development');
        logger.info(
          'ℹ️ This is normal for npx expo run:android - notifications work in EAS builds'
        );
        return;
      }
      logger.debug('✅ Step 5: FCM check passed');

      // ✅ Step 6: Generate Expo push token (THE CRITICAL STEP)
      logger.debug('🎯 Step 6: Attempting to generate Expo push token...');

      let tokenData;
      try {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        logger.debug('📊 Token generation response:', {
          hasData: !!tokenData,
          hasTokenData: !!tokenData?.data,
          type: tokenData?.type,
          tokenLength: tokenData?.data?.length || 0,
        });
      } catch (tokenError) {
        const error = tokenError instanceof Error ? tokenError : new Error(String(tokenError));
        logger.error('❌ Expo token generation failed:', {
          error: error.message,
          projectId,
          platform: Platform.OS,
          permissionStatus: permissionStatus.status,
        });
        throw new Error(`Expo token generation failed: ${error.message}`);
      }

      // ✅ Step 7: Validate token data
      if (!tokenData || !tokenData.data || tokenData.data.trim() === '') {
        logger.error('❌ Invalid token data received:', {
          hasTokenData: !!tokenData,
          tokenDataValue: tokenData?.data,
          tokenType: tokenData?.type,
          projectId,
        });
        throw new Error('Failed to get valid push token - empty or null data returned');
      }

      this.expoPushToken = tokenData.data.trim();
      logger.debug('✅ Step 7: Valid token obtained:', {
        tokenLength: this.expoPushToken.length,
        tokenPreview: this.expoPushToken.substring(0, 25) + '...',
        tokenType: tokenData.type,
      });

      // ✅ Step 8: Database registration with session validation
      const { supabaseService } = await import('@/utils/supabaseClient');
      const { getCurrentSession } = await import('./authService');

      const session = await getCurrentSession();
      if (!session?.user?.id) {
        logger.error('❌ No valid session found');
        throw new Error('No authenticated session - cannot save token to database');
      }
      logger.debug('✅ Step 8: Valid session found for user:', { userId: session.user.id });

      // ✅ Step 9: Call Supabase function with validation
      logger.debug('🗄️ Step 9: Calling register_push_token Supabase function...');

      const { error } = await supabaseService.getClient().rpc('register_push_token', {
        p_user_id: session.user.id,
        p_expo_push_token: this.expoPushToken,
        p_platform: Platform.OS,
      });

      if (error) {
        logger.error('❌ Supabase function call failed:', {
          error: error.message,
          userId: session.user.id,
          tokenLength: this.expoPushToken.length,
        });
        throw new Error(`Failed to register push token in database: ${error.message}`);
      }

      // ✅ SUCCESS!
      logger.debug('🎉 Push token registered successfully!', {
        userId: session.user.id,
        tokenLength: this.expoPushToken.length,
        tokenPreview: this.expoPushToken.substring(0, 25) + '...',
        fcmAvailable: this.fcmAvailable,
        platform: Platform.OS,
      });
    } catch (error) {
      // 🔥 ENHANCED: Comprehensive error logging and handling
      const errorDetails = {
        error: error as Error,
        platform: Platform.OS,
        fcmAvailable: this.fcmAvailable,
        hasToken: !!this.expoPushToken,
        appOwnership: Constants.appOwnership,
        env: process.env.EXPO_PUBLIC_ENV,
      };

      logger.error('💥 Push token registration failed:', errorDetails);

      // Platform-specific error guidance
      if (Platform.OS === 'android') {
        if (!this.fcmAvailable) {
          logger.info(
            '💡 Android FCM troubleshooting: Check EXPO_PUBLIC_FCM_ENABLED and google-services.json'
          );
        }
        logger.info(
          '💡 For Android production: Ensure APK is built with EAS and FCM is properly configured'
        );
      } else if (Platform.OS === 'ios') {
        logger.info('💡 For iOS: Ensure APNs certificates are uploaded to Expo project');
      }

      // Clear any partial token data
      this.expoPushToken = null;

      // 🚨 IMPORTANT: Don't save null tokens to database!
      // Previous code would continue and save null token - now we properly fail
      throw error; // Re-throw to surface the error to the UI
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
