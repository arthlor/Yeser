import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { updateProfile } from '../api/profileApi';
import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import {
  cancelAllScheduledNotifications,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '../services/notificationService';
import { useProfileStore } from '../store/profileStore';
import { AppTheme } from '../themes/types';
import { hapticFeedback } from '../utils/hapticFeedback';

/**
 * EnhancedReminderSettingsScreen provides an improved UI/UX for reminder settings.
 * It uses animation components for a more engaging experience and
 * includes accessibility improvements, analytics tracking, and haptic feedback.
 */
const EnhancedReminderSettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const storeReminderEnabled = useProfileStore(state => state.reminder_enabled);
  const storeReminderTime = useProfileStore(state => state.reminder_time);
  const setProfile = useProfileStore(state => state.setProfile);
  const setProfileLoading = useProfileStore(state => state.setLoading);

  const [reminderEnabled, setReminderEnabled] = useState(storeReminderEnabled);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const thumbColorValue = reminderEnabled
    ? theme.colors.onPrimary
    : theme.colors.surface;

  useEffect(() => {
    if (storeReminderTime) {
      const [hours, minutes, seconds] = storeReminderTime
        .split(':')
        .map(Number);
      const initialTime = new Date();
      initialTime.setHours(hours, minutes, seconds);
      setReminderTime(initialTime);
    }
    setReminderEnabled(storeReminderEnabled);
  }, [storeReminderTime, storeReminderEnabled]);

  useEffect(() => {
    // Log screen view for analytics
    analyticsService.logScreenView('EnhancedReminderSettingsScreen');
  }, []);

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setReminderTime(selectedDate);

      // Provide haptic feedback when time is changed
      hapticFeedback.light();

      // Log analytics event
      analyticsService.logEvent('reminder_time_changed', {
        new_time: formatTime(selectedDate),
      });
    }
  };

  const formatTime = (date: Date): string => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const handleToggleReminder = (value: boolean) => {
    setReminderEnabled(value);

    // Provide haptic feedback
    hapticFeedback.medium();

    // Log analytics event
    analyticsService.logEvent('reminder_toggled', {
      enabled: value,
    });

    // Announce change for screen readers
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(
        value ? 'Hatırlatıcı açıldı' : 'Hatırlatıcı kapatıldı'
      );
    }
  };

  const handleSaveSettings = async () => {
    // Provide haptic feedback before saving
    hapticFeedback.medium();

    setProfileLoading(true);
    const formattedTime = formatTime(reminderTime);
    let finalReminderEnabled = reminderEnabled;

    try {
      if (reminderEnabled) {
        const permissionGranted = await requestNotificationPermissions();
        if (permissionGranted) {
          const hour = reminderTime.getHours();
          const minute = reminderTime.getMinutes();
          await scheduleDailyReminder(
            hour,
            minute,
            'Günlük Minnettarlık Zamanı',
            'Bugün neleri fark ettin? Yazmaya ne dersin?'
          );

          // Log successful reminder setup
          analyticsService.logEvent('reminder_scheduled', {
            time: `${hour}:${minute}`,
          });
        } else {
          Alert.alert(
            'İzin Reddedildi',
            'Bildirim izni verilmediği için hatırlatıcılar ayarlanamadı.'
          );
          finalReminderEnabled = false;
          setReminderEnabled(false);

          // Log permission denied
          analyticsService.logEvent('reminder_permission_denied', {
            platform: Platform.OS,
          });
        }
      } else {
        await cancelAllScheduledNotifications();

        // Log cancellation
        analyticsService.logEvent('reminders_cancelled', {});
      }

      await updateProfile({
        reminder_enabled: finalReminderEnabled,
        reminder_time: formattedTime,
      });
      setProfile({
        reminder_enabled: finalReminderEnabled,
        reminder_time: formattedTime,
      });

      // Provide success haptic feedback
      hapticFeedback.success();

      // Log settings saved
      analyticsService.logEvent('reminder_settings_saved', {
        enabled: finalReminderEnabled,
        time: formattedTime,
      });

      Alert.alert('Başarılı', 'Hatırlatıcı ayarları güncellendi.');
    } catch (error: unknown) {
      console.error('Hatırlatıcı ayarları güncellenemedi:', error);
      let errorMessage = 'Ayarlar güncellenemedi.';
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
      ) {
        errorMessage = (error as { message: string }).message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Provide error haptic feedback
      hapticFeedback.error();

      // Log error
      analyticsService.logEvent('reminder_settings_error', {
        error_message: errorMessage,
      });

      Alert.alert('Hata', errorMessage);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Hatırlatıcı Ayarları</Text>

      <View style={styles.cardContainer}>
        <ThemedCard variant="elevated" elevation="md" style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Hatırlatıcıları Aç/Kapat</Text>
            <Switch
              trackColor={{
                false: theme.colors.surfaceVariant,
                true: theme.colors.primary,
              }}
              thumbColor={thumbColorValue}
              ios_backgroundColor={theme.colors.surfaceVariant}
              onValueChange={handleToggleReminder}
              value={reminderEnabled}
            />
          </View>

          {reminderEnabled && (
            <TouchableOpacity
              style={styles.row}
              onPress={() => setShowTimePicker(true)}
              accessibilityLabel={`Hatırlatıcı saati, mevcut saat ${formatTime(
                reminderTime
              )}, değiştirmek için dokunun`}
              accessibilityRole="button"
            >
              <Text style={styles.label}>Hatırlatıcı Saati</Text>
              <Text style={styles.timeText}>{formatTime(reminderTime)}</Text>
            </TouchableOpacity>
          )}
        </ThemedCard>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handleTimeChange}
          textColor={theme.colors.onSurface}
        />
      )}

      <View style={styles.buttonContainer}>
        <ThemedButton
          title="Ayarları Kaydet"
          onPress={handleSaveSettings}
          variant="primary"
          accessibilityLabel="Hatırlatıcı ayarlarını kaydet"
          style={styles.saveButton}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.large,
      backgroundColor: theme.colors.background,
    },
    header: {
      // Renamed from title to header
      ...theme.typography.h2,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
    },
    cardContainer: {
      marginBottom: theme.spacing.xl,
    },
    card: {
      padding: theme.spacing.medium,
    },
    row: {
      // Renamed from settingRow to row
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.large,
      paddingVertical: theme.spacing.medium,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    label: {
      // Renamed from settingLabel to label
      ...theme.typography.body1,
      color: theme.colors.text,
      fontWeight: '500',
    },
    timeText: {
      ...theme.typography.body1,
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 18,
    },
    disabledText: {
      color: theme.colors.disabled,
    },
    buttonContainer: {
      // Added buttonContainer
      marginTop: theme.spacing.xl,
    },
    saveButton: {
      // Kept saveButton for the button itself
      // marginTop: theme.spacing.xl, // This is now handled by buttonContainer
    },
  });

export default EnhancedReminderSettingsScreen;
