import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput, // Added TextInput
  TouchableOpacity,
  View,
} from 'react-native';

import ThemedButton from '@/shared/components/ui/ThemedButton';
import ThemedCard from '@/shared/components/ui/ThemedCard';
import { useUserProfile } from '@/shared/hooks';
import { useTheme } from '@/providers/ThemeProvider';
import { updateProfileSchema } from '@/schemas/profileSchema';
import { analyticsService } from '@/services/analyticsService';
import { notificationService } from '@/services/notificationService';
import { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { logger } from '@/utils/debugConfig';
import { ScreenLayout, ScreenSection } from '@/shared/components/layout';

/**
 * EnhancedReminderSettingsScreen provides an improved UI/UX for reminder settings.
 * It uses animation components for a more engaging experience and
 * includes accessibility improvements, analytics tracking, and haptic feedback.
 * Migrated to use TanStack Query for optimal performance and caching.
 */
const EnhancedReminderSettingsScreen: React.FC = () => {
  const { theme } = useTheme();

  // TanStack Query - Replace useProfileStore with useUserProfile
  const { profile, updateProfile: updateProfileMutation, isUpdatingProfile } = useUserProfile();

  const storeReminderEnabled = profile?.reminder_enabled ?? false;
  const storeReminderTime = profile?.reminder_time;
  const storeDailyGratitudeGoal = profile?.daily_gratitude_goal;

  const [reminderEnabled, setReminderEnabled] = useState(storeReminderEnabled);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dailyGratitudeGoal, setDailyGratitudeGoal] = useState<string>(
    storeDailyGratitudeGoal?.toString() ?? '3'
  );

  const thumbColorValue = reminderEnabled ? theme.colors.onPrimary : theme.colors.surface;

  useEffect(() => {
    if (storeReminderTime) {
      const [hours, minutes, seconds] = storeReminderTime.split(':').map(Number);
      const initialTime = new Date();
      initialTime.setHours(hours, minutes, seconds);
      setReminderTime(initialTime);
    }
    setReminderEnabled(storeReminderEnabled);
    setDailyGratitudeGoal(storeDailyGratitudeGoal?.toString() ?? '3');
  }, [storeReminderTime, storeReminderEnabled, storeDailyGratitudeGoal]);

  useEffect(() => {
    // Log screen view for analytics
    analyticsService.logScreenView('EnhancedReminderSettingsScreen');
  }, []);

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
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

  const formatTime = (date: Date): string =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
      2,
      '0'
    )}:${String(date.getSeconds()).padStart(2, '0')}`;

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

    const formattedTime = formatTime(reminderTime);
    let finalReminderEnabled = reminderEnabled;

    try {
      if (reminderEnabled) {
        const permissionGranted = await notificationService.requestPermissions();
        if (permissionGranted) {
          const hour = reminderTime.getHours();
          const minute = reminderTime.getMinutes();
          const result = await notificationService.scheduleDailyReminder(hour, minute, true);

          if (result.success) {
            // Log successful reminder setup
            void analyticsService.logEvent('reminder_scheduled', {
              time: `${hour}:${minute}`,
            });
          } else {
            throw new Error(result.error?.message || 'Failed to schedule reminder');
          }
        } else {
          Alert.alert(
            'İzin Reddedildi',
            'Bildirim izni verilmediği için hatırlatıcılar ayarlanamadı.'
          );
          finalReminderEnabled = false;
          setReminderEnabled(false);

          // Log permission denied
          void analyticsService.logEvent('reminder_permission_denied', {
            platform: Platform.OS,
          });
        }
      } else {
        await notificationService.cancelAllScheduledNotifications();

        // Log cancellation
        void analyticsService.logEvent('reminders_cancelled', {});
      }

      // Parse dailyGratitudeGoal: empty string or invalid becomes undefined, otherwise a number
      const goalValue = dailyGratitudeGoal.trim();
      const parsedGoal = goalValue === '' ? undefined : parseInt(goalValue, 10);
      // Ensure parseInt result is not NaN if goalValue was not a valid number string (though input restricts to numbers)
      const dailyGratitudeGoalForPayload = Number.isNaN(parsedGoal) ? undefined : parsedGoal;

      const rawPayload = {
        reminder_enabled: finalReminderEnabled,
        reminder_time: reminderTime.toTimeString().split(' ')[0], // HH:MM:SS format
        daily_gratitude_goal: dailyGratitudeGoalForPayload,
      };

      const validationResult = updateProfileSchema.safeParse(rawPayload);

      if (!validationResult.success) {
        const { fieldErrors } = validationResult.error.flatten();
        let errorMessage = 'Lütfen hataları düzeltin:';
        (Object.keys(fieldErrors) as (keyof typeof fieldErrors)[]).forEach((key) => {
          const messages = fieldErrors[key];
          if (messages) {
            errorMessage += `\n- ${String(key)}: ${messages.join(', ')}`;
          }
        });
        Alert.alert('Geçersiz Veri', errorMessage);
        return;
      }

      // Use validated data for TanStack Query mutation
      const { data: validatedPayload } = validationResult;

      // TanStack Query handles optimistic updates and error handling automatically
      updateProfileMutation(validatedPayload);

      // Provide success haptic feedback
      hapticFeedback.success();

      // Log settings saved
      void analyticsService.logEvent('reminder_settings_saved', {
        enabled: finalReminderEnabled,
        time: formattedTime,
      });

      Alert.alert('Başarılı', 'Hatırlatıcı ayarları güncellendi.');
    } catch (error: unknown) {
      logger.error('Hatırlatıcı ayarları güncellenemedi:', error as Error);
      let errorMessage = 'Ayarlar güncellenemedi.';
      if (error instanceof Error) {
        errorMessage += ` Hata: ${error.message}`;
      }

      Alert.alert('Hata', errorMessage);

      // Provide error haptic feedback
      hapticFeedback.error();

      // Log error
      void analyticsService.logEvent('reminder_settings_save_failed', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleTestNotification = async () => {
    try {
      hapticFeedback.light();

      // Ensure permissions are granted
      const permissionGranted = await notificationService.requestPermissions();
      if (!permissionGranted) {
        Alert.alert('İzin Gerekli', 'Test bildirimi göndermek için bildirim izni gerekiyor.');
        return;
      }

      await notificationService.sendTestNotification();

      Alert.alert(
        'Test Bildirimi Gönderildi',
        'Test bildirimi başarıyla gönderildi! Birkaç saniye içinde görünecek.'
      );

      analyticsService.logEvent('test_notification_sent');
    } catch (error) {
      logger.error('Test notification failed:', error as Error);
      Alert.alert(
        'Test Başarısız',
        error instanceof Error ? error.message : 'Test bildirimi gönderilemedi.'
      );
    }
  };

  const styles = createStyles(theme);

  return (
    <ScreenLayout
      scrollable={true}
      showsVerticalScrollIndicator={false}
      edges={['top']}
      edgeToEdge={true}
    >
      <ScreenSection title="Hatırlatıcı Ayarları" variant="edge-to-edge">
        <ThemedCard variant="elevated" density="standard" elevation="card" style={styles.card}>
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
              onPress={() => {
                setShowTimePicker(true);
              }}
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
      </ScreenSection>

      <ScreenSection title="Günlük Minnettarlık Hedefi" variant="edge-to-edge">
        <ThemedCard density="standard" elevation="card" style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Hedef Sayısı:</Text>
            <TextInput
              style={styles.input}
              value={dailyGratitudeGoal}
              onChangeText={(text) => {
                setDailyGratitudeGoal(text.replace(/[^0-9]/g, ''));
              }} // Allow only numbers
              keyboardType="number-pad"
              placeholder="Örn: 3"
              placeholderTextColor={theme.colors.surfaceDisabled}
            />
          </View>
        </ThemedCard>
      </ScreenSection>

      <ScreenSection title="" variant="edge-to-edge">
        <ThemedButton
          title="Ayarları Kaydet"
          onPress={handleSaveSettings}
          variant="primary"
          style={styles.saveButton}
          disabled={isUpdatingProfile}
        />

        <ThemedButton
          title="Test Bildirimi Gönder"
          onPress={handleTestNotification}
          variant="secondary"
          style={styles.testButton}
        />
      </ScreenSection>

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
    </ScreenLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.colors.onSurface,
      minWidth: 50, // Ensure it's not too small
      textAlign: 'center',
      fontSize: 16,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    settingLabel: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      marginRight: theme.spacing.md,
    },
    card: {
      marginHorizontal: theme.spacing.md,
      // Padding handled by density="standard"
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    label: {
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
    saveButton: {
      marginBottom: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
    },
    testButton: {
      marginTop: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
    },
  });

export default EnhancedReminderSettingsScreen;
