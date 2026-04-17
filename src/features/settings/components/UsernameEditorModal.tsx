import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { useUsernameValidation } from '@/shared/hooks';
import { ThemedButton, ThemedInput } from '@/shared/components/ui';
import type { AppTheme } from '@/themes/types';
import { getPrimaryShadow } from '@/themes/utils';

interface UsernameEditorModalProps {
  visible: boolean;
  currentUsername?: string | null;
  onClose: () => void;
  onSave: (username: string) => Promise<void>;
}

const normalizeUsername = (value: string): string => value.trim().toLocaleLowerCase('tr-TR');

const UsernameEditorModal: React.FC<UsernameEditorModalProps> = ({
  visible,
  currentUsername,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [draftUsername, setDraftUsername] = useState(currentUsername ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(visible);

  const scaleValue = useRef(new Animated.Value(0.95)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  const {
    isChecking,
    isAvailable,
    error: validationError,
    checkUsername,
  } = useUsernameValidation(currentUsername);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      const initialValue = currentUsername ?? '';
      setDraftUsername(initialValue);
      checkUsername(initialValue);

      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
        Animated.timing(opacityValue, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(opacityValue, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => {
          setModalVisible(false);
        }
      );
    }
  }, [visible, currentUsername, checkUsername, opacityValue, scaleValue]);

  const trimmedUsername = draftUsername.trim();
  const isUnchanged =
    normalizeUsername(trimmedUsername) === normalizeUsername(currentUsername ?? '') &&
    trimmedUsername.length > 0;
  const canSave =
    trimmedUsername.length >= 3 &&
    !isUnchanged &&
    !validationError &&
    !isChecking &&
    isAvailable === true;

  const handleSave = async () => {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(trimmedUsername);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal transparent visible={modalVisible} animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
          <Animated.View style={[styles.scrim, { opacity: opacityValue }]} />
        </TouchableOpacity>

        <Animated.View
          style={[styles.modalCard, { opacity: opacityValue, transform: [{ scale: scaleValue }] }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: theme.colors.primaryContainer + 'CC' },
                ]}
              >
                <Icon name="account-edit-outline" size={22} color={theme.colors.primary} />
              </View>
              <Text style={styles.title}>
                {t('settings.user.usernameEditTitle', { defaultValue: 'Edit username' })}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Icon name="close" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <ThemedInput
              value={draftUsername}
              onChangeText={(value) => {
                setDraftUsername(value);
                checkUsername(value);
              }}
              label={t('settings.user.usernameTitle')}
              placeholder={t('settings.user.usernamePlaceholder', {
                defaultValue: 'Choose a username',
              })}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
              leftIcon="at"
              showClearButton
              onClear={() => {
                setDraftUsername('');
                checkUsername('');
              }}
              errorText={validationError || undefined}
              helperText={
                !validationError && isUnchanged
                  ? t('settings.user.usernameUnchanged', {
                      defaultValue: 'Enter a different username to save changes.',
                    })
                  : !validationError && isAvailable === true && trimmedUsername.length >= 3
                    ? t('settings.user.usernameAvailable', {
                        defaultValue: 'This username is available.',
                      })
                    : t('settings.user.usernameHint', {
                        defaultValue: 'Use 3 to 50 characters. Letters and numbers work best.',
                      })
              }
              validationState={
                validationError
                  ? 'error'
                  : isAvailable === true && trimmedUsername.length >= 3
                    ? 'success'
                    : 'default'
              }
              accessibilityLabel={t('settings.user.usernameModalA11y', {
                defaultValue: 'Username editor',
              })}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelLink} activeOpacity={0.6}>
              <Text style={styles.cancelLinkLabel}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <ThemedButton
              title={
                isSaving
                  ? t('settings.user.usernameSaving', { defaultValue: 'Saving...' })
                  : t('common.save', { defaultValue: 'Save' })
              }
              onPress={() => void handleSave()}
              disabled={!canSave || isSaving}
              variant="primary"
              size="standard"
              style={[
                styles.saveButton,
                !canSave && !isSaving && { backgroundColor: theme.colors.primary + '20' },
              ]}
              textStyle={
                !canSave && !isSaving ? styles.saveButtonDisabledText : styles.saveButtonText
              }
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.scrim + 'B3', // 70% opacity dark scrim
    },
    modalCard: {
      width: '88%',
      maxWidth: 420,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xxl || 28,
      borderWidth: 1,
      borderColor: theme.colors.outlineVariant + '33',
      overflow: 'hidden',
      ...getPrimaryShadow.overlay(theme),
      padding: theme.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      ...theme.typography.titleLarge,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant + '60',
    },
    body: {
      marginBottom: theme.spacing.lg,
      paddingHorizontal: 4,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: theme.spacing.sm,
    },
    cancelLink: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    cancelLinkLabel: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
    },
    saveButton: {
      minWidth: 120,
      borderRadius: theme.borderRadius.lg,
      ...getPrimaryShadow.small(theme),
    },
    saveButtonText: {
      fontWeight: '700',
    },
    saveButtonDisabledText: {
      color: theme.colors.primary + '60',
    },
  });

export default UsernameEditorModal;
