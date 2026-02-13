import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Notifications from 'expo-notifications';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useUserProfile } from '@/shared/hooks';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { notificationService } from '@/services/notificationService';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';
import { UpdateProfilePayload } from '@/schemas/profileSchema';

const FIRST_REMINDER_TIME = '12:30';
const SECOND_REMINDER_TIME = '21:00';
const REMINDER_TIME_PRESETS = ['08:00', '12:30', '18:00', '21:00'] as const;

const normalizeReminderTime = (raw: string | null | undefined): string => {
  if (!raw) {
    return FIRST_REMINDER_TIME;
  }

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return FIRST_REMINDER_TIME;
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return FIRST_REMINDER_TIME;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/**
 * NotificationSettings
 * Renders instantly from profile state, then syncs permissions/tokens in the background.
 */
export const NotificationSettings: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { profile, updateProfile } = useUserProfile();
  const { handleMutationError } = useGlobalError();
  const { showError: showToastError, showSuccess: showToastSuccess } = useToast();

  const hasNotificationPreference = Boolean(profile?.notification_time);
  const selectedReminderTime = useMemo(
    () => normalizeReminderTime(profile?.notification_time),
    [profile?.notification_time]
  );

  const [isEnabled, setIsEnabled] = useState(hasNotificationPreference);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isMountedRef = useRef(true);
  const operationInProgressRef = useRef(false);
  const hasSyncedRef = useRef(false);

  const updateProfileAsync = useCallback(
    (payload: UpdateProfilePayload): Promise<void> =>
      new Promise((resolve, reject) => {
        updateProfile(payload, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      }),
    [updateProfile]
  );

  useEffect(() => {
    if (profile?.notification_time !== undefined) {
      setIsEnabled(Boolean(profile.notification_time));
    }
  }, [profile?.notification_time]);

  // Background sync - runs once without blocking UI
  useEffect(() => {
    if (hasSyncedRef.current) {
      return;
    }

    let isCancelled = false;

    const syncInBackground = async () => {
      if (operationInProgressRef.current || !isMountedRef.current) {
        return;
      }

      hasSyncedRef.current = true;
      setIsSyncing(true);

      try {
        const currentToken = await notificationService.getCurrentDevicePushToken();
        if (!isCancelled && isMountedRef.current && currentToken) {
          setPushToken(currentToken);
        }

        const permissions = await Notifications.getPermissionsAsync();
        if (isCancelled || !isMountedRef.current) {
          return;
        }

        const hasBackendPreference = Boolean(profile?.notification_time);
        const isPermissionGranted =
          permissions.granted || (permissions.status as string) === 'provisional';

        if (hasBackendPreference && isPermissionGranted) {
          await notificationService.scheduleDailyReminderNotifications(profile?.notification_time);
        } else if (hasBackendPreference && !isPermissionGranted) {
          if (isMountedRef.current) {
            setIsEnabled(false);
          }
          await notificationService.cancelDailyReminderNotifications();
        } else if (!hasBackendPreference) {
          await notificationService.cancelDailyReminderNotifications();
        }
      } catch (error) {
        if (!isCancelled && isMountedRef.current) {
          logger.error('Error in notification sync:', error as Error);
        }
      } finally {
        if (!isCancelled && isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    };

    void syncInBackground();

    return () => {
      isCancelled = true;
    };
  }, [profile?.notification_time]);

  const enableNotifications = useCallback(async () => {
    if (operationInProgressRef.current || !isMountedRef.current) {
      return;
    }

    operationInProgressRef.current = true;
    setIsLoading(true);

    try {
      let token = pushToken;
      if (!token) {
        const result = await notificationService.registerForPushNotificationsAsync();

        if (!result.token) {
          if (result.status === 'denied' && result.canAskAgain === false) {
            showToastError(t('notifications.permissionRequiredMessage'));
            notificationService.showNotificationPermissionGuidance(false);
          } else if (result.status === 'denied') {
            showToastError(
              t('notifications.errors.permissionDenied', {
                defaultValue: 'Notification permission is required to enable reminders.',
              })
            );
            notificationService.showNotificationPermissionGuidance(true);
          } else {
            showToastError(
              t('notifications.errors.enableFailed', {
                defaultValue: 'Could not enable notifications. Please try again.',
              })
            );
          }
          throw new Error('Permission not granted');
        }

        token = result.token;
        if (isMountedRef.current) {
          setPushToken(token);
        }
      }

      const saveResult = await notificationService.saveTokenToBackend(token);
      if (!saveResult.ok) {
        logger.error('Failed to save push token:', saveResult.error);
        showToastError(
          t('notifications.errors.enableFailed', {
            defaultValue: 'Could not enable notifications. Please try again.',
          })
        );
        throw saveResult.error ?? new Error('Failed to save push token');
      }

      const preferenceResult = await notificationService.setNotificationsEnabled(true);
      if (!preferenceResult.ok) {
        logger.error('Failed to enable notifications:', preferenceResult.error);
        showToastError(
          t('notifications.errors.enableFailed', {
            defaultValue: 'Could not enable notifications. Please try again.',
          })
        );
        throw preferenceResult.error ?? new Error('Failed to enable notifications');
      }

      if (isMountedRef.current) {
        showToastSuccess(t('onboarding.notifications.statusSuccess'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      operationInProgressRef.current = false;
    }
  }, [pushToken, showToastError, showToastSuccess, t]);

  const disableNotifications = useCallback(async () => {
    if (operationInProgressRef.current || !isMountedRef.current) {
      return;
    }

    operationInProgressRef.current = true;
    setIsLoading(true);

    try {
      if (pushToken) {
        const removalResult = await notificationService.removeTokenFromBackend(pushToken);
        if (!removalResult.ok) {
          logger.warn('Failed to remove push token when disabling notifications', {
            error: removalResult.error?.message,
          });
        }
      }

      const preferenceResult = await notificationService.setNotificationsEnabled(false);
      if (!preferenceResult.ok) {
        logger.error('Failed to disable notifications:', preferenceResult.error);
        showToastError(
          t('notifications.errors.disableFailed', {
            defaultValue: 'Could not disable notifications. Please try again.',
          })
        );
        throw preferenceResult.error ?? new Error('Failed to disable notifications');
      }

      if (isMountedRef.current) {
        showToastSuccess(t('notifications.maybeLater'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      operationInProgressRef.current = false;
    }
  }, [pushToken, showToastSuccess, showToastError, t]);

  const handleToggleSwitch = useCallback(
    async (isOn: boolean) => {
      if (operationInProgressRef.current || isLoading || !isMountedRef.current) {
        return;
      }

      const previousState = isEnabled;

      if (isOn) {
        setIsEnabled(true);
        const permissions = await Notifications.getPermissionsAsync();

        if (!permissions.granted && permissions.canAskAgain) {
          notificationService.showNotificationPermissionGuidance(true, (granted) => {
            if (!isMountedRef.current) {
              return;
            }
            if (granted) {
              enableNotifications().catch((error) => {
                if (!isMountedRef.current) {
                  return;
                }
                setIsEnabled(previousState);
                if ((error as Error).message !== 'Permission not granted') {
                  handleMutationError(error, 'notification settings');
                }
              });
            } else {
              setIsEnabled(false);
            }
          });
          return;
        }

        if (!permissions.granted && !permissions.canAskAgain) {
          showToastError(t('notifications.permissionRequiredMessage'));
          notificationService.showNotificationPermissionGuidance(false);
          setIsEnabled(false);
          return;
        }

        try {
          await enableNotifications();
        } catch (error) {
          if (isMountedRef.current) {
            setIsEnabled(previousState);
            if ((error as Error).message !== 'Permission not granted') {
              handleMutationError(error, 'notification settings');
            }
          }
        }
        return;
      }

      setIsEnabled(false);
      try {
        await disableNotifications();
      } catch (error) {
        if (isMountedRef.current) {
          setIsEnabled(previousState);
          handleMutationError(error, 'notification settings');
        }
      }
    },
    [
      isEnabled,
      isLoading,
      enableNotifications,
      disableNotifications,
      showToastError,
      handleMutationError,
      t,
    ]
  );

  const handleReminderTimeSelect = useCallback(
    async (time: string) => {
      if (operationInProgressRef.current || isLoading || isSyncing || !isMountedRef.current) {
        return;
      }

      if (time === selectedReminderTime) {
        return;
      }

      setIsSyncing(true);

      try {
        await updateProfileAsync({ notification_time: `${time}:00` });

        if (isEnabled) {
          const scheduleResult = await notificationService.scheduleDailyReminderNotifications(
            `${time}:00`
          );
          if (!scheduleResult.ok) {
            throw scheduleResult.error ?? new Error('Failed to reschedule reminder notifications');
          }
        }

        showToastSuccess(
          t('notifications.timeUpdatedSuccess', {
            defaultValue: 'Reminder time updated to {{time}}.',
            time,
          })
        );
      } catch (error) {
        showToastError(
          t('notifications.errors.timeUpdateFailed', {
            defaultValue: 'Could not update reminder time. Please try again.',
          })
        );
        handleMutationError(error, 'update notification reminder time');
      } finally {
        if (isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [
      isEnabled,
      isLoading,
      isSyncing,
      selectedReminderTime,
      showToastError,
      showToastSuccess,
      handleMutationError,
      t,
      updateProfileAsync,
    ]
  );

  const scheduleDescription = useMemo(
    () =>
      t('notifications.fixedScheduleDescription', {
        firstTime: selectedReminderTime,
        secondTime: SECOND_REMINDER_TIME,
      }),
    [selectedReminderTime, t]
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <View>
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View style={styles.iconContainer}>
            <Icon name="bell-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>{t('onboarding.notifications.title')}</Text>
            <Text style={styles.settingDescription}>{t('onboarding.notifications.info')}</Text>
          </View>
        </View>
        <View style={styles.toggleContainer}>
          {(isLoading || isSyncing) && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.loadingIndicator}
            />
          )}
          <ToggleSwitch
            isOn={isEnabled}
            onColor={theme.colors.primary}
            offColor={theme.colors.outline}
            size="medium"
            onToggle={handleToggleSwitch}
            animationSpeed={200}
            disabled={isLoading || isSyncing}
          />
        </View>
      </View>

      {isEnabled && (
        <>
          <View style={styles.divider} />
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleIconContainer}>
              <Icon name="clock-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.scheduleTextContainer}>
              <Text style={styles.scheduleTitle}>{t('notifications.remindersLabel')}</Text>
              <Text style={styles.scheduleDescription}>{scheduleDescription}</Text>
              <Text style={styles.timeSelectionTitle}>
                {t('notifications.reminderTimeTitle', { defaultValue: 'Primary reminder time' })}
              </Text>
              <View style={styles.timeChipRow}>
                {REMINDER_TIME_PRESETS.map((time) => {
                  const isSelected = selectedReminderTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                      onPress={() => void handleReminderTimeSelect(time)}
                      disabled={isLoading || isSyncing}
                      accessibilityRole="button"
                      accessibilityLabel={t('notifications.reminderTimeA11y', {
                        defaultValue: 'Set reminder time to {{time}}',
                        time,
                      })}
                      accessibilityState={{
                        selected: isSelected,
                        disabled: isLoading || isSyncing,
                      }}
                    >
                      <Text
                        style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    textContainer: {
      flex: 1,
    },
    settingTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
    },
    settingDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingIndicator: {
      marginRight: theme.spacing.sm,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '15',
      marginLeft: theme.spacing.md + 32 + theme.spacing.sm,
    },
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    scheduleIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    scheduleTextContainer: {
      flex: 1,
    },
    scheduleTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
    },
    scheduleDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
      marginBottom: theme.spacing.sm,
    },
    timeSelectionTitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    timeChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    timeChip: {
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.outline + '40',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.surface,
    },
    timeChipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryContainer,
    },
    timeChipText: {
      ...theme.typography.labelSmall,
      color: theme.colors.onSurface,
      fontWeight: '700',
    },
    timeChipTextSelected: {
      color: theme.colors.onPrimaryContainer,
    },
  });
