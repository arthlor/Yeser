import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { createAttachmentSignedUrl } from '@/features/gratitude/mediaApi';
import type { Attachment } from '@/schemas/gratitudeEntrySchema';

interface AttachmentRailProps {
  attachments: Attachment[];
  onRemove?: (attachment: Attachment) => void | Promise<void>;
  compact?: boolean;
}

const THUMBNAIL_SIZE_COMPACT = 160;
const THUMBNAIL_SIZE_FULL = 640;

const formatDuration = (ms: number | null | undefined): string => {
  if (!ms) {
    return '0:00';
  }
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const useAttachmentSignedUrl = (storagePath: string | null | undefined, size?: number) => {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(storagePath));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!storagePath) {
      setUrl(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    createAttachmentSignedUrl(storagePath, size ? { size } : undefined).then((resolved) => {
      if (cancelled) {
        return;
      }
      setUrl(resolved);
      setHasError(!resolved);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [size, storagePath]);

  return { url, isLoading, hasError };
};

const generateWaveformHeights = (id: string | null | undefined, count: number): number[] => {
  const heights: number[] = [];
  let seed = 0;
  if (id) {
    for (let i = 0; i < id.length; i++) {
      seed = (seed << 5) - seed + id.charCodeAt(i);
      seed |= 0;
    }
  } else {
    seed = 42;
  }

  for (let i = 0; i < count; i++) {
    const angle = seed + i * 0.75 + Math.cos(i * 1.3);
    const value = Math.abs(Math.sin(angle));
    heights.push(0.15 + value * 0.8);
  }
  return heights;
};

const ImageAttachmentThumb: React.FC<{
  attachment: Attachment;
  onOpen: () => void;
  onRemove?: () => void;
  size: number;
  theme: AppTheme;
  compact?: boolean;
}> = ({ attachment, onOpen, onRemove, size, theme, compact }) => {
  const { url, isLoading, hasError } = useAttachmentSignedUrl(
    attachment.storage_path,
    compact ? THUMBNAIL_SIZE_COMPACT : THUMBNAIL_SIZE_FULL
  );

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onOpen}
      disabled={!url}
      style={[
        styles.thumbBox,
        compact ? { width: size, height: size } : styles.fullImageThumb,
        { borderColor: theme.colors.outline + '15' },
      ]}
      accessibilityRole="imagebutton"
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={styles.thumbImage}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View
          style={[styles.thumbPlaceholder, { backgroundColor: theme.colors.surfaceVariant + '60' }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
          ) : (
            <Icon
              name={hasError ? 'image-broken-variant' : 'image-outline'}
              size={22}
              color={theme.colors.onSurfaceVariant}
            />
          )}
        </View>
      )}

      <View style={styles.mediaBadge}>
        <Icon name="image-outline" size={11} color="#fff" />
      </View>

      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.removeButton}>
          <Icon name="close" size={12} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
};

