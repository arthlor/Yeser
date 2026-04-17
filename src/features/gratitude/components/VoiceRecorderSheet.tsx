import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import type { AppTheme } from '@/themes/types';
import { ATTACHMENT_LIMITS } from '@/features/gratitude/mediaApi';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { logger } from '@/utils/debugConfig';

interface VoiceRecorderSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: {
    uri: string;
    mimeType: string;
    bytes: number;
    durationMs: number;
  }) => void | Promise<void>;
}

const MAX_MS = ATTACHMENT_LIMITS.audio.maxDurationMs;

const formatElapsed = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const VoiceRecorderSheet: React.FC<VoiceRecorderSheetProps> = ({ visible, onClose, onSave }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDurationMs, setRecordedDurationMs] = useState<number>(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setRecordedUri(null);
    setRecordedDurationMs(0);
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible, reset]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    (async () => {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          setPermissionDenied(true);
          return;
        }
        setPermissionDenied(false);
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
      } catch (err) {
        logger.error('VoiceRecorderSheet permission/setup failed', err as Error);
      }
    })();
  }, [visible]);

  const startRecording = useCallback(async () => {
    try {
      hapticFeedback.medium();
      setIsBusy(true);
      await recorder.prepareToRecordAsync();
      recorder.record();
      autoStopRef.current = setTimeout(() => {
        void stopRecording();
      }, MAX_MS + 250);
    } catch (err) {
      logger.error('startRecording failed', err as Error);
    } finally {
      setIsBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      setIsBusy(true);
      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }
      await recorder.stop();
      const uri = recorder.uri;
      const duration = Math.min(recorderState.durationMillis ?? 0, MAX_MS);
      if (uri) {
        setRecordedUri(uri);
        setRecordedDurationMs(duration);
      }
      hapticFeedback.light();
    } catch (err) {
      logger.error('stopRecording failed', err as Error);
    } finally {
      setIsBusy(false);
    }
  }, [recorder, recorderState.durationMillis]);

  const save = useCallback(async () => {
    if (!recordedUri) {
      return;
    }
    try {
      setIsBusy(true);
      const info = await FileSystem.getInfoAsync(recordedUri, { size: true });
      const bytes = info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
      await onSave({
        uri: recordedUri,
        mimeType: 'audio/m4a',
        bytes,
        durationMs: recordedDurationMs,
      });
      onClose();
    } catch (err) {
      logger.error('VoiceRecorderSheet save failed', err as Error);
    } finally {
      setIsBusy(false);
    }
  }, [onClose, onSave, recordedDurationMs, recordedUri]);

  const isRecording = recorderState.isRecording;
  const elapsedMs = Math.min(recorderState.durationMillis ?? 0, MAX_MS);
  const progress = Math.min(1, elapsedMs / MAX_MS);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {recordedUri
              ? t('gratitude.voiceRecorder.title.review', 'Review your voice note')
              : t('gratitude.voiceRecorder.title.record', 'Record a voice note')}
          </Text>
          <Text style={styles.subtitle}>
            {t('gratitude.voiceRecorder.subtitle', 'Up to {{seconds}}s', {
              seconds: Math.round(MAX_MS / 1000),
            })}
          </Text>

          {permissionDenied ? (
            <View style={styles.deniedBlock}>
              <Icon name="microphone-off" size={32} color={theme.colors.error} />
              <Text style={styles.deniedText}>
                {t(
                  'gratitude.voiceRecorder.permissionDenied',
                  'Microphone permission denied. Enable it in system settings to record.'
                )}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.timerBlock}>
                <Text style={styles.timer}>{formatElapsed(elapsedMs)}</Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress * 100}%`,
                        backgroundColor: isRecording ? theme.colors.error : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.controlsRow}>
                {!recordedUri ? (
                  <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isBusy}
                    style={[
                      styles.recordBtn,
                      {
                        backgroundColor: isRecording
                          ? theme.colors.errorContainer
                          : theme.colors.primary,
                      },
                    ]}
                  >
                    {isBusy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Icon
                        name={isRecording ? 'stop' : 'microphone'}
                        size={32}
                        color={isRecording ? theme.colors.onErrorContainer : theme.colors.onPrimary}
                      />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.reviewRow}>
                    <TouchableOpacity onPress={reset} style={styles.secondaryBtn}>
                      <Icon name="refresh" size={20} color={theme.colors.onSurface} />
                      <Text style={styles.secondaryText}>
                        {t('gratitude.voiceRecorder.rerecord', 'Re-record')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={save}
                      disabled={isBusy}
                      style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                    >
                      {isBusy ? (
                        <ActivityIndicator color={theme.colors.onPrimary} />
                      ) : (
                        <>
                          <Icon name="check" size={20} color={theme.colors.onPrimary} />
                          <Text style={styles.primaryText}>
                            {t('gratitude.voiceRecorder.attach', 'Attach')}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeText}>{t('gratitude.voiceRecorder.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.lg,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outline + '40',
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: -theme.spacing.sm,
    },
    timerBlock: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    timer: {
      ...theme.typography.displaySmall,
      color: theme.colors.onSurface,
      fontVariant: ['tabular-nums'],
    },
    progressTrack: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.outline + '25',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    controlsRow: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordBtn: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reviewRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surfaceVariant,
    },
    secondaryText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
    },
    primaryText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    deniedBlock: {
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.lg,
    },
    deniedText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
    closeBtn: {
      alignSelf: 'center',
      paddingVertical: theme.spacing.sm,
    },
    closeText: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurfaceVariant,
    },
  });

export default VoiceRecorderSheet;
