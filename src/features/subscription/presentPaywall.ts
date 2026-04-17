import { Keyboard, Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useSubscriptionStore } from '@/store/subscriptionStore';
import { analyticsService } from '@/services/analyticsService';
import { logger } from '@/utils/debugConfig';

// iOS needs a brief window for the keyboard-hide animation to finish before we
// push a new UIViewController onto the stack; otherwise the paywall is pushed
// while the keyboard is still animating down which can leave the hero/video
// area improperly sized during the paywall's first layout pass.
const KEYBOARD_DISMISS_DELAY_MS = Platform.OS === 'ios' ? 220 : 0;

const delay = (ms: number) =>
  ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * Present the RevenueCat paywall as a **native modal UIViewController**.
 *
 * We intentionally avoid the embedded `<RevenueCatUI.Paywall />` component
 * because, when the paywall is hosted inside React Native's view tree, the
 * SwiftUI `AVPlayer` that powers the hero/video slot does not reliably start
 * playback — you get a black area where the video should be. The imperative
 * `presentPaywall()` API pushes a fully-native modal, which matches how
 * RevenueCat designed and tested V2 paywalls: videos, animations and layout
 * all work out-of-the-box.
 *
 * We deliberately do NOT pass the offering we cached in the Zustand store.
 * Passing a cached `PurchasesOffering` forces the native SDK to render the
 * paywall attached to *that specific* offering identifier, which can diverge
 * from the "current" paywall the RevenueCat dashboard is serving (e.g. when
 * the dashboard was re-targeted to a different offering, or when the cached
 * JSON is stale and does not include newly-added components like a video
 * slot). Letting `presentPaywall()` resolve the current paywall itself makes
 * it match the "Preview in app" flow of the dashboard 1:1.
 *
 * This function is safe to fire-and-forget. Callers that need to wait for the
 * result (e.g. onboarding steps) can `await` it.
 */
export async function presentNativePaywall(source?: string): Promise<PAYWALL_RESULT | null> {
  const state = useSubscriptionStore.getState();
  const { isPro, checkStatus } = state;

  if (isPro) {
    return PAYWALL_RESULT.NOT_PRESENTED;
  }

  // Release first responder on whatever text input is focused so the modal
  // isn't presented over a still-visible keyboard.
  Keyboard.dismiss();
  await delay(KEYBOARD_DISMISS_DELAY_MS);

  // Force a fresh offerings fetch so the native SDK has the latest paywall
  // JSON (including any recently-added video component) warm in its cache
  // before we present. Without this, a long-lived app session can show a
  // stale paywall that was fetched at launch, pre-video-edit.
  let currentOfferingIdentifier: string | null = null;
  try {
    const offerings = await Purchases.getOfferings();
    currentOfferingIdentifier = offerings.current?.identifier ?? null;
    logger.debug('[presentNativePaywall] Refreshed offerings before present', {
      currentOfferingIdentifier,
      hasCurrentPaywall: Boolean(offerings.current),
    });
  } catch (error) {
    logger.warn('[presentNativePaywall] Could not refresh offerings, continuing anyway', {
      error: (error as Error).message,
    });
  }

  try {
    analyticsService.logEvent('paywall_presented', {
      source: source ?? 'unknown',
      offeringIdentifier: currentOfferingIdentifier,
    });

    logger.debug('[presentNativePaywall] Presenting', {
      source,
      currentOfferingIdentifier,
    });

    // Pass `displayCloseButton` only. Omitting `offering` lets the native
    // layer use `offerings.current` — the same resolution path the dashboard
    // "Preview in app" flow uses — so the video component renders reliably.
    const result = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
    });

    logger.debug('[presentNativePaywall] Result', { source, result });

    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      try {
        await checkStatus();
      } catch (error) {
        logger.warn('[presentNativePaywall] checkStatus after purchase failed', {
          error: error as Error,
        });
      }
    }

    analyticsService.logEvent('paywall_dismissed', {
      source: source ?? 'unknown',
      result,
    });

    return result;
  } catch (error) {
    logger.error('[presentNativePaywall] Failed to present paywall:', error as Error);
    return null;
  }
}
