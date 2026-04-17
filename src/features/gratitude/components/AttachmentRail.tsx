import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { createAttachmentSignedUrl } from '@/features/gratitude/mediaApi';
import type { Attachment } from '@/schemas/gratitudeEntrySchema';

interface AttachmentRailProps {
  attachments: Attachment[];
  onRemove?: (attachment: Attachment) => void | Promise<void>;
  compact?: boolean;
}

const formatDuration = (ms: number | null | undefined): string => {
  if (!ms) {
    return '0:00';
  }
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ImageAttachmentThumb: React.FC<{
  attachment: Attachment;
  onRemove?: () => void;
  size: number;
  theme: AppTheme;
}> = ({ attachment, onRemove, size, theme }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createAttachmentSignedUrl(attachment.storage_path, { size }).then((resolved) => {
      if (!cancelled) {
        setUrl(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.storage_path, size]);

  return (
    <View style={[styles.thumbBox, { width: size, height: size }]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={styles.thumbImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[styles.thumbPlaceholder, { backgroundColor: theme.colors.surfaceVariant + '60' }]}
        >
          <ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
        </View>
      )}
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={8} style={styles.removeButton}>
          <Icon name="close" size={14} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const AudioAttachmentPill: React.FC<{
  attachment: Attachment;
  onRemove?: () => void;
  theme: AppTheme;
}> = ({ attachment, onRemove, theme }) => {
  const [url, setUrl] = useState<string | null>(null);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let cancelled = false;
    createAttachmentSignedUrl(attachment.storage_path).then((resolved) => {
      if (!cancelled) {
        setUrl(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attachment.storage_path]);

  const isPlaying = status?.playing ?? false;

  const toggle = () => {
    if (!player || !url) {
      return;
    }
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const label = useMemo(() => {
    const total = formatDuration(attachment.duration_ms);
    if (isPlaying && status?.currentTime) {
      return `${formatDuration(status.currentTime * 1000)} / ${total}`;
    }
    return total;
  }, [attachment.duration_ms, isPlaying, status?.currentTime]);

  return (
    <Pressable
      onPress={toggle}
      disabled={!url}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: theme.colors.primaryContainer,
          opacity: !url ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {url ? (
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={18}
          color={theme.colors.onPrimaryContainer}
        />
      ) : (
        <ActivityIndicator size="small" color={theme.colors.onPrimaryContainer} />
      )}
      <Text style={[styles.audioLabel, { color: theme.colors.onPrimaryContainer }]}>{label}</Text>
      {onRemove ? (
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Icon name="close" size={16} color={theme.colors.onPrimaryContainer} />
        </TouchableOpacity>
      ) : null}
    </Pressable>
  );
};

const AttachmentRail: React.FC<AttachmentRailProps> = ({ attachments, onRemove, compact }) => {
  const { theme } = useTheme();

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const size = compact ? 64 : 96;

  return (
    <View style={[styles.container, { gap: theme.spacing.sm }]}>
      {attachments.map((a) =>
        a.kind === 'image' ? (
          <ImageAttachmentThumb
            key={a.id}
            attachment={a}
            size={size}
            theme={theme}
            onRemove={onRemove ? () => onRemove(a) : undefined}
          />
        ) : (
          <AudioAttachmentPill
            key={a.id}
            attachment={a}
            theme={theme}
            onRemove={onRemove ? () => onRemove(a) : undefined}
          />
        )
      )}
    </View>
  );
};

const OVERLAY_BG = 'rgba(0,0,0,0.55)';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingTop: 8,
  },
  thumbBox: {
    borderRadius: 12,
    overflow: 'hidden',
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
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: OVERLAY_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioLabel: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

export default AttachmentRail;
