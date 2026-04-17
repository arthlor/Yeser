import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';

import { logger } from '@/utils/debugConfig';

class ReviewService {
  async requestReview(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return false;
    }

    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) {
        logger.debug('[ReviewService] In-app review is not available on this device');
        return false;
      }

      await StoreReview.requestReview();
      logger.debug('[ReviewService] In-app review request completed');
      return true;
    } catch (error) {
      logger.warn('[ReviewService] Failed to request in-app review', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export const reviewService = new ReviewService();