const AudioAttachmentCard: React.FC<{
  attachment: Attachment;
  onRemove?: () => void;
  theme: AppTheme;
  compact?: boolean;
  activeAudioId: string | null;
  setActiveAudioId: (id: string | null) => void;
}> = ({ attachment, onRemove, theme, compact, activeAudioId, setActiveAudioId }) => {
  const { t } = useTranslation();
  const { url, isLoading, hasError } = useAttachmentSignedUrl(attachment.storage_path);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status?.playing ?? false;
  const durationSeconds = status?.duration || (attachment.duration_ms ?? 0) / 1000;
  const currentSeconds = status?.currentTime ?? 0;
  const progress = durationSeconds > 0 ? Math.min(1, currentSeconds / durationSeconds) : 0;

  const barCount = compact ? 16 : 24;
  const waveformHeights = useMemo(
    () => generateWaveformHeights(attachment.id, barCount),
    [attachment.id, barCount]
  );

  useEffect(() => {
    if (activeAudioId !== attachment.id && isPlaying) {
      player.pause();
    }
  }, [activeAudioId, attachment.id, isPlaying, player]);

  useEffect(() => {
    if (status?.didJustFinish) {
      setActiveAudioId(null);
      void player.seekTo(0);
    }
  }, [player, setActiveAudioId, status?.didJustFinish]);

  const toggle = useCallback(() => {
    if (!player || !url || hasError) {
      return;
    }

    if (isPlaying) {
      player.pause();
      setActiveAudioId(null);
      return;
    }

    setActiveAudioId(attachment.id);
    player.play();
  }, [attachment.id, hasError, isPlaying, player, setActiveAudioId, url]);

  const label = useMemo(() => {
    const total = formatDuration(Math.max(durationSeconds * 1000, attachment.duration_ms ?? 0));
    if (isPlaying) {
      return `${formatDuration(currentSeconds * 1000)} / ${total}`;
    }
    return total;
  }, [attachment.duration_ms, currentSeconds, durationSeconds, isPlaying]);

  return (
    <Pressable
      onPress={toggle}
      disabled={!url || hasError}
      style={({ pressed }) => [
        styles.audioCard,
        compact && styles.audioCardCompact,
        {
          backgroundColor:
            theme.name === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
          borderColor: theme.colors.outline + '15',
          opacity: !url || hasError ? 0.68 : pressed ? 0.86 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.audioIcon,
          compact && styles.audioIconCompact,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.onPrimary} />
        ) : (
          <Icon
            name={hasError ? 'alert-circle-outline' : isPlaying ? 'pause' : 'play'}
            size={compact ? 16 : 18}
            color={theme.colors.onPrimary}
          />
        )}
      </View>

      <View style={styles.audioCopy}>
        <View style={styles.audioHeaderRow}>
          <Text style={[styles.audioTitle, { color: theme.colors.onSurface }]}>
            {hasError
              ? t('gratitude.attachments.audioUnavailable', {
                  defaultValue: 'Voice note unavailable',
                })
              : t('gratitude.attachments.voiceNote', { defaultValue: 'Voice note' })}
          </Text>
          <Text style={[styles.audioLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        </View>

        <View style={styles.waveformContainer}>
          {waveformHeights.map((heightVal, idx) => {
            const barProgress = idx / waveformHeights.length;
            const isActive = progress >= barProgress;

            return (
              <View
                key={idx}
                style={[
                  styles.waveformBar,
                  {
                    height: heightVal * (compact ? 20 : 28),
                    backgroundColor: isActive ? theme.colors.primary : theme.colors.primary + '22',
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.audioRemoveButton}>
          <Icon name="close" size={16} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );
};

const AttachmentRail: React.FC<AttachmentRailProps> = ({ attachments, onRemove, compact }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const images = useMemo(() => attachments.filter((item) => item.kind === 'image'), [attachments]);
  const audios = useMemo(() => attachments.filter((item) => item.kind === 'audio'), [attachments]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedImageId) ?? null,
    [images, selectedImageId]
  );

  const { url: selectedImageUrl, isLoading: isSelectedImageLoading } = useAttachmentSignedUrl(
    selectedImage?.storage_path
  );

  const selectedIndex = selectedImage
    ? Math.max(
        0,
        images.findIndex((image) => image.id === selectedImage.id)
      )
    : -1;
  const size = compact ? 64 : 96;

  const moveSelectedImage = useCallback(
    (direction: -1 | 1) => {
      if (!selectedImage || images.length <= 1) {
        return;
      }
      const nextIndex = (selectedIndex + direction + images.length) % images.length;
      setSelectedImageId(images[nextIndex]?.id ?? null);
    },
    [images, selectedImage, selectedIndex]
  );

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        {/* Render Images Section */}
        {images.length > 0 && (
          <View style={[styles.imagesContainer, { gap: theme.spacing.sm }]}>
            {images.map((image) => (
              <ImageAttachmentThumb
                key={image.id}
                attachment={image}
                size={size}
                theme={theme}
                compact={compact}
                onOpen={() => setSelectedImageId(image.id)}
                onRemove={onRemove ? () => onRemove(image) : undefined}
              />
            ))}
          </View>
        )}

        {/* Render Audio/Voice Notes Section */}
        {audios.length > 0 && (
          <View style={[styles.audiosContainer, { gap: theme.spacing.sm }]}>
            {audios.map((audio) => (
              <AudioAttachmentCard
                key={audio.id}
                attachment={audio}
                theme={theme}
                compact={compact}
                activeAudioId={activeAudioId}
                setActiveAudioId={setActiveAudioId}
                onRemove={onRemove ? () => onRemove(audio) : undefined}
              />
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={Boolean(selectedImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImageId(null)}
      >
        <View style={styles.modalBackground}>
          <View style={[styles.modalTopBar, { top: Math.max(insets.top, 24) }]}>
            <Text style={styles.modalCounter}>
              {selectedIndex >= 0 ? `${selectedIndex + 1}/${images.length}` : ''}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedImageId(null)}
              hitSlop={12}
              accessibilityRole="button"
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {isSelectedImageLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : selectedImageUrl ? (
            <Image
              source={{ uri: selectedImageUrl }}
              style={styles.modalImage}
              contentFit="contain"
            />
          ) : (
            <View style={styles.modalError}>
              <Icon name="image-broken-variant" size={32} color="#fff" />
              <Text style={styles.modalErrorText}>
                {t('gratitude.attachments.imageUnavailable', {
                  defaultValue: 'Image unavailable',
                })}
              </Text>
            </View>
          )}

          {images.length > 1 ? (
            <View style={[styles.modalNavRow, { bottom: Math.max(insets.bottom, 24) }]}>
              <TouchableOpacity style={styles.modalNavButton} onPress={() => moveSelectedImage(-1)}>
                <Icon name="chevron-left" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalNavButton} onPress={() => moveSelectedImage(1)}>
                <Icon name="chevron-right" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
    paddingTop: 6,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  audiosContainer: {
    flexDirection: 'column',
    width: '100%',
    marginTop: 6,
  },
  thumbBox: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    position: 'relative',
  },
  fullImageThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  audioCard: {
    alignSelf: 'flex-start',
    minWidth: 240,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  audioCardCompact: {
    minWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  audioIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  audioIconCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  audioCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  audioHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
    gap: 12,
  },
  audioTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  audioLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    opacity: 0.75,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    gap: 3,
    paddingRight: 4,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 1.5,
    minHeight: 4,
  },
  audioRemoveButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTopBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCounter: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    opacity: 0.82,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 22,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalError: {
    alignItems: 'center',
    gap: 10,
  },
  modalErrorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalNavRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

export default AttachmentRail;
