import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Notifications from 'expo-notifications';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useUserProfile } from '@/shared/hooks';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { notificationService } from '@/services/notificationService';
import LoadingState from '@/components/states/LoadingState';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

const FIRST_REMINDER_TIME = '12:30';
const SECOND_REMINDER_TIME = '21:00';

export const NotificationSettings: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { profile } = useUserProfile();
  const { handleMutationError } = useGlobalError();
  const { showError: showToastError, showSuccess: showToastSuccess } = useToast();

  const [isEnabled, setIsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Refs for cleanup and race condition prevention
  const isMountedRef = useRef(true);
  const operationInProgressRef = useRef(false);
  const hasSyncedPermissionMismatchRef = useRef(false);

  // Effect to get the current push token on mount with proper cleanup
  useEffect(() => {
    let isCancelled = false;

    const fetchToken = async (): Promise<void> => {
      try {
        const token = await notificationService.getCurrentDevicePushToken();
        if (!isCancelled && isMountedRef.current) {
          setPushToken(token);
        }
      } catch (error) {
        if (!isCancelled && isMountedRef.current) {
          logger.warn('Could not get push token on initial load.', { error });
        }
      }
    };

    void fetchToken();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Effect to sync component state with user profile and check permissions
  useEffect(() => {
    let isCancelled = false;

    const syncProfileState = async () => {
      if (!isMountedRef.current) {
        return;
      }

      setIsInitializing(true);

      try {
        const permissions = await Notifications.getPermissionsAsync();

        if (!isCancelled && isMountedRef.current) {
          const hasBackendPreference = Boolean(profile?.notification_time);

          if (hasBackendPreference && !permissions.granted) {
            setIsEnabled(false);
            logger.warn(
              'Notification settings out of sync - profile enabled but no device permission'
            );

            if (!hasSyncedPermissionMismatchRef.current) {
              try {
                hasSyncedPermissionMismatchRef.current = true;
                await notificationService.setNotificationsEnabled(false);
              } catch {
                // Silent fail; next user action will retry
              }
            }
          } else {
            setIsEnabled(hasBackendPreference && permissions.granted);
          }
        }
      } catch (error) {
        if (!isCancelled && isMountedRef.current) {
          logger.error('Error syncing profile state:', error as Error);
        }
      } finally {
        if (!isCancelled && isMountedRef.current) {
          setIsInitializing(false);
        }
      }
    };

    syncProfileState();

    return () => {
      isCancelled = true;
    };
  }, [profile]);

  const enableNotifications = useCallback(async () => {
    // Prevent concurrent operations
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
          // Handle different permission scenarios with helpful guidance
          if (result.status === 'denied' && result.canAskAgain === false) {
            // User permanently denied - guide to settings
            showToastError(t('notifications.permissionRequiredMessage'));
            notificationService.showNotificationPermissionGuidance(false);
          } else if (result.status === 'denied') {
            // User denied but can ask again - show explanation
            showToastError(t('notifications.dailyRemindersTitle'));
            notificationService.showNotificationPermissionGuidance(true);
          } else {
            // Other error (token generation failed)
            showToastError(t('settings.data.exportError'));
          }
          throw new Error('Permission not granted');
        }

        token = result.token;
        if (isMountedRef.current) {
          setPushToken(token);
        }
      }

      // Save token and check for errors
      const saveResult = await notificationService.saveTokenToBackend(token);
      if (!saveResult.ok) {
        logger.error('Failed to save push token:', saveResult.error);
        showToastError(t('settings.data.exportError'));
        throw saveResult.error ?? new Error('Failed to save push token');
      }

      const preferenceResult = await notificationService.setNotificationsEnabled(true);
      if (!preferenceResult.ok) {
        logger.error('Failed to enable notifications:', preferenceResult.error);
        showToastError(t('settings.data.exportError'));
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
    // Prevent concurrent operations
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
        showToastError(t('settings.data.exportError'));
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
      // Prevent toggling during operations or initialization
      if (operationInProgressRef.current || isLoading || isInitializing || !isMountedRef.current) {
        return;
      }

      // Store previous state for rollback
      const previousState = isEnabled;

      if (isOn) {
        // Optimistically turn on
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

      // Turning off
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
      isInitializing,
      enableNotifications,
      disableNotifications,
      showToastError,
      handleMutationError,
      t,
    ]
  );

  const scheduleDescription = useMemo(
    () =>
      t('notifications.fixedScheduleDescription', {
        firstTime: FIRST_REMINDER_TIME,
        secondTime: SECOND_REMINDER_TIME,
      }),
    [t]
  );

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState size="small" />
        <Text style={styles.loadingText}>{t('settings.loading')}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Main Toggle Row */}
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View style={styles.iconContainer}>
            <Icon name="bell-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>{t('onboarding.notifications.title')}</Text>
            <Text style={styles.settingDescription}>{t('onboarding.notifications.info')}</Text>
          </View>
        </View>
        <ToggleSwitch
          isOn={isEnabled}
          onColor={theme.colors.primary}
          offColor={theme.colors.outline}
          size="medium"
          onToggle={handleToggleSwitch}
          animationSpeed={200}
          disabled={isLoading || isInitializing}
        />
      </View>

      {isEnabled && (
        <View style={styles.scheduleRow}>
          <View style={styles.scheduleIconContainer}>
            <Icon name="clock-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.scheduleTextContainer}>
            <Text style={styles.scheduleTitle}>{t('notifications.dailyRemindersTitle')}</Text>
            <Text style={styles.scheduleDescription}>{scheduleDescription}</Text>
          </View>
        </View>
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
      // Removed borderBottomWidth here to allow for more cohesive grouping
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 36,
      height: 36,
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
    scheduleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
    },
    scheduleIconContainer: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scheduleTextContainer: {
      flex: 1,
      marginLeft: theme.spacing.md,
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
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    loadingText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.sm,
    },
  });
