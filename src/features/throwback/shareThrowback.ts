import { RefObject } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

import { logger } from '@/utils/debugConfig';

interface ShareThrowbackCardArgs {
  cardRef: RefObject<View | null>;
  fallbackMessage: string;
  dialogTitle: string;
}

/**
 * Target export width. The card can grow vertically for long gratitude text,
 * so height is intentionally left to the rendered view to avoid clipping.
 */
const EXPORT_WIDTH = 1080;

const waitForLayout = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

type ShareMode = 'image' | 'text';

/**
 * Captures the Throwback share card into a PNG and hands it to the native
 * share sheet. Falls back to a text share if the capture, the image share,
 * or the underlying `Sharing` module is unavailable.
 *
 * Resilience details:
 *  - Explicit `width` keeps output crisp while preserving the rendered
 *    card height for long statements.
 *  - One retry after a short layout delay handles the race where the modal
 *    has just mounted and view-shot can't find the node yet.
 *  - The captured temp file is best-effort cleaned up after the share sheet
 *    closes to avoid filling the cache.
 */
export const shareThrowbackCard = async ({
  cardRef,
  fallbackMessage,
  dialogTitle,
}: ShareThrowbackCardArgs): Promise<ShareMode> => {
  const imageUri = await captureWithRetry(cardRef);

  if (imageUri) {
    try {
      const canUseSharing = await Sharing.isAvailableAsync();

      if (canUseSharing) {
        await Sharing.shareAsync(imageUri, {
          dialogTitle,
          mimeType: 'image/png',
          UTI: 'public.png',
        });
        void safeDelete(imageUri);
        return 'image';
      }

      // On platforms where expo-sharing isn't available (web, unusual
      // sandboxes) fall through to the text share so the user still gets a
      // share dialog instead of a silent no-op.
      logger.info('expo-sharing unavailable, falling back to text share');
    } catch (error) {
      logger.warn('Throwback image share failed, falling back to text share', {
        error: error instanceof Error ? error.message : String(error),
      });
      void safeDelete(imageUri);
    }
  }

  await Share.share({
    message: fallbackMessage,
    title: dialogTitle,
  });

  return 'text';
};

const captureWithRetry = async (cardRef: RefObject<View | null>): Promise<string | null> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!cardRef.current) {
      await waitForLayout();
      continue;
    }

    try {
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: EXPORT_WIDTH,
        snapshotContentContainer: true,
      });
      return uri;
    } catch (error) {
      logger.warn(`Throwback capture attempt ${attempt + 1} failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Give the view tree a breath and try once more before giving up.
      await waitForLayout(120);
    }
  }

  return null;
};

const safeDelete = async (uri: string) => {
  // Only clean up local file:// URIs — content:// / ph:// URIs on Android/iOS
  // are managed by the system and must not be touched.
  if (Platform.OS === 'web' || !uri.startsWith('file://')) {
    return;
  }

  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    logger.debug('Failed to clean up throwback share temp file', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
