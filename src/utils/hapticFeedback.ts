import * as Haptics from 'expo-haptics';
import { logger } from '@/utils/debugConfig';

/**
 * Utility functions for haptic feedback
 * Uses Expo Haptics to provide tactile feedback for user interactions
 */
export const hapticFeedback = {
  /**
   * Light impact feedback - for subtle interactions
   */
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      logger.warn('Haptic feedback not supported', { error });
    }
  },

  /**
   * Medium impact feedback - for standard interactions
   */
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      logger.warn('Haptic feedback not supported', { error });
    }
  },

  /**
   * Heavy impact feedback - for significant interactions
   */
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      logger.warn('Haptic feedback not supported', { error });
    }
  },

  /**
   * Success notification feedback
   */
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.warn('Haptic feedback not supported', { error });
    }
  },

  /**
   * Warning notification feedback
   */
  warning: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      logger.warn('Haptic feedback not supported', { error });
    }
  },

  /**
   * Error notification feedback
   */
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      logger.warn('Haptic feedback not supported', { error });
    }
  },
};
