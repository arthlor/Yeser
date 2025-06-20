// src/services/expoPushService.ts
// 🔔 EXPO NATIVE PUSH: No Firebase required, uses Expo's infrastructure
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { logger } from '@/utils/debugConfig';
import { supabaseService } from '@/utils/supabaseClient';

/**
 * Expo Native Push Service - No Firebase required
 * Uses Expo's own push notification infrastructure
 */
class ExpoPushService {
  private expoPushToken: string | null = null;
  private initialized = false;

  /**
   * Initialize Expo push notifications (no Firebase needed)
   */
  async initialize(): Promise<{ success: boolean; token?: string }> {
    try {
      if (!Device.isDevice) {
        logger.warn('[EXPO_PUSH] Push notifications require physical device');
        return { success: false };
      }

      // Get Expo push token WITHOUT Firebase dependency
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        throw new Error('EAS project ID not found in configuration');
      }

      logger.debug('[EXPO_PUSH] Requesting Expo push token...', { projectId });

      // This works without Firebase - uses Expo's own service
      const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = expoPushToken;
      this.initialized = true;

      // Register token with your backend
      await this.registerTokenWithBackend(expoPushToken);

      logger.debug('[EXPO_PUSH] Successfully initialized with Expo push token');
      return { success: true, token: expoPushToken };
    } catch (error) {
      logger.error('[EXPO_PUSH] Failed to initialize:', error as Error);
      return { success: false };
    }
  }

  /**
   * Register push token with Supabase (create this RPC function)
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const { getCurrentSession } = await import('./authService');
      const session = await getCurrentSession();

      if (!session?.user) {
        logger.warn('[EXPO_PUSH] No authenticated user for token registration');
        return;
      }

      const client = supabaseService.getClient();

      // Store token in profiles table
      const { error } = await client
        .from('profiles')
        .update({
          expo_push_token: token,
          push_notifications_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        throw error;
      }

      logger.debug('[EXPO_PUSH] Token registered successfully');
    } catch (error) {
      logger.error('[EXPO_PUSH] Failed to register token:', error as Error);
    }
  }

  /**
   * Schedule push notification via server (no Firebase needed)
   */
  async scheduleServerPushNotification(
    title: string,
    body: string,
    scheduledFor: Date,
    data?: Record<string, unknown>
  ): Promise<{ success: boolean; notificationId?: string }> {
    try {
      if (!this.expoPushToken) {
        throw new Error('Expo push token not available');
      }

      const client = supabaseService.getClient();

      // Call your Supabase Edge Function for scheduling
      const { data: responseData, error } = await client.functions.invoke('schedule-expo-push', {
        body: {
          to: this.expoPushToken,
          title,
          body,
          data: data || {},
          scheduledFor: scheduledFor.toISOString(),
        },
      });

      if (error) {
        throw error;
      }

      return { success: true, notificationId: responseData?.id };
    } catch (error) {
      logger.error('[EXPO_PUSH] Failed to schedule notification:', error as Error);
      return { success: false };
    }
  }

  /**
   * Send immediate push notification
   */
  async sendImmediatePushNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    try {
      if (!this.expoPushToken) {
        throw new Error('Expo push token not available');
      }

      const client = supabaseService.getClient();

      const { error } = await client.functions.invoke('send-expo-push', {
        body: {
          to: this.expoPushToken,
          title,
          body,
          data: data || {},
        },
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      logger.error('[EXPO_PUSH] Failed to send immediate notification:', error as Error);
      return { success: false };
    }
  }

  /**
   * Get current token status
   */
  getTokenStatus(): { available: boolean; token?: string } {
    return {
      available: !!this.expoPushToken,
      token: this.expoPushToken || undefined,
    };
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.initialized && !!this.expoPushToken;
  }
}

export const expoPushService = new ExpoPushService();
