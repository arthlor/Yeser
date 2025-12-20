import { create } from 'zustand';
import { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { revenueCatService } from '@/services/revenueCatService';
import { logger } from '@/utils/debugConfig';

interface SubscriptionState {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isLoading: boolean;

  // Actions
  initialize: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, _get) => ({
  isPro: false,
  customerInfo: null,
  currentOffering: null,
  isLoading: true,

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Defensive initialization
      try {
        await revenueCatService.initialize();
      } catch (initError) {
        logger.error('[SubscriptionStore] RevenueCat init failed:', initError as Error);
        // Set safe defaults and continue
        set({
          currentOffering: null,
          customerInfo: null,
          isPro: false,
          isLoading: false,
        });
        return; // Exit early on init failure
      }

      // Setup real-time listeners to sync store
      revenueCatService.setupListeners((info) => {
        logger.debug('[SubscriptionStore] Real-time update received');
        set({
          customerInfo: info,
          isPro: revenueCatService.isPro(info),
        });
      });

      const offerings = await revenueCatService.getOfferings();
      const info = await revenueCatService.getCustomerInfo();

      // Null safety: Warn if no offerings available
      if (!offerings) {
        logger.warn('[SubscriptionStore] No offerings available');
      }

      set({
        currentOffering: offerings || null,
        customerInfo: info,
        isPro: revenueCatService.isPro(info),
        isLoading: false,
      });
    } catch (error) {
      logger.error('[SubscriptionStore] Init failed:', error as Error);
      // Set safe state on error
      set({
        currentOffering: null,
        customerInfo: null,
        isPro: false,
        isLoading: false,
      });
    }
  },

  checkStatus: async () => {
    const info = await revenueCatService.getCustomerInfo();
    set({
      customerInfo: info,
      isPro: revenueCatService.isPro(info),
    });
  },

  purchase: async (pkg) => {
    try {
      set({ isLoading: true });
      const result = await revenueCatService.purchasePackage(pkg);
      if (result.success) {
        const info = await revenueCatService.getCustomerInfo();
        set({
          customerInfo: info,
          isPro: revenueCatService.isPro(info),
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false });
      return false; // Cancelled or failed
    } catch {
      set({ isLoading: false });
      return false; // Error
    }
  },

  restore: async () => {
    try {
      set({ isLoading: true });
      const result = await revenueCatService.restorePurchases();
      if (result.success) {
        const info = await revenueCatService.getCustomerInfo();
        set({
          customerInfo: info,
          isPro: revenueCatService.isPro(info),
          isLoading: false,
        });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },
}));
