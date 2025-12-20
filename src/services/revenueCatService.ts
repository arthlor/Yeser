import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_CONFIG } from '@/config/revenueCat';
import { logger } from '@/utils/debugConfig';

class RevenueCatService {
  private isInitialized = false;

  constructor() {
    // Singleton pattern could be used, or just export an instance
  }

  /**
   * Initialize RevenueCat SDK with verification
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.configure({ apiKey: REVENUECAT_CONFIG.API_KEY });
        this.isInitialized = true;

        // Verify initialization succeeded by fetching customer info
        try {
          const info = await Purchases.getCustomerInfo();
          logger.debug('[RevenueCatService] Initialization verified with customer info', {
            hasEntitlements: Object.keys(info.entitlements.active).length > 0,
          });
        } catch (verifyError) {
          logger.warn('[RevenueCatService] Could not verify initialization:', {
            error: (verifyError as Error).message,
          });
          // Don't throw - allow app to continue but log the issue
        }

        logger.debug('[RevenueCatService] Initialized successfully');
      } else {
        logger.warn('[RevenueCatService] Skipped initialization: Not mobile platform');
      }
    } catch (error: unknown) {
      logger.error('[RevenueCatService] Initialization failed:', error as Error);
      this.isInitialized = false; // Ensure flag is false on error
      throw error; // Re-throw to let caller handle
    }
  }

  // Identify user with RevenueCat
  async identifyUser(userId: string): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      await this.handleCustomerInfoUpdate(customerInfo);
      logger.debug(`[RevenueCatService] User identified: ${userId}`);
    } catch (error: unknown) {
      logger.error('[RevenueCatService] User identification failed:', error as Error);
    }
  }

  // Logout from RevenueCat
  async logoutUser(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      // Check if current user is anonymous - if so, skip logout
      const customerInfo = await Purchases.getCustomerInfo();
      const isAnonymous = customerInfo.originalAppUserId.startsWith('$RCAnonymousID');

      if (isAnonymous) {
        logger.debug('[RevenueCatService] User is anonymous, skipping logout');
        return;
      }

      const info = await Purchases.logOut();
      await this.handleCustomerInfoUpdate(info);
      logger.debug('[RevenueCatService] User logged out');
    } catch (error: unknown) {
      // Silently handle the "anonymous user" error - it's not a real error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('anonymous')) {
        logger.debug('[RevenueCatService] User already anonymous, skipping logout');
        return;
      }
      logger.error('[RevenueCatService] Logout failed:', error as Error);
    }
  }

  // Setup real-time listener
  setupListeners(onUpdate?: (customerInfo: CustomerInfo) => void): void {
    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      this.handleCustomerInfoUpdate(customerInfo);
      if (onUpdate) {
        onUpdate(customerInfo);
      }
    });
    logger.debug('[RevenueCatService] Listeners set up');
  }

  /**
   * Get current offerings (products)
   */
  async getOfferings() {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error: unknown) {
      logger.error('Error fetching offerings:', error as Error);
      return null;
    }
  }

  /**
   * Purchase a package
   */
  async purchasePackage(packageToPurchase: PurchasesPackage) {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      await this.handleCustomerInfoUpdate(customerInfo);
      return { success: true };
    } catch (error: unknown) {
      const userCancelled =
        error &&
        typeof error === 'object' &&
        'userCancelled' in error &&
        (error as { userCancelled: boolean }).userCancelled;

      if (userCancelled) {
        return { success: false, error: 'User cancelled' };
      }

      logger.error('Purchase failed:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown purchase error',
      };
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      await this.handleCustomerInfoUpdate(customerInfo);
      return { success: true };
    } catch (error: unknown) {
      logger.error('Restore failed:', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown restore error',
      };
    }
  }

  /**
   * Check if user has "Yeşer Pro" entitlement
   */
  isPro(customerInfo: CustomerInfo | null): boolean {
    if (!customerInfo) {
      return false;
    }
    return !!customerInfo.entitlements.active[REVENUECAT_CONFIG.ENTITLEMENT_ID];
  }

  /**
   * Get current customer info
   */
  async getCustomerInfo() {
    try {
      const info = await Purchases.getCustomerInfo();
      await this.handleCustomerInfoUpdate(info);
      return info;
    } catch (error) {
      logger.warn('[RevenueCatService] Failed to get customer info:', { error: error });
      return null;
    }
  }

  /**
   * Set the preferred locale for the paywall UI
   * @param language - The app's current language ('tr', 'en', or 'es')
   */
  async setPaywallLocale(language: 'tr' | 'en' | 'es'): Promise<void> {
    if (!this.isInitialized) {
      logger.debug('[RevenueCatService] SDK not initialized, skipping locale override');
      return;
    }

    const localeMap: Record<string, string> = {
      tr: 'tr-TR',
      en: 'en-US',
      es: 'es-ES',
    };

    try {
      await Purchases.overridePreferredLocale(localeMap[language] ?? 'en-US');
      logger.debug(`[RevenueCatService] Paywall locale set to: ${localeMap[language]}`);
    } catch (error) {
      logger.warn('[RevenueCatService] Failed to set paywall locale:', { error });
    }
  }

  /**
   * Handle updates to customer info (centralized logic)
   */
  private async handleCustomerInfoUpdate(customerInfo: CustomerInfo) {
    const isPro = this.isPro(customerInfo);
    logger.debug(`[RevenueCatService] Customer Info updated. isPro: ${isPro}`);

    // We no longer sync to DB from client side for security
    // This is now handled by webhooks
  }
}

export const revenueCatService = new RevenueCatService();
