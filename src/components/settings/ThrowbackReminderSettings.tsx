import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import { useTheme } from '../../providers/ThemeProvider';
import { analyticsService } from '../../services/analyticsService';
import { hapticFeedback } from '../../utils/hapticFeedback';
import { logger } from '../../utils/debugConfig';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';
import { getPrimaryShadow } from '@/themes/utils';

import type { Profile } from '../../schemas/profileSchema';
import type { AppTheme } from '../../themes/types';

const frequencyOptions: {
  label: string;
  value: Profile['throwback_reminder_frequency'];
  icon: string;
}[] = [
  {
    label: 'Günlük',
    value: 'daily',
    icon: 'calendar-today',
  },
  { label: 'Haftalık', value: 'weekly', icon: 'calendar-week' },
  { label: 'Aylık', value: 'monthly', icon: 'calendar-month' },
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

/**
 * **SIMPLIFIED THROWBACK REMINDER SETTINGS**: Minimal, elegant settings experience
 *
 * **ANIMATION SIMPLIFICATION COMPLETED**:
 * - Reduced from 15+ animation instances to 1 (93% reduction)
 * - Eliminated LayoutAnimation calls (cardScale, expandAnimation, timePickerOpacity, timePickerHeight, iconRotation)
 * - Replaced with subtle layout transitions using coordinated animations
 * - Removed complex parallel animations and sequences
 * - Simplified time picker expansion with coordinated layout transitions
 */
const EnhancedThrowbackReminderSettings: React.FC<ThrowbackReminderSettingsProps> = React.memo(
  ({ throwbackEnabled, throwbackFrequency, throwbackReminderTime, onUpdateSettings }) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    // **SIMPLIFIED ANIMATION SYSTEM**: Single coordinated instance (15+ → 1, 93% reduction)
    const animations = useCoordinatedAnimations();

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

    // **MINIMAL LAYOUT TRANSITIONS**: Replace LayoutAnimation with coordinated transitions
    const handleLayoutTransition = useCallback(
      (expanded: boolean) => {
        const targetHeight = expanded ? 100 : 0;
        animations.animateLayoutTransition(expanded, targetHeight, { duration: 300 });
      },
      [animations]
    );

    const animateTimePicker = useCallback(
      (show: boolean) => {
        setShowTimePicker(show);
        // **SIMPLIFIED TIME PICKER**: Coordinated layout transition instead of complex parallel animations
        const targetHeight = show ? 200 : 0;
        animations.animateLayoutTransition(show, targetHeight, { duration: 250 });
      },
      [animations]
    );

    const toggleThrowbackSwitch = useCallback(() => {
      const newEnabled = !throwbackEnabled;
      const timeString = selectedTime.toTimeString().split(' ')[0]; // Get HH:MM:SS format

      // **MINIMAL PRESS FEEDBACK**: Simple coordinated press animation
      animations.animatePressIn();
      setTimeout(() => animations.animatePressOut(), 150);

      // **COORDINATED LAYOUT TRANSITION**: Replace LayoutAnimation with coordinated transition
      handleLayoutTransition(newEnabled);

      // Provide haptic feedback for toggle interaction
      hapticFeedback.medium();

      onUpdateSettings({
        throwback_reminder_enabled: newEnabled,
        throwback_reminder_frequency: selectedFrequency,
        throwback_reminder_time: timeString,
      });

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
    }, [
      throwbackEnabled,
      selectedFrequency,
      selectedTime,
      onUpdateSettings,
      animations,
      handleLayoutTransition,
    ]);

    const handleFrequencyChange = useCallback(
      (frequency: Profile['throwback_reminder_frequency']) => {
        setSelectedFrequency(frequency);
        const timeString = selectedTime.toTimeString().split(' ')[0]; // Get HH:MM:SS format

        // Provide haptic feedback for selection change
        hapticFeedback.light();

        onUpdateSettings({
          throwback_reminder_enabled: throwbackEnabled,
          throwback_reminder_frequency: frequency,
          throwback_reminder_time: timeString,
        });

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
      },
      [selectedTime, onUpdateSettings, throwbackEnabled, throwbackFrequency]
    );

    const handleTimeChange = useCallback(
      (event: DateTimePickerEvent, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
          animateTimePicker(false);
        } else {
          setShowTimePicker(false);
        }

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
      },
      [throwbackEnabled, selectedFrequency, onUpdateSettings, animateTimePicker]
    );

    const handleTimePickerPress = useCallback(() => {
      if (Platform.OS === 'ios') {
        setShowTimePicker(true);
        animateTimePicker(true);
      } else {
        setShowTimePicker(true);
      }
      hapticFeedback.light();
    }, [animateTimePicker]);

    const formatTime = useCallback((date: Date): string => {
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }, []);

    const getFrequencyLabel = useCallback(() => {
      const option = frequencyOptions.find((opt) => opt.value === selectedFrequency);
      return option ? option.label : 'Haftalık';
    }, [selectedFrequency]);

    const getScheduleDescription = useCallback(() => {
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
    }, [throwbackEnabled, selectedTime, selectedFrequency, formatTime, getFrequencyLabel]);

    // **SIMPLIFIED STYLES**: Basic memoized styles for minimal animation system
    const cardTransform = useMemo(() => [{ scale: animations.scaleAnim }], [animations.scaleAnim]);

    return (
      <Animated.View style={[styles.settingCard, { transform: cardTransform }]}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={toggleThrowbackSwitch}
          activeOpacity={0.8}
        >
          <View style={styles.settingInfo}>
            <View style={[styles.iconContainer, throwbackEnabled && styles.iconContainerActive]}>
              <Icon
                name="history"
                size={20}
                color={throwbackEnabled ? theme.colors.onPrimary : theme.colors.primary}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.settingTitle}>Geçmiş Hatırlatıcı</Text>
              <Text
                style={[
                  styles.settingDescription,
                  throwbackEnabled && styles.settingDescriptionActive,
                ]}
              >
                {getScheduleDescription()}
              </Text>
            </View>
          </View>
          <ThemedSwitch
            value={throwbackEnabled}
            onValueChange={toggleThrowbackSwitch}
            size="medium"
            testID="throwback-reminder-switch"
          />
        </TouchableOpacity>

        <View style={[styles.expandedContent, !throwbackEnabled && styles.collapsedContent]}>
          {throwbackEnabled && (
            <View style={styles.frequencySection}>
              <View style={styles.divider} />

              {/* Frequency Selection */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Icon name="repeat" size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.sectionLabel}>Sıklık</Text>
              </View>

              <View style={styles.frequencyGrid}>
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.frequencyOption,
                      selectedFrequency === option.value && styles.frequencyOptionSelected,
                    ]}
                    onPress={() => handleFrequencyChange(option.value)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.frequencyIconContainer,
                        selectedFrequency === option.value && styles.frequencyIconContainerSelected,
                      ]}
                    >
                      <Icon
                        name={option.icon}
                        size={18}
                        color={
                          selectedFrequency === option.value
                            ? theme.colors.onPrimary
                            : theme.colors.primary
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.frequencyOptionText,
                        selectedFrequency === option.value && styles.frequencyOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Time Picker Section */}
              <View style={styles.timeSection}>
                <View style={styles.divider} />
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Icon name="clock-outline" size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.sectionLabel}>Saat</Text>
                </View>
                <TouchableOpacity
                  style={[styles.timePickerButton, showTimePicker && styles.timePickerButtonActive]}
                  onPress={handleTimePickerPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.timePickerContent}>
                    <View style={styles.timeDisplayContainer}>
                      <Text style={styles.timeText}>{formatTime(selectedTime)}</Text>
                      <Text style={styles.timeLabel}>Hatırlatma saati</Text>
                    </View>
                    <View
                      style={{
                        transform: [
                          {
                            rotate: showTimePicker ? '90deg' : '0deg',
                          },
                        ],
                      }}
                    >
                      <Icon name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </View>
                </TouchableOpacity>

                {Platform.OS === 'ios' && showTimePicker && (
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      is24Hour={true}
                      display="spinner"
                      onChange={handleTimeChange}
                      style={styles.timePicker}
                      textColor={theme.colors.onSurface}
                      accentColor={theme.colors.primary}
                    />
                  </View>
                )}

                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={handleTimeChange}
                    textColor={theme.colors.onSurface}
                    accentColor={theme.colors.primary}
                  />
                )}
              </View>
            </View>
          )}
        </View>
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

    expandedContent: {
      overflow: 'hidden',
    },
    collapsedContent: {
      height: 0,
      overflow: 'hidden',
    },
    frequencySection: {
      paddingBottom: theme.spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.outline + '20',
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    sectionIconContainer: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    sectionLabel: {
      ...theme.typography.labelLarge,
      color: theme.colors.onSurface,
      fontWeight: '600',
      letterSpacing: 0.2,
    },

    // Enhanced frequency selection with grid layout
    frequencyGrid: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    frequencyOption: {
      flex: 1,
      backgroundColor: theme.colors.surfaceVariant + '40',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.sm,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surfaceVariant + '40',
      minHeight: 60,
    },
    frequencyOptionSelected: {
      backgroundColor: theme.colors.primaryContainer + '80',
      borderColor: theme.colors.primary + '50',
      ...getPrimaryShadow.small(theme),
    },
    frequencyIconContainer: {
      width: 32,
      height: 32,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    frequencyIconContainerSelected: {
      backgroundColor: theme.colors.primary,
    },
    frequencyOptionText: {
      ...theme.typography.labelMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
      textAlign: 'center',
    },
    frequencyOptionTextSelected: {
      color: theme.colors.primary,
    },

    timeSection: {
      paddingBottom: theme.spacing.md,
    },
    timePickerButton: {
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surfaceVariant + '40',
      marginHorizontal: theme.spacing.lg,
      borderWidth: 2,
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
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    timeDisplayContainer: {
      flex: 1,
    },
    timeText: {
      ...theme.typography.headlineSmall,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs / 2,
    },
    timeLabel: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
    },
    timePickerContainer: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
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
EnhancedThrowbackReminderSettings.displayName = 'EnhancedThrowbackReminderSettings';

export default EnhancedThrowbackReminderSettings;
