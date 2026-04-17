import { useCallback, useEffect } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { PurchasesPackage } from 'react-native-purchases';

import { presentNativePaywall } from '@/features/subscription/presentPaywall';

export const useSubscription = () => {
  const store = useSubscriptionStore();

  useEffect(() => {
    // Optional: Auto-check status when hook mounts if needed,
    // but usually store.initialize() in root is enough.
  }, []);

  /**
   * Universal gate checker.
   *
   * If the user is Pro, returns `true` (caller proceeds).
   *
   * Otherwise presents RevenueCat's **native** paywall (video + layout work
   * correctly because the paywall is pushed as a real UIViewController, not
   * embedded inside a React Native view) and returns `false` so the caller
   * skips the gated action.
   *
   * The presentation is fire-and-forget; callers that need to know the final
   * result (purchased / cancelled) should call `presentNativePaywall`
   * directly and await it.
   */
  const checkGate = useCallback(
    (featureName?: string): boolean => {
      if (store.isPro) {
        return true;
      }
      void presentNativePaywall(featureName);
      return false;
    },
    [store.isPro]
  );

  return {
    isPro: store.isPro,
    isLoading: store.isLoading,
    offering: store.currentOffering,
    customerInfo: store.customerInfo,
    products: {
      monthly: store.currentOffering?.availablePackages.find(
        (p: PurchasesPackage) => p.identifier === 'monthly'
      ),
      yearly: store.currentOffering?.availablePackages.find(
        (p: PurchasesPackage) => p.identifier === 'yearly'
      ),
      availablePackages: store.currentOffering?.availablePackages || [],
    },
    purchase: store.purchase,
    restore: store.restore,
    checkStatus: store.checkStatus,

    // -- Feature Gates --
    checkGate,

    canAddDailyEntry: (currentCount: number, isToday: boolean) => {
      // Rule: Free users can only add 1 statement per day (count 0 -> 1 is allowed)
      // Rule: Free users cannot add to past dates at all
      if (store.isPro) {
        return true;
      }
      if (!isToday) {
        return false;
      }
      return currentCount < 1;
    },

    canAccessPastEntries: () => {
      // Rule: Accessing past entries creation/modification requires Pro
      return store.isPro;
    },

    canUseInsights: () => {
      // Rule: Deep insights require Pro
      return store.isPro;
    },

    canExportPdf: () => {
      // Rule: PDF Export requires Pro
      return store.isPro;
    },

    canUseVariedPrompts: () => {
      // Rule: Varied prompts require Pro
      return store.isPro;
    },
  };
};
