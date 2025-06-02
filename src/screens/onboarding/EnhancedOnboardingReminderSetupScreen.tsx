import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { updateProfileSchema } from '../../schemas/profileSchema';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ToggleSwitch from 'toggle-switch-react-native';

import * as profileApi from '../../api/profileApi';
import ErrorState from '../../components/states/ErrorState';
import LoadingState from '../../components/states/LoadingState';
import ThemedButton from '../../components/ThemedButton';
import ThemedCard from '../../components/ThemedCard';
import { useTheme } from '../../providers/ThemeProvider';
import { analyticsService } from '../../services/analyticsService';
import {
  cancelAllScheduledNotifications,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '../../services/notificationService';
import { type ProfileState, useProfileStore } from '../../store/profileStore';
import { AppTheme } from '../../themes/types';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';
import { RootStackParamList } from '../../types/navigation';

type OnboardingReminderSetupNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'OnboardingReminderSetup'
>;

/**
 * EnhancedOnboardingReminderSetupScreen allows users to configure daily reminders
 * for their gratitude practice with improved animations, accessibility, and error handling.
 */


const EnhancedOnboardingReminderSetupScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const _navigation = useNavigation<OnboardingReminderSetupNavigationProp>();
  const { id, reminder_enabled, reminder_time, setProfile, setLoading } =
    useProfileStore();

  // Local state
  const [localReminderEnabled, setLocalReminderEnabled] = useState(
    reminder_enabled !== undefined ? reminder_enabled : true
  );
  const [localReminderTime, setLocalReminderTime] = useState(() => parseTimeStringToValidDate(reminder_time));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled =
        await AccessibilityInfo.isScreenReaderEnabled();
      setIsScreenReaderEnabled(screenReaderEnabled);
    };

    checkScreenReader();

    // Subscribe to screen reader changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Sync with profile store
  useEffect(() => {
    setLocalReminderEnabled(
      reminder_enabled !== undefined ? reminder_enabled : true
    );
    setLocalReminderTime(parseTimeStringToValidDate(reminder_time));
  }, [reminder_enabled, reminder_time]);

  // Handle time picker changes
  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (selectedDate) {
        setLocalReminderTime(selectedDate);
      }
    },
    []
  );

  // Toggle time picker visibility
  const toggleTimePicker = useCallback(() => {
    setShowTimePicker(prev => !prev);
  }, []);

  // Handle toggle switch changes
  const handleToggleChange = useCallback((isOn: boolean) => {
    setLocalReminderEnabled(isOn);
  }, []);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // Save settings and complete onboarding
  const handleSaveSettings = useCallback(async () => {
    if (!id) {
      Alert.alert('Hata', 'Kullanıcı kimliği bulunamadı.', [{ text: 'Tamam' }]);
      return;
    }

    setIsSaving(true);
    setLoading(true);
    setError(null);

    const timeString = localReminderTime.toTimeString().split(' ')[0]; // HH:MM:SS

    try {
      // Prepare payload for Zod validation
      const validationPayload = {
        onboarded: true,
        reminder_enabled: localReminderEnabled,
        reminder_time: localReminderEnabled ? timeString : null,
      };

      const validationResult = updateProfileSchema.safeParse(validationPayload);

      if (!validationResult.success) {
        const fieldErrors = validationResult.error.flatten().fieldErrors;
        let errorMessage = 'Lütfen hataları düzeltin:';
        if (fieldErrors.reminder_time && fieldErrors.reminder_time[0]) {
          errorMessage = `Hatırlatıcı zamanı: ${fieldErrors.reminder_time[0]}`;
        } else if (fieldErrors.reminder_enabled && fieldErrors.reminder_enabled[0]) {
          errorMessage = `Hatırlatıcı durumu: ${fieldErrors.reminder_enabled[0]}`;
        } else {
          const firstErrorKey = Object.keys(fieldErrors)[0] as keyof typeof fieldErrors;
          if (firstErrorKey && fieldErrors[firstErrorKey]?.[0]) {
            errorMessage = `${firstErrorKey}: ${fieldErrors[firstErrorKey]?.[0]}`;
          } else {
            errorMessage = validationResult.error.issues[0]?.message || 'Geçersiz ayarlar.';
          }
        }
        setError(errorMessage);
        setIsSaving(false);
        setLoading(false);
        return;
      }

      // Start with validated data, may be adjusted by permissions
      const profileUpdateData = { ...validationResult.data };

      if (validationResult.data.reminder_enabled) {
        const permissionGranted = await requestNotificationPermissions();
        if (permissionGranted) {
          const hour = localReminderTime.getHours();
          const minute = localReminderTime.getMinutes();
          await scheduleDailyReminder(
            hour,
            minute,
            'Günlük Minnettarlık Zamanı',
            'Bugün neleri fark ettin? Yazmaya ne dersin?'
          );
        } else {
          // Permission denied, so force reminders off
          profileUpdateData.reminder_enabled = false;
          profileUpdateData.reminder_time = null;
        }
      } else {
        // User intended to disable reminders or permission was denied
        await cancelAllScheduledNotifications();
        // Ensure these are explicitly set if reminders end up disabled
        profileUpdateData.reminder_enabled = false;
        profileUpdateData.reminder_time = null;
      }

      await profileApi.updateProfile(profileUpdateData);
      setProfile(profileUpdateData);

      analyticsService.logEvent('onboarding_completed', {
        reminders_skipped: false,
        reminder_time: profileUpdateData.reminder_time ?? null, // Provide null if undefined
        reminder_enabled: profileUpdateData.reminder_enabled ?? false, // Provide false if undefined
      });

      // Navigation to MainApp is now handled by RootNavigator's conditional rendering
    } catch (error: unknown) {
      console.error('Onboarding tamamlama hatası (hatırlatıcı):', error);
      let errorMessage = 'Onboarding tamamlanamadı.';

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

      setError(errorMessage);
    } finally {
      setIsSaving(false);
      setLoading(false);
    }
  }, [id, localReminderEnabled, localReminderTime, setLoading, setProfile]);

  // Skip reminder setup and complete onboarding
  const handleSkip = useCallback(async () => {
    if (!id) {
      Alert.alert('Hata', 'Kullanıcı kimliği bulunamadı.', [{ text: 'Tamam' }]);
      return;
    }

    setIsSkipping(true);
    setLoading(true);
    setError(null);

    try {
      const validationPayload = {
        onboarded: true,
        reminder_enabled: false,
        reminder_time: null, // Explicitly set to null when skipping
      };

      const validationResult = updateProfileSchema
        .pick({
          onboarded: true,
          reminder_enabled: true,
          reminder_time: true,
        })
        .safeParse(validationPayload);

      if (!validationResult.success) {
        const errorMessage = validationResult.error.issues[0]?.message || 'Ayarlar kaydedilemedi.';
        setError(errorMessage);
        setIsSkipping(false);
        setLoading(false);
        return;
      }

      const profileUpdateData = { ...validationResult.data };

      await profileApi.updateProfile(profileUpdateData);
      setProfile(profileUpdateData);
      await cancelAllScheduledNotifications();

      analyticsService.logEvent('onboarding_reminder_setup_skipped');
      analyticsService.logEvent('onboarding_completed', {
        reminders_skipped: true,
      });

      // Navigation to MainApp is now handled by RootNavigator's conditional rendering
    } catch (error: unknown) {
      console.error('Onboarding skip error:', error);
      let errorMessage = 'Onboarding atlanamadı.';

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

      setError(errorMessage);
    } finally {
      setIsSkipping(false);
      setLoading(false);
    }
  }, [id, setLoading, setProfile]);

  // Show error state if there's an error
  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState
          title="İşlem Hatası"
          message={error}
          onRetry={handleRetry}
          icon="alert-circle-outline"
        />
      </View>
    );
  }

  // Show loading state if saving or skipping
  if (isSaving || isSkipping) {
    return (
      <View style={styles.container}>
        <LoadingState
          message={isSaving ? 'Ayarlar kaydediliyor...' : 'Atlanıyor...'}
        />
      </View>
    );
  }

  // Render screen reader optimized version
  if (isScreenReaderEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title} accessibilityRole="header">
          Günlük Hatırlatıcı
        </Text>

        <Text style={styles.description} accessibilityRole="text">
          Harika! Yeşer'i keşfetmeye hazırsın. Minnettarlık pratiğini sürdürmene
          yardımcı olmak için şimdi günlük bir hatırlatıcı ayarlayabilirsin.
        </Text>

        <View style={styles.accessibleSettingContainer}>
          <Text style={styles.accessibleSettingLabel}>
            Hatırlatıcıları Etkinleştir:{' '}
            {localReminderEnabled ? 'Açık' : 'Kapalı'}
          </Text>

          <ThemedButton
            title={
              localReminderEnabled
                ? 'Hatırlatıcıları Kapat'
                : 'Hatırlatıcıları Aç'
            }
            onPress={() => setLocalReminderEnabled(!localReminderEnabled)}
            variant="secondary"
            style={styles.accessibleButton}
          />

          {localReminderEnabled && (
            <>
              <Text style={styles.accessibleSettingLabel}>
                Hatırlatma Saati:{' '}
                {localReminderTime.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>

              <ThemedButton
                title="Saati Değiştir"
                onPress={toggleTimePicker}
                variant="secondary"
                style={styles.accessibleButton}
              />
            </>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={localReminderTime}
              mode="time"
              is24Hour={true}
              display="spinner"
              onChange={handleTimeChange}
              accessibilityLabel="Hatırlatma saati seçici"
            />
          )}
        </View>

        <View style={styles.accessibleButtonContainer}>
          <ThemedButton
            title="Kaydet ve Bitir"
            onPress={handleSaveSettings}
            variant="primary"
            style={styles.accessibleButton}
            accessibilityLabel="Ayarları kaydet ve onboarding'i tamamla"
          />

          <ThemedButton
            title="Şimdilik Atla"
            onPress={handleSkip}
            variant="secondary"
            style={styles.accessibleButton}
            accessibilityLabel="Hatırlatıcı ayarlarını atla ve onboarding'i tamamla"
          />
        </View>
      </View>
    );
  }

  // Render standard version with animations
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="notifications-outline"
          size={64}
          color={theme.colors.primary}
          accessibilityLabel="Hatırlatıcı ikonu"
        />
      </View>

      <Text style={styles.title} accessibilityRole="header">
        Günlük Hatırlatıcı
      </Text>

      <Text style={styles.description} accessibilityRole="text">
        Harika! Yeşer'i keşfetmeye hazırsın. Minnettarlık pratiğini sürdürmene
        yardımcı olmak için şimdi günlük bir hatırlatıcı ayarlayabilirsin.
      </Text>

      <ThemedCard variant="elevated" style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel} accessibilityRole="text">
            Hatırlatıcıları Etkinleştir
          </Text>
          <ToggleSwitch
            isOn={localReminderEnabled}
            onColor={theme.colors.primary}
            offColor={theme.colors.border}
            thumbOnStyle={{ backgroundColor: theme.colors.onPrimary }}
            thumbOffStyle={{ backgroundColor: theme.colors.surface }}
            size="medium"
            onToggle={handleToggleChange}
            // @ts-expect-error The ToggleSwitch component is expected to support accessibilityLabel
            accessibilityLabel={`Hatırlatıcıları ${localReminderEnabled ? 'kapat' : 'aç'}`}
            accessibilityRole="switch"
          />
        </View>

        {localReminderEnabled && (
          <View style={styles.timePickerRow}>
            <Text style={styles.settingLabel} accessibilityRole="text">
              Hatırlatma Saati:
            </Text>
            <TouchableOpacity
              onPress={toggleTimePicker}
              style={styles.timeDisplay}
              activeOpacity={0.7}
              accessibilityLabel={`Hatırlatma saati: ${localReminderTime.toLocaleTimeString(
                'tr-TR',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}`}
              accessibilityRole="button"
              accessibilityHint="Hatırlatma saatini değiştirmek için dokunun"
            >
              <Text style={styles.timeText}>
                {localReminderTime.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ThemedCard>

      {showTimePicker && (
        <View style={styles.timePickerContainer}>
          <DateTimePicker
            value={localReminderTime}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={handleTimeChange}
            accessibilityLabel="Hatırlatma saati seçici"
          />
        </View>
      )}

      <View style={styles.buttonContainer}>
        <ThemedButton
          title="Kaydet ve Bitir"
          onPress={handleSaveSettings}
          variant="primary"
          style={styles.button}
          accessibilityLabel="Ayarları kaydet ve onboarding'i tamamla"
        />

        <ThemedButton
          title="Şimdilik Atla"
          onPress={handleSkip}
          variant="secondary"
          style={styles.skipButton}
          accessibilityLabel="Hatırlatıcı ayarlarını atla ve onboarding'i tamamla"
        />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.large,
      backgroundColor: theme.colors.background,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.large,
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.medium,
    },
    description: {
      ...theme.typography.body1,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.large,
      lineHeight: theme.typography.body1.lineHeight
        ? theme.typography.body1.lineHeight * 1.5
        : 24,
    },
    settingsCard: {
      width: '100%',
      marginBottom: theme.spacing.large,
      overflow: 'hidden',
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingVertical: theme.spacing.medium,
      paddingHorizontal: theme.spacing.medium,
      backgroundColor: theme.colors.surface,
    },
    settingLabel: {
      ...theme.typography.body1,
      color: theme.colors.text,
      fontWeight: '500',
    },
    timePickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      paddingVertical: theme.spacing.medium,
      paddingHorizontal: theme.spacing.medium,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    timePickerContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.small,
      marginBottom: theme.spacing.large,
      width: '100%',
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    timeDisplay: {
      paddingVertical: theme.spacing.small,
      paddingHorizontal: theme.spacing.medium,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: theme.borderRadius.small,
    },
    timeText: {
      ...theme.typography.body1,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    buttonContainer: {
      width: '100%',
      marginTop: theme.spacing.medium,
    },
    button: {
      marginBottom: theme.spacing.medium,
      width: '100%',
    },
    skipButton: {
      width: '100%',
    },
    // Accessible styles for screen readers
    accessibleSettingContainer: {
      width: '100%',
      marginVertical: theme.spacing.large,
    },
    accessibleSettingLabel: {
      ...theme.typography.body1,
      color: theme.colors.text,
      fontWeight: '500',
      marginBottom: theme.spacing.small,
      textAlign: 'center',
    },
    accessibleButtonContainer: {
      width: '100%',
      marginTop: theme.spacing.large,
    },
    accessibleButton: {
      marginBottom: theme.spacing.medium,
      width: '100%',
    },
  });

export default EnhancedOnboardingReminderSetupScreen;
