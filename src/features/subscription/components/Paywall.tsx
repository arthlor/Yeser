import React from 'react';
import { StyleSheet, View } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { logger } from '@/utils/debugConfig';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@/providers/ToastProvider';
import { useTranslation } from 'react-i18next';

interface PaywallScreenProps {
  onDismiss?: () => void;
  asModal?: boolean; // Useful if we want to customize presentation
}

export const PaywallScreen = ({ onDismiss }: PaywallScreenProps) => {
  const { checkStatus } = useSubscriptionStore();
  const navigation = useNavigation();
  const { showSuccess } = useToast();
  const { t } = useTranslation();

  const handlePaywallResult = async (result: string) => {
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        logger.debug(`[Paywall] Transaction success: ${result}`);
        await checkStatus();

        showSuccess(
          result === PAYWALL_RESULT.RESTORED
            ? t('subscription.restore.success', 'Subscription restored!')
            : t('subscription.purchase.success', 'Welcome to Premium!')
        );

        onDismiss?.();
        // If presented via router, back out
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
        break;
      case PAYWALL_RESULT.CANCELLED:
        logger.debug('[Paywall] Transaction cancelled');
        // Optional: Dismiss on cancel if desired, or keep open
        break;
      case PAYWALL_RESULT.ERROR:
        logger.error('[Paywall] Transaction error');
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        onPurchaseCompleted={({ customerInfo: _customerInfo }) =>
          handlePaywallResult(PAYWALL_RESULT.PURCHASED)
        }
        onRestoreCompleted={({ customerInfo: _customerInfo }) =>
          handlePaywallResult(PAYWALL_RESULT.RESTORED)
        }
        onDismiss={() => {
          onDismiss?.();
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
