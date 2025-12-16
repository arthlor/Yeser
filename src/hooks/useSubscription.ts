import { useCallback, useEffect } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { PurchasesPackage } from 'react-native-purchases';

export const useSubscription = () => {
  const store = useSubscriptionStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Optional: Auto-check status when hook mounts if needed,
    // but usually store.initialize() in root is enough.
  }, []);

  /**
   * Universal gate checker.
   * If user is NOT pro, it navigates to Paywall/Modal (optional) and returns false.
   * If user IS pro, returns true.
   */
  const checkGate = useCallback(
    (featureName?: string): boolean => {
      if (store.isPro) {
        return true;
      }
      // Navigate to Paywall by default if check fails
      // We use the root navigator to ensure it overlays everything
      // @ts-ignore - The navigation structure might be nested, ensuring safety
      navigation.navigate('PaywallModal', { source: featureName });
      return false;
    },
    [store.isPro, navigation]
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
