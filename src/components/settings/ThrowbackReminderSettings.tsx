import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';

import { useTheme } from '../../providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { analyticsService } from '../../services/analyticsService';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { logger } from '../../utils/debugConfig';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';
import { notificationService } from '@/services/notificationService';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '../../themes/types';

interface ThrowbackReminderSettingsProps {
  throwbackEnabled: boolean;
  throwbackReminderTime: string | null | undefined;
  onUpdateSettings: (settings: {
    throwback_reminder_enabled: boolean;
    throwback_reminder_time?: string;
  }) => void;
}

/**
 * **SIMPLIFIED THROWBACK REMINDER SETTINGS**: Daily throwback reminders with time selection only
 *
 * Simplified to match Daily Reminder settings - no frequency selection, always daily.
 * User can enable/disable and set the time for daily throwback reminders.
 */
const EnhancedThrowbackReminderSettings: React.FC<ThrowbackReminderSettingsProps> = React.memo(
  ({ throwbackEnabled, throwbackReminderTime, onUpdateSettings }) => {
    const { theme } = useTheme();
    const { showError } = useGlobalError();
    const styles = createStyles(theme);

    const [selectedTime, setSelectedTime] = useState<Date>(
      parseTimeStringToValidDate(throwbackReminderTime)
    );
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);

    useEffect(() => {
      setSelectedTime(parseTimeStringToValidDate(throwbackReminderTime));
    }, [throwbackReminderTime]);

    const handleNotificationScheduling = useCallback(
      async (enabled: boolean, time: Date) => {
        setIsScheduling(true);
        try {
          const hour = time.getHours();
          const minute = time.getMinutes();

          if (enabled) {
            // Schedule daily throwback reminder (always daily frequency)
            const result = await notificationService.scheduleThrowbackReminder(
              hour,
              minute,
              true,
              'daily'
            );

            if (result.success) {
              logger.debug('Daily throwback reminder scheduled successfully', {
                hour,
                minute,
              });

              // Provide success haptic feedback
              hapticFeedback.success();
            } else {
              // Handle scheduling error
              logger.error('Failed to schedule daily throwback reminder', result.error);

              showError('Anı hatırlatıcısı ayarlanamadı. Lütfen bildirim izinlerini kontrol edin.');

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

          showError('Anı hatırlatıcısı ayarlanırken bir hata oluştu.');

          // Provide error haptic feedback
          hapticFeedback.error();
        } finally {
          setIsScheduling(false);
        }
      },
      [showError]
    );

    const onTimeChange = useCallback(
      (event: DateTimePickerEvent, date?: Date) => {
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
            throwback_reminder_enabled: true,
            throwback_reminder_time: formattedTime,
          });

          // Schedule notifications with new time
          handleNotificationScheduling(true, date);

          // Track analytics event
          analyticsService.logEvent('throwback_reminder_time_changed', {
            time: formattedTime,
            enabled: true,
          });

          // Log the change for debugging
          logger.debug('Throwback reminder time changed', {
            time: formattedTime,
            enabled: true,
          });
        }
      },
      [onUpdateSettings, handleNotificationScheduling]
    );

    const toggleThrowbackSwitch = useCallback(() => {
      const newEnabled = !throwbackEnabled;

      // Provide haptic feedback for toggle interaction
      hapticFeedback.medium();

      if (newEnabled) {
        const hours = String(selectedTime.getHours()).padStart(2, '0');
        const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
        const seconds = String(selectedTime.getSeconds()).padStart(2, '0');
        const formattedTime = `${hours}:${minutes}:${seconds}`;

        onUpdateSettings({
          throwback_reminder_enabled: true,
          throwback_reminder_time: formattedTime,
        });

        // Schedule notifications when enabled
        handleNotificationScheduling(true, selectedTime);

        // Track analytics event
        analyticsService.logEvent('throwback_reminder_toggled', {
          enabled: true,
          time: formattedTime,
        });

        // Log the change for debugging
        logger.debug('Throwback reminder enabled', {
          enabled: true,
          time: formattedTime,
        });
      } else {
        onUpdateSettings({
          throwback_reminder_enabled: false,
        });

        // Cancel notifications when disabled
        handleNotificationScheduling(false, selectedTime);

        // Track analytics event
        analyticsService.logEvent('throwback_reminder_toggled', {
          enabled: false,
        });

        // Log the change for debugging
        logger.debug('Throwback reminder disabled', {
          enabled: false,
        });
      }
    }, [throwbackEnabled, selectedTime, onUpdateSettings, handleNotificationScheduling]);

    const handleTimePickerPress = useCallback(() => {
      if (Platform.OS === 'ios') {
        setShowTimePicker(true);
      } else {
        setShowTimePicker(true);
      }
      hapticFeedback.light();
    }, []);

    const formattedSelectedTime = useMemo(
      () =>
        selectedTime
          .toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          })
          .replace(':', '.'),
      [selectedTime]
    );

    return (
      <Animated.View style={[styles.settingCard, { transform: [{ scale: 1 }] }]}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={toggleThrowbackSwitch}
          activeOpacity={0.8}
          disabled={isScheduling}
        >
          <View style={styles.settingInfo}>
            <View
              style={[
                styles.iconContainer,
                throwbackEnabled && styles.iconContainerActive,
                isScheduling && styles.iconContainerLoading,
              ]}
            >
              <Icon
                name={isScheduling ? 'loading' : 'history'}
                size={20}
                color={throwbackEnabled ? theme.colors.onPrimary : theme.colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>Anı Hatırlatıcı</Text>
              <Text
                style={[
                  styles.settingDescription,
                  throwbackEnabled && styles.settingDescriptionActive,
                ]}
              >
                {throwbackEnabled ? `Her gün ${formattedSelectedTime}` : 'Kapalı'}
              </Text>
            </View>
          </View>
          <ThemedSwitch
            value={throwbackEnabled}
            onValueChange={toggleThrowbackSwitch}
            size="medium"
            testID="throwback-reminder-switch"
            disabled={isScheduling}
          />
        </TouchableOpacity>

        {throwbackEnabled && (
          <View style={styles.timeSection}>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.timePickerButton, showTimePicker && styles.timePickerButtonActive]}
              onPress={handleTimePickerPress}
              accessibilityLabel={`Current memory reminder time: ${formattedSelectedTime}`}
              accessibilityHint="Tap to change memory reminder time"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <View style={styles.timePickerContent}>
                <View style={styles.timeIconContainer}>
                  <Icon name="clock-outline" size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.timePickerButtonText}>Saat: {formattedSelectedTime}</Text>
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: showTimePicker ? '90deg' : '0deg',
                      },
                    ],
                  }}
                >
                  <Icon name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                </Animated.View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {Platform.OS === 'ios' && showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour
            display="spinner"
            onChange={onTimeChange}
            textColor={theme.colors.onSurface}
            accentColor={theme.colors.primary}
            accessibilityLabel="Select memory reminder time"
            accessibilityHint="Choose the time for daily memory reminders"
            style={styles.timePicker}
          />
        )}

        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour
            display="default"
            onChange={onTimeChange}
            textColor={theme.colors.onSurface}
            accentColor={theme.colors.primary}
            accessibilityLabel="Select memory reminder time"
            accessibilityHint="Choose the time for daily memory reminders"
          />
        )}
      </Animated.View>
    );
  }
);

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      marginBottom: theme.spacing.md,
      marginHorizontal: theme.spacing.md,
      overflow: 'hidden',
      // 🌟 Enhanced shadow for premium feel
      ...getPrimaryShadow.medium(theme),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
      // Enhanced visual feedback
      borderWidth: 2,
      borderColor: theme.colors.primaryContainer,
    },
    iconContainerActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primaryContainer,
      // Subtle glow effect
      ...getPrimaryShadow.small(theme),
    },
    iconContainerLoading: {
      opacity: 0.7,
    },
    textContainer: {
      flex: 1,
    },
    settingTitle: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
      letterSpacing: 0.1,
    },
    settingDescription: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 20,
    },
    settingDescriptionActive: {
      color: theme.colors.primary,
      fontWeight: '500',
    },

    timeSection: {
      paddingBottom: theme.spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '20',
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    timePickerButton: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant + '40',
      marginHorizontal: theme.spacing.lg,
      // Enhanced interactive feedback
      borderWidth: 1,
      borderColor: theme.colors.surfaceVariant + '40',
    },
    timePickerButtonActive: {
      backgroundColor: theme.colors.primaryContainer + '60',
      borderColor: theme.colors.primary + '30',
      transform: [{ scale: 0.99 }],
    },
    timePickerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + 2,
    },
    timeIconContainer: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    timePickerButtonText: {
      flex: 1,
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    timePicker: {
      width: '100%',
      backgroundColor: theme.colors.surface,
    },
  });

// Set display name for debugging
EnhancedThrowbackReminderSettings.displayName = 'EnhancedThrowbackReminderSettings';

export default EnhancedThrowbackReminderSettings;
