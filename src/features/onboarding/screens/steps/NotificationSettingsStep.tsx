import { analyticsService } from '@/services/analyticsService';
import { useTheme } from '@/providers/ThemeProvider';
import { useToast } from '@/providers/ToastProvider';
import type { AppTheme } from '@/themes/types';
import { hapticFeedback } from '@/utils/hapticFeedback';
import { notificationService } from '@/services/notificationService';
import { logger } from '@/utils/debugConfig';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useCoordinatedAnimations } from '@/shared/hooks/useCoordinatedAnimations';

import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ThemedSwitch from '@/shared/components/ui/ThemedSwitch';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '@/components/onboarding/OnboardingButton';
import { ScreenSection } from '@/shared/components/layout';
import { openNotificationSettings } from '../../../../utils/deviceUtils';

interface NotificationSettingsStepProps {
  onNext: (settings: NotificationSettings) => void;
  onBack?: () => void;
  initialSettings?: NotificationSettings;
}

interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:MM:SS format
  throwbackEnabled: boolean;
  throwbackTime: string; // HH:MM:SS format
}

export const NotificationSettingsStep: React.FC<NotificationSettingsStepProps> = ({
  onNext,
  onBack,
  initialSettings,
}) => {
  const { theme } = useTheme();
  const { showWarning } = useToast();
  const styles = createStyles(theme);

  const [settings, setSettings] = useState<NotificationSettings>(
    initialSettings || {
      dailyReminderEnabled: true,
      dailyReminderTime: '10:00:00',
      throwbackEnabled: true,
      throwbackTime: '14:00:00',
    }
  );

  const [showDailyTimePicker, setShowDailyTimePicker] = useState(false);
  const [showThrowbackTimePicker, setShowThrowbackTimePicker] = useState(false);
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  // **COORDINATED ANIMATION SYSTEM**: Single instance for all animations
  const animations = useCoordinatedAnimations();

  // **COORDINATED ENTRANCE**: Simple entrance animation
  useEffect(() => {
    // Analytics tracking
    analyticsService.logScreenView('onboarding_notification_settings_step');

    // Use coordinated entrance animation instead of direct Animated.timing
    animations.animateEntrance({ duration: 400 });
  }, [animations]);

  // 🚀 TOAST INTEGRATION: Request notification permissions with toast feedback
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const hasPermissions = await notificationService.requestPermissions();
        setPermissionsRequested(true);

        if (!hasPermissions) {
          // 🚀 TOAST INTEGRATION: Use toast warning with action button instead of Alert.alert
          showWarning(
            'Minnettarlık hatırlatmaları için bildirim izni gerekiyor. Ayarlardan izin verebilirsiniz.',
            {
              duration: 8000, // Give user time to read and act
              action: {
                label: 'Ayarlar',
                onPress: openNotificationSettings,
              },
            }
          );
        }

        analyticsService.logEvent('onboarding_notif_perms_requested', {
          granted: hasPermissions,
        });
      } catch (error) {
        logger.error('Failed to request notification permissions:', error as Error);
      }
    };

    requestPermissions();
  }, [showWarning]);

  const handleSettingChange = useCallback(
    (key: keyof NotificationSettings, value: boolean | string) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
      hapticFeedback.light();

      analyticsService.logEvent('onboarding_notification_setting_changed', {
        setting: key,
        value,
      });
    },
    []
  );

  const handleTimeChange = useCallback(
    (type: 'daily' | 'throwback') => (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        if (type === 'daily') {
          setShowDailyTimePicker(false);
        } else {
          setShowThrowbackTimePicker(false);
        }
      }

      if (selectedDate) {
        const timeString = selectedDate.toTimeString().split(' ')[0]; // HH:MM:SS
        const setting = type === 'daily' ? 'dailyReminderTime' : 'throwbackTime';

        handleSettingChange(setting, timeString);
        hapticFeedback.light();

        analyticsService.logEvent('onboarding_notification_time_changed', {
          type,
          time: timeString,
        });
      }
    },
    [handleSettingChange]
  );

  const formatTime = useCallback((timeString: string): string => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  }, []);

  const parseTime = useCallback((timeString: string): Date => {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0);
    return date;
  }, []);

  const handleContinue = useCallback(() => {
    hapticFeedback.success();

    analyticsService.logEvent('onboarding_notif_settings_done', {
      daily_enabled: settings.dailyReminderEnabled,
      daily_time: settings.dailyReminderTime,
      throwback_enabled: settings.throwbackEnabled,
      throwback_time: settings.throwbackTime,
      permissions_requested: permissionsRequested,
    });

    onNext(settings);
  }, [settings, permissionsRequested, onNext]);

  return (
    <OnboardingLayout edgeToEdge={true}>
      <Animated.View style={[styles.container, { opacity: animations.fadeAnim }]}>
        {/* Enhanced Navigation Header with Better Back Button */}
        {onBack && (
          <ScreenSection>
            <View style={styles.navigationHeader}>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback.light();
                  onBack();
                }}
                style={styles.backButtonContainer}
                activeOpacity={0.7}
                accessibilityLabel="Geri dön"
                accessibilityRole="button"
                accessibilityHint="Önceki adıma geri dön"
              >
                <View style={styles.backButtonInner}>
                  <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} />
                  <Text style={styles.backButtonText}>Geri</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScreenSection>
        )}

        {/* Content Header */}
        <ScreenSection>
          <View style={styles.header}>
            <Text style={styles.title}>Bildirim Ayarları 🔔</Text>
            <Text style={styles.subtitle}>
              Minnettarlık alışkanlığını güçlendirmek için hatırlatıcıları ayarlayalım. İstediğin
              zaman değiştirebilirsin.
            </Text>
          </View>
        </ScreenSection>

        {/* Daily Reminder Section */}
        <ScreenSection title="Günlük Hatırlatıcı">
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="alarm" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingTitleContainer}>
                <Text style={styles.settingTitle}>Günlük Minnettarlık</Text>
                <Text style={styles.settingDescription}>
                  Her gün hatırlat, yeni kayıt ekleyeyim
                </Text>
              </View>
              <ThemedSwitch
                value={settings.dailyReminderEnabled}
                onValueChange={(value: boolean) =>
                  handleSettingChange('dailyReminderEnabled', value)
                }
                size="medium"
                testID="daily-reminder-switch"
              />
            </View>

            {settings.dailyReminderEnabled && (
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setShowDailyTimePicker(true)}
                accessibilityLabel={`Günlük hatırlatıcı saati: ${formatTime(settings.dailyReminderTime)}`}
                accessibilityRole="button"
              >
                <Text style={styles.timeSelectorLabel}>Saat:</Text>
                <View style={styles.timeDisplay}>
                  <Ionicons name="time" size={18} color={theme.colors.primary} />
                  <Text style={styles.timeText}>{formatTime(settings.dailyReminderTime)}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScreenSection>

        {/* Throwback Reminder Section */}
        <ScreenSection title="Anı Hatırlatıcı">
          <View style={styles.settingCard}>
            <View style={styles.settingHeader}>
              <View style={styles.settingIconWrapper}>
                <Ionicons name="time" size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.settingTitleContainer}>
                <Text style={styles.settingTitle}>Anı Hatırlatıcı</Text>
                <Text style={styles.settingDescription}>
                  Her gün geçmiş minnettarlıklarını hatırlat
                </Text>
              </View>
              <ThemedSwitch
                value={settings.throwbackEnabled}
                onValueChange={(value: boolean) => handleSettingChange('throwbackEnabled', value)}
                size="medium"
                testID="throwback-reminder-switch"
              />
            </View>

            {settings.throwbackEnabled && (
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setShowThrowbackTimePicker(true)}
                accessibilityLabel={`Anı hatırlatıcı saati: ${formatTime(settings.throwbackTime)}`}
                accessibilityRole="button"
              >
                <Text style={styles.timeSelectorLabel}>Saat:</Text>
                <View style={styles.timeDisplay}>
                  <Ionicons name="time" size={18} color={theme.colors.primary} />
                  <Text style={styles.timeText}>{formatTime(settings.throwbackTime)}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </ScreenSection>

        {/* Continue Button */}
        <ScreenSection>
          <OnboardingButton
            onPress={handleContinue}
            title="Devam Et"
            accessibilityLabel="Bildirim ayarlarını kaydet ve devam et"
          />
        </ScreenSection>

        {/* Time Pickers */}
        {showDailyTimePicker && (
          <DateTimePicker
            value={parseTime(settings.dailyReminderTime)}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange('daily')}
            textColor={theme.colors.onSurface}
          />
        )}

        {showThrowbackTimePicker && (
          <DateTimePicker
            value={parseTime(settings.throwbackTime)}
            mode="time"
            is24Hour
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange('throwback')}
            textColor={theme.colors.onSurface}
          />
        )}
      </Animated.View>
    </OnboardingLayout>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    navigationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    backButtonContainer: {
      padding: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface + 'CC',
      borderWidth: 1,
      borderColor: theme.colors.outline + '20',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    backButtonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    backButtonText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    header: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      ...theme.typography.body1,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    settingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    settingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    settingIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    settingTitleContainer: {
      flex: 1,
    },
    settingTitle: {
      ...theme.typography.body1,
      color: theme.colors.text,
      fontWeight: '600',
      marginBottom: 4,
    },
    settingDescription: {
      ...theme.typography.body2,
      color: theme.colors.textSecondary,
    },
    timeSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.md,
      marginTop: theme.spacing.sm,
    },
    timeSelectorLabel: {
      ...theme.typography.body1,
      color: theme.colors.text,
      fontWeight: '500',
    },
    timeDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    timeText: {
      ...theme.typography.body1,
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 18,
    },

    continueButton: {
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.xl,
    },
    continueButtonContent: {
      paddingVertical: theme.spacing.sm,
    },
  });

export default NotificationSettingsStep;
