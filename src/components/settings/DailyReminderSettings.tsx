import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';

import { useTheme } from '../../providers/ThemeProvider';
import { useGlobalError } from '@/providers/GlobalErrorProvider';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';
import { notificationService } from '../../services/notificationService';
import { analyticsService } from '../../services/analyticsService';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { logger } from '../../utils/debugConfig';
import { getPrimaryShadow } from '@/themes/utils';

import type { AppTheme } from '../../themes/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DailyReminderSettingsProps {
  reminderEnabled: boolean;
  reminderTime: string | null | undefined;
  onUpdateSettings: (settings: { reminder_enabled: boolean; reminder_time?: string }) => void;
}

const EnhancedDailyReminderSettings: React.FC<DailyReminderSettingsProps> = React.memo(
  ({ reminderEnabled, reminderTime, onUpdateSettings }) => {
    const { theme } = useTheme();
    const { showError } = useGlobalError();
    const styles = createStyles(theme);

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [selectedTime, setSelectedTime] = useState(() =>
      parseTimeStringToValidDate(reminderTime)
    );
    const [isScheduling, setIsScheduling] = useState(false);

    // Animated values for smooth interactions
    const cardScale = useMemo(() => new Animated.Value(1), []);
    const timePickerOpacity = useMemo(() => new Animated.Value(0), []);
    const timePickerHeight = useMemo(() => new Animated.Value(0), []);
    const iconRotation = useMemo(
      () => new Animated.Value(reminderEnabled ? 1 : 0),
      [reminderEnabled]
    );

    useEffect(() => {
      setSelectedTime(parseTimeStringToValidDate(reminderTime));
    }, [reminderTime]);

    // Animate switch state change
    useEffect(() => {
      Animated.timing(iconRotation, {
        toValue: reminderEnabled ? 1 : 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    }, [reminderEnabled, iconRotation]);

    const handleNotificationScheduling = useCallback(
      async (enabled: boolean, time: Date) => {
        setIsScheduling(true);
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

              // 🛡️ ERROR PROTECTION: Use global error system instead of Alert
              showError(
                'Günlük hatırlatıcı ayarlanamadı. Lütfen bildirim izinlerini kontrol edin.'
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

          // 🛡️ ERROR PROTECTION: Use global error system instead of Alert
          showError('Hatırlatıcı ayarlanırken bir hata oluştu.');

          // Provide error haptic feedback
          hapticFeedback.error();
        } finally {
          setIsScheduling(false);
        }
      },
      [showError]
    );

    const animateTimePicker = useCallback(
      (show: boolean) => {
        const animations = [
          Animated.timing(timePickerOpacity, {
            toValue: show ? 1 : 0,
            duration: 250,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: false,
          }),
          Animated.timing(timePickerHeight, {
            toValue: show ? 1 : 0,
            duration: 250,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: false,
          }),
        ];

        if (show) {
          Animated.parallel(animations).start();
        } else {
          Animated.parallel(animations).start(() => {
            setShowTimePicker(false);
          });
        }
      },
      [timePickerOpacity, timePickerHeight]
    );

    const onTimeChange = useCallback(
      (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') {
          animateTimePicker(false);
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
      },
      [onUpdateSettings, animateTimePicker, handleNotificationScheduling]
    );

    const toggleReminderSwitch = useCallback(() => {
      const newEnabled = !reminderEnabled;

      // Animate card interaction
      Animated.sequence([
        Animated.timing(cardScale, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Configure smooth layout animation
      LayoutAnimation.configureNext({
        duration: 300,
        create: { type: 'easeInEaseOut', property: 'opacity' },
        update: { type: 'easeInEaseOut' },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
      });

      // Provide haptic feedback for toggle interaction
      hapticFeedback.medium();

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
    }, [reminderEnabled, selectedTime, onUpdateSettings, cardScale, handleNotificationScheduling]);

    const handleTimePickerPress = useCallback(() => {
      if (Platform.OS === 'ios') {
        setShowTimePicker(true);
        animateTimePicker(true);
      } else {
        setShowTimePicker(true);
      }
      hapticFeedback.light();
    }, [animateTimePicker]);

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

    const iconRotationStyle = useMemo(
      () => ({
        transform: [
          {
            rotate: iconRotation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '15deg'],
            }),
          },
        ],
      }),
      [iconRotation]
    );

    const timePickerAnimatedStyle = useMemo(
      () => ({
        opacity: timePickerOpacity,
        maxHeight: timePickerHeight.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 300],
        }),
      }),
      [timePickerOpacity, timePickerHeight]
    );

    return (
      <Animated.View style={[styles.settingCard, { transform: [{ scale: cardScale }] }]}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={toggleReminderSwitch}
          activeOpacity={0.8}
          disabled={isScheduling}
        >
          <View style={styles.settingInfo}>
            <View
              style={[
                styles.iconContainer,
                reminderEnabled && styles.iconContainerActive,
                isScheduling && styles.iconContainerLoading,
              ]}
            >
              <Animated.View style={iconRotationStyle}>
                <Icon
                  name={isScheduling ? 'loading' : 'bell-outline'}
                  size={20}
                  color={reminderEnabled ? theme.colors.onPrimary : theme.colors.primary}
                />
              </Animated.View>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>Günlük Hatırlatıcı</Text>
              <Text
                style={[
                  styles.settingDescription,
                  reminderEnabled && styles.settingDescriptionActive,
                ]}
              >
                {reminderEnabled ? `Her gün ${formattedSelectedTime}` : 'Kapalı'}
              </Text>
            </View>
          </View>
          <ThemedSwitch
            value={reminderEnabled}
            onValueChange={toggleReminderSwitch}
            size="medium"
            testID="daily-reminder-switch"
            disabled={isScheduling}
          />
        </TouchableOpacity>

        {reminderEnabled && (
          <View style={styles.timeSection}>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[styles.timePickerButton, showTimePicker && styles.timePickerButtonActive]}
              onPress={handleTimePickerPress}
              accessibilityLabel={`Current reminder time: ${formattedSelectedTime}`}
              accessibilityHint="Tap to change reminder time"
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
          <Animated.View style={[styles.timePickerContainer, timePickerAnimatedStyle]}>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              is24Hour
              display="spinner"
              onChange={onTimeChange}
              textColor={theme.colors.onSurface}
              accentColor={theme.colors.primary}
              accessibilityLabel="Select reminder time"
              accessibilityHint="Choose the time for daily reminders"
              style={styles.timePicker}
            />
          </Animated.View>
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
            accessibilityLabel="Select reminder time"
            accessibilityHint="Choose the time for daily reminders"
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
    timePickerContainer: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant + '20',
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
    },
    timePicker: {
      width: '100%',
      backgroundColor: theme.colors.surface,
    },
  });

// Set display name for debugging
EnhancedDailyReminderSettings.displayName = 'EnhancedDailyReminderSettings';

export default EnhancedDailyReminderSettings;
