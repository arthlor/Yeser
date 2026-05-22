import { useCallback, useMemo, useState } from 'react';

import type { PickedImage } from '@/features/gratitude/components/AttachmentPicker';

export interface PendingAudio {
  uri: string;
  mimeType: string;
  bytes: number;
  durationMs: number;
}

export interface PendingAttachments {
  image: PickedImage | null;
  audio: PendingAudio | null;
}

export const usePendingAttachments = () => {
  const [pendingImage, setPendingImage] = useState<PickedImage | null>(null);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);

  const pendingAttachments = useMemo<PendingAttachments>(
    () => ({
      image: pendingImage,
      audio: pendingAudio,
    }),
    [pendingAudio, pendingImage]
  );

  const clearPendingAttachments = useCallback(() => {
    setPendingImage(null);
    setPendingAudio(null);
  }, []);

  return {
    pendingImage,
    pendingAudio,
    pendingAttachments,
    hasPendingAttachments: Boolean(pendingImage || pendingAudio),
    setPendingImage,
    setPendingAudio,
    clearPendingAttachments,
  };
};
