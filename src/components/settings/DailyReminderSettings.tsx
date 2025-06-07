import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';

import { useTheme } from '../../providers/ThemeProvider';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';
import { notificationService } from '../../services/notificationService';
import { analyticsService } from '../../services/analyticsService';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { logger } from '../../utils/debugConfig';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '../../themes/types';

interface DailyReminderSettingsProps {
  reminderEnabled: boolean;
  reminderTime: string | null | undefined;
  onUpdateSettings: (settings: { reminder_enabled: boolean; reminder_time?: string }) => void;
}

const DailyReminderSettings: React.FC<DailyReminderSettingsProps> = ({
  reminderEnabled,
  reminderTime,
  onUpdateSettings,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => parseTimeStringToValidDate(reminderTime));

  useEffect(() => {
    setSelectedTime(parseTimeStringToValidDate(reminderTime));
  }, [reminderTime]);

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (date) {
      setSelectedTime(date);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const formattedTime = `${hours}:${minutes}:${seconds}`;

      // Provide haptic feedback for time selection
      hapticFeedback.light();

      onUpdateSettings({
        reminder_enabled: true,
        reminder_time: formattedTime,
      });

      // Schedule notifications with new time
      handleNotificationScheduling(true, date);

      // Track analytics event
      analyticsService.logEvent('daily_reminder_time_changed', {
        time: formattedTime,
        enabled: true,
      });

      // Log the change for debugging
      logger.debug('Daily reminder time changed', {
        time: formattedTime,
        enabled: true,
      });
    }
  };

  const toggleReminderSwitch = () => {
    const newEnabled = !reminderEnabled;

    // Provide haptic feedback for toggle interaction
    hapticFeedback.light();

    if (newEnabled) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      const seconds = String(selectedTime.getSeconds()).padStart(2, '0');
      const formattedTime = `${hours}:${minutes}:${seconds}`;

      onUpdateSettings({
        reminder_enabled: true,
        reminder_time: formattedTime,
      });

      // Schedule notifications when enabled
      handleNotificationScheduling(true, selectedTime);

      // Track analytics event
      analyticsService.logEvent('daily_reminder_toggled', {
        enabled: true,
        time: formattedTime,
      });

      // Log the change for debugging
      logger.debug('Daily reminder enabled', {
        enabled: true,
        time: formattedTime,
      });
    } else {
      onUpdateSettings({
        reminder_enabled: false,
      });

      // Cancel notifications when disabled
      handleNotificationScheduling(false, selectedTime);

      // Track analytics event
      analyticsService.logEvent('daily_reminder_toggled', {
        enabled: false,
      });

      // Log the change for debugging
      logger.debug('Daily reminder disabled', {
        enabled: false,
      });
    }
  };

  const handleNotificationScheduling = async (enabled: boolean, time: Date) => {
    try {
      const hour = time.getHours();
      const minute = time.getMinutes();

      if (enabled) {
        // Schedule daily reminder
        const result = await notificationService.scheduleDailyReminder(hour, minute, true);

        if (result.success) {
          logger.debug('Daily reminder scheduled successfully', {
            hour,
            minute,
            identifier: result.identifier,
          });

          // Provide success haptic feedback
          hapticFeedback.success();
        } else {
          // Handle scheduling error
          logger.error('Failed to schedule daily reminder', result.error);

          // Show error alert to user
          Alert.alert(
            'Bildirim Hatası',
            'Günlük hatırlatıcı ayarlanamadı. Lütfen bildirim izinlerini kontrol edin.',
            [{ text: 'Tamam', style: 'default' }]
          );

          // Provide error haptic feedback
          hapticFeedback.error();
        }
      } else {
        // Cancel daily reminders
        await notificationService.cancelDailyReminders();
        logger.debug('Daily reminders cancelled');
      }
    } catch (error) {
      logger.error('Error handling daily notification scheduling', error as Error);

      // Show error alert to user
      Alert.alert('Bildirim Hatası', 'Hatırlatıcı ayarlanırken bir hata oluştu.', [
        { text: 'Tamam', style: 'default' },
      ]);

      // Provide error haptic feedback
      hapticFeedback.error();
    }
  };

  const formattedSelectedTime = selectedTime
    .toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(':', '.');

  return (
    <View style={styles.settingCard}>
      <TouchableOpacity style={styles.settingRow} onPress={toggleReminderSwitch}>
        <View style={styles.settingInfo}>
          <View style={styles.iconContainer}>
            <Icon name="bell-outline" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>Günlük Hatırlatıcı</Text>
            <Text style={styles.settingDescription}>
              {reminderEnabled ? `Her gün ${formattedSelectedTime}` : 'Kapalı'}
            </Text>
          </View>
        </View>
        <ThemedSwitch
          value={reminderEnabled}
          onValueChange={() => toggleReminderSwitch()}
          size="medium"
          testID="daily-reminder-switch"
        />
      </TouchableOpacity>

      {reminderEnabled && (
        <View style={styles.timeSection}>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.timePickerButton}
            onPress={() => setShowTimePicker(true)}
            accessibilityLabel={`Current reminder time: ${formattedSelectedTime}`}
            accessibilityHint="Tap to change reminder time"
            accessibilityRole="button"
          >
            <View style={styles.timePickerContent}>
              <Icon name="clock-outline" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.timePickerButtonText}>Saat: {formattedSelectedTime}</Text>
              <Icon name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          textColor={theme.colors.onSurface}
          accentColor={theme.colors.primary}
          accessibilityLabel="Select reminder time"
          accessibilityHint="Choose the time for daily reminders"
        />
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      // 🌟 Medium primary shadow for complex setting cards
      ...getPrimaryShadow.medium(theme),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
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

    timeSection: {
      marginTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '30',
      marginBottom: theme.spacing.sm,
    },
    timePickerButton: {
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryContainer + '40',
      marginHorizontal: theme.spacing.md,
    },
    timePickerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm,
    },
    timePickerButtonText: {
      flex: 1,
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      marginLeft: theme.spacing.xs,
      fontWeight: '500',
    },
  });

export default DailyReminderSettings;
