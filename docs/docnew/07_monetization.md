# 07: Monetization Strategy

While Yeşer is currently free to use, this document outlines the planned **freemium monetization strategy**. The architecture has been designed from the ground up to support this model, allowing for a smooth transition to a paid product in the future.

## 1. Guiding Principles

- **Value First**: The free version of Yeşer must be a complete and valuable product on its own. It should allow users to build a consistent gratitude habit without feeling forced to upgrade.
- **Core Experience is Free**: The fundamental act of writing and reviewing gratitude statements will always be unlimited. We will never limit the core value proposition.
- **Premium is for "Superpowers"**: The premium version, "Yeşer Plus," will offer advanced features, analytics, and customization for users who want to deepen their practice.
- **No Ads**: Yeşer will never contain third-party advertisements. The user experience is paramount.

## 2. Freemium Model: Tiers

### Yeşer (Free)

- **Unlimited** gratitude entries.
- **Full** streak tracking.
- **Basic** throwback memories.
- **Limited** access to the varied prompts database.
- Standard light and dark themes.
- Standard daily reminder notifications.
- Basic data export.

### Yeşer Plus (Premium)

- **Price**: Planned at ~$4.99/month or ~$39.99/year.
- **Advanced Analytics**: In-depth dashboards showing mood trends, common themes in entries, and personal growth over time.
- **Unlimited Prompts**: Full access to the entire varied prompts database, including premium-only categories.
- **Custom Prompts**: The ability for users to create and save their own prompts.
- **Advanced Throwbacks**: "On this day" throwbacks and other intelligent memory features.
- **Premium Themes**: Access to exclusive, beautifully designed themes.
- **Advanced Notifications**: Location-based reminders and more flexible scheduling options.
- **Enhanced Data Export**: Export to beautifully formatted PDFs with analytics and insights included.
- **Voice Input**: Use speech-to-text to record gratitude entries.

## 3. Technical Implementation Plan

The current architecture is **perfectly suited** for this monetization strategy. The separation of concerns and hook-based data fetching make it straightforward to add feature gating.

1.  **Extend `profiles` Table**: Add `subscription_tier: 'free' | 'plus'` and `subscription_expires_at: 'timestamp'` to the Supabase `profiles` table. This requires a simple database migration.

2.  **Integrate `react-native-iap`**: This library will be used to handle the native iOS (StoreKit) and Android (Google Play Billing) purchase flows. A new `paymentService.ts` will encapsulate this logic.

3.  **Create `useSubscription` Hook**: A new TanStack Query hook will be created to fetch and cache the user's subscription status.

    ```typescript
    // src/features/profile/hooks/useSubscription.ts
    export const useSubscription = () => {
      const { data: profile } = useUserProfile(); // Reuses the existing profile hook
      return {
        isPremium: profile?.subscription_tier === 'plus',
        // ... other subscription data
      };
    };
    ```

4.  **Implement Feature Gating**: This is done at the UI and hook level.

    - **UI Layer**: Components for premium features will be conditionally rendered.

      ```tsx
      // Example in a settings screen component
      const { isPremium } = useSubscription();

      return (
        <View>
          <FeatureA />
          {isPremium && <PremiumFeatureB />}
          {!isPremium && <UpgradeButton feature="B" />}
        </View>
      );
      ```

    - **Hook/API Layer**: Hooks that fetch data for premium features will be disabled if the user is not a premium subscriber.
      ```typescript
      // Example premium data hook
      export const useAdvancedAnalytics = () => {
        const { isPremium } = useSubscription();
        return useQuery({
          queryKey: queryKeys.advancedAnalytics(userId),
          queryFn: () => analyticsApi.getAdvancedAnalytics(),
          enabled: isPremium, // The query only runs for premium users
        });
      };
      ```

5.  **Secure Backend Logic**: Any backend RPC functions related to premium features (e.g., `get_advanced_analytics`) will first verify the user's `subscription_tier` from the `profiles` table before executing, ensuring the feature cannot be accessed without a valid subscription.

Because we've built the app on this solid foundation, implementing monetization is a matter of adding new capabilities, not refactoring existing ones.
