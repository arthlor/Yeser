import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { PurchasesError } from 'react-native-purchases';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { logger } from '@/utils/debugConfig';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@/providers/ToastProvider';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';

interface PaywallScreenProps {
  onDismiss?: () => void;
  asModal?: boolean; // Useful if we want to customize presentation
}

export const PaywallScreen = ({ onDismiss }: PaywallScreenProps) => {
  const { checkStatus, currentOffering, isLoading } = useSubscriptionStore();
  const navigation = useNavigation();

  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isPaywallReady, setIsPaywallReady] = useState(false);

  // Critical: Ensure offerings are loaded before rendering paywall
  useEffect(() => {
    // Wait for offerings to be available
    if (currentOffering && !isLoading) {
      logger.debug('[Paywall] Offerings loaded, paywall ready to render');
      setIsPaywallReady(true);
    } else if (!isLoading && !currentOffering) {
      logger.error('[Paywall] No offerings available after loading');
      showError(t('subscription.purchase.error', 'Unable to load subscription options'));
      // Auto-dismiss if no offerings available
      setTimeout(() => {
        onDismiss?.();
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 2000);
    }
  }, [currentOffering, isLoading, onDismiss, navigation, showError, t]);

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
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
        break;
      case PAYWALL_RESULT.CANCELLED:
        logger.debug('[Paywall] Transaction cancelled');
        break;
      case PAYWALL_RESULT.ERROR:
        logger.error('[Paywall] Transaction error');
        showError(t('subscription.purchase.error', 'Purchase failed. Please try again.'));
        break;
      default:
        break;
    }
  };

  // Add comprehensive error handlers
  const handlePurchaseError = ({ error }: { error: PurchasesError }) => {
    logger.error('[Paywall] Purchase error:', error as unknown as Error);
    showError(t('subscription.purchase.error', 'Purchase failed. Please try again.'));
  };

  const handlePurchaseStarted = () => {
    logger.debug('[Paywall] Purchase started');
  };

  const handlePurchaseCancelled = () => {
    logger.debug('[Paywall] Purchase cancelled by user');
  };

  const handleRestoreError = ({ error }: { error: PurchasesError }) => {
    logger.error('[Paywall] Restore error:', error as unknown as Error);
    showError(t('subscription.restore.error', 'Restore failed. Please try again.'));
  };

  // Show loading state while offerings are being fetched
  if (isLoading || !isPaywallReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          {t('subscription.paywall.loading', 'Loading subscription options...')}
        </Text>
      </View>
    );
  }

  // Safety check: Don't render paywall if offerings are null
  if (!currentOffering) {
    return (
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {t('subscription.paywall.noOfferings', 'Unable to load subscription options')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RevenueCatUI.Paywall
        onPurchaseStarted={handlePurchaseStarted}
        onPurchaseCompleted={({ customerInfo: _customerInfo }) =>
          handlePaywallResult(PAYWALL_RESULT.PURCHASED)
        }
        onPurchaseError={handlePurchaseError}
        onPurchaseCancelled={handlePurchaseCancelled}
        onRestoreStarted={() => logger.debug('[Paywall] Restore started')}
        onRestoreCompleted={({ customerInfo: _customerInfo }) =>
          handlePaywallResult(PAYWALL_RESULT.RESTORED)
        }
        onRestoreError={handleRestoreError}
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
