import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { OnboardingLayout } from '@/features/onboarding/components/OnboardingLayout';
import { useTheme } from '@/providers/ThemeProvider';
import { analyticsService } from '@/services/analyticsService';
import { presentNativePaywall } from '@/features/subscription/presentPaywall';
import type { AppTheme } from '@/themes/types';

interface PaywallStepProps {
  onNext: () => void;
}

/**
 * Onboarding paywall step.
 *
 * Presents RevenueCat's **native** paywall modal on top of the onboarding
 * layout. We use the imperative `presentNativePaywall()` API (not the
 * embedded `<RevenueCatUI.Paywall>` component) because videos and animations
 * only render correctly when the paywall is presented as a real
 * UIViewController, not as a React Native child view.
 *
 * Regardless of the outcome (purchased / restored / cancelled / error), we
 * advance the onboarding flow with `onNext()` so the user is never stuck.
 */
const PaywallStep: React.FC<PaywallStepProps> = ({ onNext }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const hasPresentedRef = useRef(false);

  useEffect(() => {
    analyticsService.logScreenView('onboarding_paywall_step');
    analyticsService.logEvent('onboarding_paywall_viewed');

    if (hasPresentedRef.current) {
      return;
    }
    hasPresentedRef.current = true;

    let cancelled = false;
    void (async () => {
      try {
        await presentNativePaywall('onboarding');
      } finally {
        if (!cancelled) {
          onNext();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onNext]);

  return (
    <OnboardingLayout edgeToEdge={true}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </OnboardingLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default PaywallStep;
