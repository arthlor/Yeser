import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Notifications from 'expo-notifications';

import { useTheme } from '@/providers/ThemeProvider';
import { AppTheme } from '@/themes/types';
import { useUserProfile } from '@/shared/hooks';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { useToast } from '@/providers/ToastProvider';
import { notificationService } from '@/services/notificationService';
import ThemedButton from '@/shared/components/ui/ThemedButton';
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
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Effect to get the current push token on mount
  useEffect(() => {
    const getToken = async () => {
      try {
        const token = await Notifications.getExpoPushTokenAsync();
        setPushToken(token.data);
      } catch (error) {
        logger.warn('Could not get push token on initial load.', { error });
      }
    };
    getToken();
  }, []);

  // Effect to sync component state with user profile
  useEffect(() => {
    if (profile) {
      setIsEnabled(!!profile.notification_time);
      if (profile.notification_time) {
        const [hour, minute] = profile.notification_time.split(':').map(Number);
        const date = new Date();
        date.setHours(hour);
        date.setMinutes(minute);
        setSelectedTime(date);
      } else {
        // Default time if none is set
        const date = new Date();
        date.setHours(9);
        date.setMinutes(0);
        setSelectedTime(date);
      }
    }
  }, [profile]);

  const enableNotifications = useCallback(async () => {
    let token = pushToken;
    if (!token) {
      const registeredToken = await notificationService.registerForPushNotificationsAsync();
      if (!registeredToken) {
        showToastError('Bildirim izni alınamadı. Lütfen uygulama ayarlarını kontrol edin.');
        throw new Error('Permission not granted');
      }
      token = registeredToken;
      setPushToken(token);
    }

    // Save token and check for errors
    const saveResult = await notificationService.saveTokenToBackend(token);
    if (saveResult.error) {
      logger.error('Failed to save push token:', saveResult.error);
      showToastError('Bildirim kaydedilemedi. Lütfen tekrar deneyin.');
      throw saveResult.error;
    }

    // Update notification time and check for errors
    const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
    const updateResult = await notificationService.updateNotificationTime(timeString);
    if (updateResult.error) {
      logger.error('Failed to update notification time:', updateResult.error);
      showToastError('Bildirim saati güncellenemedi. Lütfen tekrar deneyin.');
      throw updateResult.error;
    }

    showToastSuccess('Günlük hatırlatıcılar etkinleştirildi.');
  }, [pushToken, selectedTime, showToastError, showToastSuccess]);

  const disableNotifications = useCallback(async () => {
    if (pushToken) {
      await notificationService.removeTokenFromBackend(pushToken);
    }

    const updateResult = await notificationService.updateNotificationTime(null);
    if (updateResult.error) {
      logger.error('Failed to disable notification time:', updateResult.error);
      showToastError('Bildirimler devre dışı bırakılamadı. Lütfen tekrar deneyin.');
      throw updateResult.error;
    }

    showToastSuccess('Günlük hatırlatıcılar devre dışı bırakıldı.');
  }, [pushToken, showToastSuccess, showToastError]);

  const handleToggleSwitch = async (isOn: boolean) => {
    setIsEnabled(isOn); // Optimistic UI update

    try {
      if (isOn) {
        await enableNotifications();
      } else {
        await disableNotifications();
      }
    } catch (error) {
      setIsEnabled(!isOn); // Revert on error
      if ((error as Error).message !== 'Permission not granted') {
        handleMutationError(error, 'bildirim ayarları');
      }
    }
  };

  const onTimeChange = async (_event: unknown, newTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (newTime && profile) {
      setSelectedTime(newTime);
      try {
        const timeString = `${newTime.getHours().toString().padStart(2, '0')}:${newTime
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        await notificationService.updateNotificationTime(timeString);
        showToastSuccess('Bildirim saati güncellendi.');
      } catch (error) {
        handleMutationError(error, 'bildirim saati güncelleme');
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

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
        />
      </View>

      {/* Time Picker Section (conditionally rendered) */}
      {isEnabled && (
        <TouchableOpacity
          style={styles.timePickerRow}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.8}
        >
          <View style={styles.timePickerLabelContainer}>
            <Text style={styles.timePickerLabel}>Hatırlatıcı Saati</Text>
            <Text style={styles.timePickerDescription}>
              Bildirim almak istediğiniz saati seçin.
            </Text>
          </View>
          <ThemedButton
            title={formatTime(selectedTime)}
            onPress={() => setShowTimePicker(true)}
            variant="outline"
            style={styles.timeButton}
            textStyle={styles.timeButtonText}
          />
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              textColor={theme.colors.onBackground}
              locale="tr-TR"
              is24Hour={false}
            />
          )}
        </TouchableOpacity>
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
  });
