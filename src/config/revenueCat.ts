export const REVENUECAT_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '',
  ENTITLEMENT_ID: 'Yeşer Pro',
  PRODUCTS: {
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
  },
} as const;
