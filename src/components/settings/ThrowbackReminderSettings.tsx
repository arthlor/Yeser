import { Picker } from '@react-native-picker/picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import React, { useEffect, useState } from 'react';
import { Alert, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../../providers/ThemeProvider';
import { notificationService } from '../../services/notificationService';
import { analyticsService } from '../../services/analyticsService';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { logger } from '../../utils/debugConfig';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';
import { getPrimaryShadow } from '@/themes/utils';

import type { Profile } from '../../schemas/profileSchema';
import type { AppTheme } from '../../themes/types';

const frequencyOptions: { label: string; value: Profile['throwback_reminder_frequency'] }[] = [
  { label: 'Günlük', value: 'daily' },
  { label: 'Haftalık', value: 'weekly' },
  { label: 'Aylık', value: 'monthly' },
];

interface ThrowbackReminderSettingsProps {
  throwbackEnabled: boolean;
  throwbackFrequency: Profile['throwback_reminder_frequency'];
  throwbackReminderTime: string | null | undefined;
  onUpdateSettings: (settings: {
    throwback_reminder_enabled: boolean;
    throwback_reminder_frequency: Profile['throwback_reminder_frequency'];
    throwback_reminder_time?: string;
  }) => void;
}

const ThrowbackReminderSettings: React.FC<ThrowbackReminderSettingsProps> = ({
  throwbackEnabled,
  throwbackFrequency,
  throwbackReminderTime,
  onUpdateSettings,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [selectedFrequency, setSelectedFrequency] = useState<
    Profile['throwback_reminder_frequency']
  >(throwbackFrequency ?? 'weekly');

  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    setSelectedFrequency(throwbackFrequency ?? 'weekly');
    
    // Initialize time from database or default to 10:00:00
    const timeString = throwbackReminderTime || '10:00:00';
    const timeDate = parseTimeStringToValidDate(timeString);
    setSelectedTime(timeDate);
  }, [throwbackFrequency, throwbackReminderTime]);

  const toggleThrowbackSwitch = () => {
    const newEnabled = !throwbackEnabled;
    const timeString = selectedTime.toTimeString().split(' ')[0]; // Get HH:MM:SS format
    
    // Provide haptic feedback for toggle interaction
    hapticFeedback.light();
    
    onUpdateSettings({
      throwback_reminder_enabled: newEnabled,
      throwback_reminder_frequency: selectedFrequency,
      throwback_reminder_time: timeString,
    });

    // Schedule or cancel notifications based on new state
    handleNotificationScheduling(newEnabled, selectedFrequency, selectedTime);

    // Track analytics event
    analyticsService.logEvent('throwback_reminder_toggled', {
      enabled: newEnabled,
      frequency: selectedFrequency as string,
      time: timeString,
    });

    // Log the change for debugging
    logger.debug('Throwback reminder toggled', {
      enabled: newEnabled,
      frequency: selectedFrequency,
      time: timeString,
    });
  };

  const handleFrequencyChange = (frequency: Profile['throwback_reminder_frequency']) => {
    setSelectedFrequency(frequency);
    const timeString = selectedTime.toTimeString().split(' ')[0]; // Get HH:MM:SS format
    
    // Provide haptic feedback for selection change
    hapticFeedback.light();
    
    onUpdateSettings({
      throwback_reminder_enabled: throwbackEnabled,
      throwback_reminder_frequency: frequency,
      throwback_reminder_time: timeString,
    });

    // Reschedule notifications with new frequency if enabled
    if (throwbackEnabled) {
      handleNotificationScheduling(throwbackEnabled, frequency, selectedTime);
    }

    // Track analytics event
    analyticsService.logEvent('throwback_reminder_frequency_changed', {
      old_frequency: throwbackFrequency as string,
      new_frequency: frequency as string,
      enabled: throwbackEnabled,
    });

    // Log the change for debugging
    logger.debug('Throwback reminder frequency changed', {
      oldFrequency: throwbackFrequency,
      newFrequency: frequency,
      enabled: throwbackEnabled,
    });
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    
    if (selectedDate && throwbackEnabled) {
      setSelectedTime(selectedDate);
      const timeString = selectedDate.toTimeString().split(' ')[0]; // Get HH:MM:SS format
      
      // Provide haptic feedback for time selection
      hapticFeedback.light();
      
      onUpdateSettings({
        throwback_reminder_enabled: throwbackEnabled,
        throwback_reminder_frequency: selectedFrequency,
        throwback_reminder_time: timeString,
      });

      // Reschedule notifications with new time
      handleNotificationScheduling(throwbackEnabled, selectedFrequency, selectedDate);

      // Track analytics event
      analyticsService.logEvent('throwback_reminder_time_changed', {
        time: timeString,
        frequency: selectedFrequency as string,
        enabled: throwbackEnabled,
      });

      // Log the change for debugging
      logger.debug('Throwback reminder time changed', {
        time: timeString,
        frequency: selectedFrequency,
        enabled: throwbackEnabled,
      });
    }
  };

  const handleNotificationScheduling = async (
    enabled: boolean,
    frequency: Profile['throwback_reminder_frequency'],
    time: Date
  ) => {
    try {
      const hour = time.getHours();
      const minute = time.getMinutes();

      if (enabled) {
        // Schedule throwback reminder  
        const validFrequency = frequency !== 'disabled' ? frequency : 'weekly';
        const result = await notificationService.scheduleThrowbackReminder(
          hour,
          minute,
          true,
          validFrequency
        );

        if (result.success) {
          logger.debug('Throwback reminder scheduled successfully', {
            hour,
            minute,
            frequency,
            identifier: result.identifier,
          });
          
          // Provide success haptic feedback
          hapticFeedback.success();
        } else {
          // Handle scheduling error
          logger.error('Failed to schedule throwback reminder', result.error);
          
          // Show error alert to user
          Alert.alert(
            'Bildirim Hatası',
            'Hatırlatıcı ayarlanamadı. Lütfen bildirim izinlerini kontrol edin.',
            [{ text: 'Tamam', style: 'default' }]
          );
          
          // Provide error haptic feedback
          hapticFeedback.error();
        }
      } else {
        // Cancel throwback reminders
        await notificationService.cancelThrowbackReminders();
        logger.debug('Throwback reminders cancelled');
      }
    } catch (error) {
      logger.error('Error handling throwback notification scheduling', error as Error);
      
      // Show error alert to user
      Alert.alert(
        'Bildirim Hatası',
        'Hatırlatıcı ayarlanırken bir hata oluştu.',
        [{ text: 'Tamam', style: 'default' }]
      );
      
      // Provide error haptic feedback
      hapticFeedback.error();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const getFrequencyLabel = () => {
    const option = frequencyOptions.find((opt) => opt.value === selectedFrequency);
    return option ? option.label : 'Haftalık';
  };

  const getScheduleDescription = () => {
    if (!throwbackEnabled) {
      return 'Kapalı';
    }
    
    const time = formatTime(selectedTime);
    switch (selectedFrequency) {
      case 'daily':
        return `Her gün saat ${time}`;
      case 'weekly':
        return `Pazar günleri saat ${time}`;
      case 'monthly':
        return `Her ayın 1'inde saat ${time}`;
      default:
        return `${getFrequencyLabel()} hatırlatma saat ${time}`;
    }
  };

  return (
    <View style={styles.settingCard}>
        <TouchableOpacity style={styles.settingRow} onPress={toggleThrowbackSwitch}>
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <Icon name="history" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>Geçmiş Hatırlatıcı</Text>
              <Text style={styles.settingDescription}>
                {getScheduleDescription()}
              </Text>
            </View>
          </View>
          <View style={styles.toggleContainer}>
            <View
              style={[
                styles.toggle,
                {
                  backgroundColor: throwbackEnabled
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: theme.colors.surface,
                    transform: [
                      {
                        translateX: throwbackEnabled ? 22 : 2,
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>

        {throwbackEnabled && (
          <View style={styles.frequencySection}>
            <View style={styles.divider} />
            <View style={styles.frequencyHeader}>
              <Icon name="repeat" size={18} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.frequencyLabel}>Sıklık</Text>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedFrequency}
                onValueChange={(itemValue) => {
                  handleFrequencyChange(itemValue as Profile['throwback_reminder_frequency']);
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                dropdownIconColor={theme.colors.onSurface}
              >
                {frequencyOptions.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                    color={theme.colors.onSurface}
                  />
                ))}
              </Picker>
            </View>
            
            {/* Time Picker Section */}
            <View style={styles.timeSection}>
              <View style={styles.divider} />
              <View style={styles.timeHeader}>
                <Icon name="clock-outline" size={18} color={theme.colors.onSurfaceVariant} />
                <Text style={styles.timeLabel}>Saat</Text>
              </View>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.timeText}>{formatTime(selectedTime)}</Text>
                <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
              
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  style={styles.timePicker}
                />
              )}
            </View>

          </View>
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
    toggleContainer: {
      marginLeft: theme.spacing.sm,
    },
    toggle: {
      width: 50,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      padding: 2,
    },
    toggleThumb: {
      width: 26,
      height: 26,
      borderRadius: 13,
    },
    frequencySection: {
      marginTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '30',
      marginBottom: theme.spacing.sm,
    },
    frequencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    frequencyLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pickerContainer: {
      backgroundColor: theme.colors.primaryContainer + '40',
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      marginHorizontal: theme.spacing.md,
    },
    picker: {
      width: '100%',
      color: theme.colors.onSurface,
    },
    pickerItem: {
      color: theme.colors.onSurface,
      ...theme.typography.bodyMedium,
    },
    timeSection: {
      marginTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    timeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
    },
    timeLabel: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurfaceVariant,
      marginLeft: theme.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryContainer + '40',
      marginHorizontal: theme.spacing.md,
    },
    timeText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    timePicker: {
      width: 200,
      height: 200,
    },

  });

export default ThrowbackReminderSettings;
