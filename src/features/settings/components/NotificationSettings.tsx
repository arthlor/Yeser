import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Notifications from 'expo-notifications';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useUserProfile } from '@/shared/hooks';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { notificationService } from '@/services/notificationService';
import ThemedButton from '@/shared/components/ui/ThemedButton';
import LoadingState from '@/components/states/LoadingState';
import { logger } from '@/utils/logger';

export const NotificationSettings: React.FC = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { profile } = useUserProfile();
  const { handleMutationError } = useGlobalError();
  const { showError: showToastError, showSuccess: showToastSuccess } = useToast();

  const [isEnabled, setIsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Refs for cleanup and race condition prevention
  const isMountedRef = useRef(true);
  const operationInProgressRef = useRef(false);

  // Effect to get the current push token on mount with proper cleanup
  useEffect(() => {
    let isCancelled = false;

    const getToken = async () => {
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        if (!isCancelled && isMountedRef.current) {
          setPushToken(token.data);
        }
      } catch (error) {
        if (!isCancelled && isMountedRef.current) {
          logger.warn('Could not get push token on initial load.', { error });
        }
      }
    };

    getToken();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Effect to sync component state with user profile and check permissions
  useEffect(() => {
    let isCancelled = false;

    const syncProfileState = async () => {
      if (!profile || !isMountedRef.current) {
        return;
      }

      setIsInitializing(true);

      try {
        const hasNotificationTime = !!profile.notification_time;

        // If profile says notifications are enabled, verify device permissions
        if (hasNotificationTime) {
          const permissions = await Notifications.getPermissionsAsync();

          if (!isCancelled && isMountedRef.current) {
            if (permissions.status !== 'granted') {
              // Profile says enabled but permissions not granted - sync state
              setIsEnabled(false);
              logger.warn(
                'Notification settings out of sync - profile enabled but no device permission'
              );
            } else {
              setIsEnabled(true);
            }
          }
        } else if (!isCancelled && isMountedRef.current) {
          setIsEnabled(false);
        }

        // Set selected time with validation
        if (!isCancelled && isMountedRef.current) {
          if (profile.notification_time) {
            const [hour] = profile.notification_time.split(':').map(Number);
            if (hour >= 0 && hour <= 23) {
              const date = new Date();
              date.setHours(hour);
              date.setMinutes(0); // 🔧 FIX: Always use :00 minutes
              date.setSeconds(0);
              setSelectedTime(date);
            }
          } else {
            // Default time if none is set (9:00 AM)
            const date = new Date();
            date.setHours(9);
            date.setMinutes(0);
            date.setSeconds(0);
            setSelectedTime(date);
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
            showToastError('Bildirimler için sistem ayarlarından izin vermeniz gerekiyor.');
            notificationService.showNotificationPermissionGuidance(false);
          } else if (result.status === 'denied') {
            // User denied but can ask again - show explanation
            showToastError('Günlük hatırlatıcılar için bildirim izni gerekli.');
            notificationService.showNotificationPermissionGuidance(true);
          } else {
            // Other error (token generation failed)
            showToastError('Bildirim kaydedilemedi. Lütfen tekrar deneyin.');
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
      if (saveResult.error) {
        logger.error('Failed to save push token:', saveResult.error);
        showToastError('Bildirim kaydedilemedi. Lütfen tekrar deneyin.');
        throw saveResult.error;
      }

      // Update notification time and check for errors
      // 🔧 FIX: Store as HH:00 format (hours only) to match backend logic
      const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:00`;
      const updateResult = await notificationService.updateNotificationTime(timeString);
      if (updateResult.error) {
        logger.error('Failed to update notification time:', updateResult.error);
        showToastError('Bildirim saati güncellenemedi. Lütfen tekrar deneyin.');
        throw updateResult.error;
      }

      if (isMountedRef.current) {
        showToastSuccess('Günlük hatırlatıcılar etkinleştirildi.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      operationInProgressRef.current = false;
    }
  }, [pushToken, selectedTime, showToastError, showToastSuccess]);

  const disableNotifications = useCallback(async () => {
    // Prevent concurrent operations
    if (operationInProgressRef.current || !isMountedRef.current) {
      return;
    }

    operationInProgressRef.current = true;
    setIsLoading(true);

    try {
      if (pushToken) {
        await notificationService.removeTokenFromBackend(pushToken);
      }

      const updateResult = await notificationService.updateNotificationTime(null);
      if (updateResult.error) {
        logger.error('Failed to disable notification time:', updateResult.error);
        showToastError('Bildirimler devre dışı bırakılamadı. Lütfen tekrar deneyin.');
        throw updateResult.error;
      }

      if (isMountedRef.current) {
        showToastSuccess('Günlük hatırlatıcılar devre dışı bırakıldı.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      operationInProgressRef.current = false;
    }
  }, [pushToken, showToastSuccess, showToastError]);

  const handleToggleSwitch = useCallback(
    async (isOn: boolean) => {
      // Prevent toggling during operations or initialization
      if (operationInProgressRef.current || isLoading || isInitializing || !isMountedRef.current) {
        return;
      }

      if (isOn) {
        // Before enabling, check if we should show educational guidance
        const permissions = await Notifications.getPermissionsAsync();

        if (permissions.status === 'undetermined') {
          // First time - show educational dialog with enhanced messaging
          notificationService.showNotificationPermissionGuidance(true, (granted) => {
            if (granted && isMountedRef.current) {
              // Permission granted - proceed with enabling notifications
              setIsEnabled(true);
              enableNotifications().catch((error) => {
                if (isMountedRef.current) {
                  setIsEnabled(false);
                  if ((error as Error).message !== 'Permission not granted') {
                    handleMutationError(error, 'bildirim ayarları');
                  }
                }
              });
            }
            // If denied, do nothing - user can try again later
          });
          return;
        } else if (permissions.status === 'denied') {
          // Already denied - show more helpful guidance
          showToastError('Bildirimleri sistem ayarlarından etkinleştirmeniz gerekiyor.');
          notificationService.showNotificationPermissionGuidance(false);
          return;
        }
      }

      // Store previous state for rollback
      const previousState = isEnabled;
      setIsEnabled(isOn); // Optimistic UI update

      try {
        if (isOn) {
          await enableNotifications();
        } else {
          await disableNotifications();
        }
      } catch (error) {
        if (isMountedRef.current) {
          setIsEnabled(previousState); // Revert to previous state on error
          if ((error as Error).message !== 'Permission not granted') {
            handleMutationError(error, 'bildirim ayarları');
          }
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
    ]
  );

  const onHourSelect = useCallback(
    async (hour: number) => {
      setShowHourPicker(false);

      if (!profile || !isMountedRef.current || operationInProgressRef.current) {
        return;
      }

      operationInProgressRef.current = true;
      setIsLoading(true);

      try {
        // Create new date with selected hour in Turkish timezone
        const adjustedTime = new Date();
        adjustedTime.setHours(hour);
        adjustedTime.setMinutes(0);
        adjustedTime.setSeconds(0);
        adjustedTime.setMilliseconds(0);

        // Store previous time for rollback
        const previousTime = selectedTime;
        setSelectedTime(adjustedTime); // Optimistic update

        try {
          // Store as HH:00 format (hours only) for Turkish time
          const timeString = `${hour.toString().padStart(2, '0')}:00`;
          await notificationService.updateNotificationTime(timeString);

          if (isMountedRef.current) {
            showToastSuccess('Bildirim saati güncellendi.');
          }
        } catch (error) {
          if (isMountedRef.current) {
            setSelectedTime(previousTime); // Revert on error
            handleMutationError(error, 'bildirim saati güncelleme');
          }
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        operationInProgressRef.current = false;
      }
    },
    [profile, selectedTime, showToastSuccess, handleMutationError]
  );

  const formatTime = useCallback((date: Date) => {
    // 🔧 FIX: Only show hours, always display as HH:00 in Turkish time
    return `${date.getHours().toString().padStart(2, '0')}:00`;
  }, []);

  // Generate 24-hour options for Turkish time (00:00 to 23:00)
  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      value: i,
      label: `${i.toString().padStart(2, '0')}:00`,
    }));
  }, []);

  // Computed styles for loading states
  const timeButtonStyle = useMemo(() => {
    return StyleSheet.flatten([styles.timeButton, isLoading ? styles.timeButtonDisabled : {}]);
  }, [isLoading, styles.timeButton, styles.timeButtonDisabled]);

  const timeButtonTextStyle = useMemo(() => {
    return StyleSheet.flatten([
      styles.timeButtonText,
      isLoading ? styles.timeButtonTextDisabled : {},
    ]);
  }, [isLoading, styles.timeButtonText, styles.timeButtonTextDisabled]);

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
        <Text style={styles.loadingText}>Bildirim ayarları yükleniyor...</Text>
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
            <Text style={styles.settingTitle}>Günlük Hatırlatıcılar</Text>
            <Text style={styles.settingDescription}>
              Her gün minnet günlüğü yazmanız için hatırlatıcılar alın.
            </Text>
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

      {/* Time Picker Section (conditionally rendered) */}
      {isEnabled && (
        <TouchableOpacity
          style={styles.timePickerRow}
          onPress={() => setShowHourPicker(true)}
          activeOpacity={0.8}
        >
          <View style={styles.timePickerLabelContainer}>
            <Text style={styles.timePickerLabel}>Hatırlatıcı Saati</Text>
            <Text style={styles.timePickerDescription}>
              Bildirim almak istediğiniz saati seçin.
            </Text>
          </View>
          <ThemedButton
            title={isLoading ? 'Güncelleniyor...' : formatTime(selectedTime)}
            onPress={() => !isLoading && setShowHourPicker(true)}
            variant="outline"
            style={timeButtonStyle}
            textStyle={timeButtonTextStyle}
            disabled={isLoading}
          />
        </TouchableOpacity>
      )}

      {/* Custom Hour Picker Modal for Turkish time (24-hour format, hours only) */}
      <Modal
        visible={showHourPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHourPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowHourPicker(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity activeOpacity={1} style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Bildirim Saati Seçin</Text>
                <Text style={styles.pickerSubtitle}>
                  Sadece saat seçin (dakikalar otomatik olarak :00 olacak)
                </Text>
              </View>

              <ScrollView style={styles.hourScrollView} showsVerticalScrollIndicator={false}>
                {hourOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.hourOption,
                      selectedTime.getHours() === option.value && styles.selectedHourOption,
                    ]}
                    onPress={() => onHourSelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.hourOptionText,
                        selectedTime.getHours() === option.value && styles.selectedHourOptionText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.pickerActions}>
                <ThemedButton
                  title="İptal"
                  onPress={() => setShowHourPicker(false)}
                  variant="outline"
                  style={styles.cancelButton}
                />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    timePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: 1, // Add a top border to separate from the toggle
      borderTopColor: theme.colors.outlineVariant,
    },
    timePickerLabelContainer: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    timePickerLabel: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
    },
    timePickerDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    timeButton: {
      minWidth: 100,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    timeButtonText: {
      ...theme.typography.bodyMedium,
      fontWeight: '600',
    },
    timeButtonDisabled: {
      opacity: 0.6,
    },
    timeButtonTextDisabled: {
      color: theme.colors.onSurfaceVariant,
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
    // Custom hour picker modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: '85%',
      maxWidth: 400,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      elevation: 8,
      shadowColor: theme.colors.onSurface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    pickerContainer: {
      maxHeight: '70%',
    },
    pickerHeader: {
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    pickerTitle: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    pickerSubtitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 20,
    },
    hourScrollView: {
      maxHeight: 300,
      padding: theme.spacing.sm,
    },
    hourOption: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      marginVertical: theme.spacing.xs / 2,
    },
    selectedHourOption: {
      backgroundColor: theme.colors.primaryContainer,
    },
    hourOptionText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      textAlign: 'center',
      fontWeight: '500',
      fontSize: 18,
    },
    selectedHourOptionText: {
      color: theme.colors.onPrimaryContainer,
      fontWeight: '600',
    },
    pickerActions: {
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    cancelButton: {
      minWidth: 120,
    },
  });
