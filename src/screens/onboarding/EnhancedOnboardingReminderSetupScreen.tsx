import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
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
import { updateProfileSchema } from '../../schemas/profileSchema';
import { analyticsService } from '../../services/analyticsService';
import {
  cancelAllScheduledNotifications,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '../../services/notificationService';
import { type ProfileState, useProfileStore } from '../../store/profileStore';
import { AppTheme } from '../../themes/types';
import { RootStackParamList } from '../../types/navigation';
import { parseTimeStringToValidDate } from '../../utils/dateUtils';

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
  const { id, reminder_enabled, reminder_time, setProfile, setLoading } = useProfileStore();

  // Local state
  const [localReminderEnabled, setLocalReminderEnabled] = useState(
    reminder_enabled !== undefined ? reminder_enabled : true
  );
  const [localReminderTime, setLocalReminderTime] = useState(() =>
    parseTimeStringToValidDate(reminder_time)
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.8)).current;
  const cardSlideAnim = useRef(new Animated.Value(100)).current;
  const timePickerAnim = useRef(new Animated.Value(0)).current;

  // Check if screen reader is enabled
  useEffect(() => {
    const checkScreenReader = async () => {
      const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
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

  // Initial entrance animations
  useEffect(() => {
    const animateEntrance = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animations.duration?.slow || 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: theme.animations.duration?.slow || 600,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim, {
          toValue: 1,
          duration: theme.animations.duration?.slow || 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlideAnim, {
          toValue: 0,
          duration: theme.animations.duration?.slow || 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateEntrance();
  }, [fadeAnim, slideAnim, iconScaleAnim, cardSlideAnim, theme.animations.duration]);

  // Animate time picker appearance
  useEffect(() => {
    Animated.timing(timePickerAnim, {
      toValue: showTimePicker ? 1 : 0,
      duration: theme.animations.duration?.normal || 300,
      useNativeDriver: true,
    }).start();
  }, [showTimePicker, timePickerAnim, theme.animations.duration]);

  // Sync with profile store
  useEffect(() => {
    setLocalReminderEnabled(reminder_enabled !== undefined ? reminder_enabled : true);
    setLocalReminderTime(parseTimeStringToValidDate(reminder_time));
  }, [reminder_enabled, reminder_time]);

  // Handle time picker changes
  const handleTimeChange = useCallback((event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLocalReminderTime(selectedDate);
    }
  }, []);

  // Toggle time picker visibility
  const toggleTimePicker = useCallback(() => {
    setShowTimePicker((prev) => !prev);
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
        const { fieldErrors } = validationResult.error.flatten();
        let errorMessage = 'Lütfen hataları düzeltin:';
        if (fieldErrors.reminder_time?.[0]) {
          errorMessage = `Hatırlatıcı zamanı: ${fieldErrors.reminder_time[0]}`;
        } else if (fieldErrors.reminder_enabled?.[0]) {
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
        <LoadingState message={isSaving ? 'Ayarlar kaydediliyor...' : 'Atlanıyor...'} />
      </View>
    );
  }

  // Render screen reader optimized version
  if (isScreenReaderEnabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.accessibleTitle} accessibilityRole="header">
          Günlük Hatırlatıcı
        </Text>

        <Text style={styles.accessibleDescription} accessibilityRole="text">
          Harika! Yeşer'i keşfetmeye hazırsın. Minnettarlık pratiğini sürdürmene yardımcı olmak için
          şimdi günlük bir hatırlatıcı ayarlayabilirsin.
        </Text>

        <View style={styles.accessibleSettingContainer}>
          <Text style={styles.accessibleSettingLabel}>
            Hatırlatıcıları Etkinleştir: {localReminderEnabled ? 'Açık' : 'Kapalı'}
          </Text>

          <ThemedButton
            title={localReminderEnabled ? 'Hatırlatıcıları Kapat' : 'Hatırlatıcıları Aç'}
            onPress={() => {
              setLocalReminderEnabled(!localReminderEnabled);
            }}
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
              is24Hour
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
      <Animated.View
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: iconScaleAnim }],
            },
          ]}
        >
          <View style={styles.iconBackground}>
            <Ionicons
              name="notifications-outline"
              size={64}
              color={theme.colors.primary}
              accessibilityLabel="Hatırlatıcı ikonu"
            />
          </View>
        </Animated.View>

        <Text style={styles.title} accessibilityRole="header">
          Günlük Hatırlatıcı
        </Text>

        <Text style={styles.description} accessibilityRole="text">
          Harika! Yeşer'i keşfetmeye hazırsın. Minnettarlık pratiğini sürdürmene yardımcı olmak için
          şimdi günlük bir hatırlatıcı ayarlayabilirsin.
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: cardSlideAnim }],
          },
        ]}
      >
        <ThemedCard variant="elevated" elevation="lg" style={styles.settingsCard}>
          <View style={styles.settingsContent}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel} accessibilityRole="text">
                  Hatırlatıcıları Etkinleştir
                </Text>
                <Text style={styles.settingDescription}>
                  Günlük minnettarlık pratiklerin için hatırlatıcı al
                </Text>
              </View>
              <View style={styles.toggleContainer}>
                <ToggleSwitch
                  isOn={localReminderEnabled}
                  onColor={theme.colors.primary}
                  offColor={theme.colors.outlineVariant}
                  thumbOnStyle={{
                    backgroundColor: theme.colors.onPrimary,
                    ...theme.elevation.sm,
                  }}
                  thumbOffStyle={{
                    backgroundColor: theme.colors.surface,
                    ...theme.elevation.sm,
                  }}
                  size="medium"
                  onToggle={handleToggleChange}
                  // @ts-expect-error The ToggleSwitch component is expected to support accessibilityLabel
                  accessibilityLabel={`Hatırlatıcıları ${localReminderEnabled ? 'kapat' : 'aç'}`}
                  accessibilityRole="switch"
                />
              </View>
            </View>

            {localReminderEnabled && (
              <Animated.View
                style={[
                  styles.timeSettingContainer,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <View style={styles.divider} />
                <View style={styles.timePickerRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel} accessibilityRole="text">
                      Hatırlatma Saati
                    </Text>
                    <Text style={styles.settingDescription}>
                      Ne zaman hatırlatılmak istiyorsun?
                    </Text>
                  </View>
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
                    <View style={styles.timeDisplayContent}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={theme.colors.primary}
                        style={styles.timeIcon}
                      />
                      <Text style={styles.timeText}>
                        {localReminderTime.toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        </ThemedCard>

        {showTimePicker && (
          <Animated.View
            style={[
              styles.timePickerContainer,
              {
                opacity: timePickerAnim,
                transform: [
                  {
                    translateY: timePickerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ThemedCard variant="elevated" elevation="md">
              <DateTimePicker
                value={localReminderTime}
                mode="time"
                is24Hour
                display="spinner"
                onChange={handleTimeChange}
                accessibilityLabel="Hatırlatma saati seçici"
              />
            </ThemedCard>
          </Animated.View>
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <ThemedButton
          title="Kaydet ve Bitir ✨"
          onPress={handleSaveSettings}
          variant="primary"
          style={styles.primaryButton}
          accessibilityLabel="Ayarları kaydet ve onboarding'i tamamla"
        />

        <ThemedButton
          title="Şimdilik Atla"
          onPress={handleSkip}
          variant="ghost"
          style={styles.skipButton}
          accessibilityLabel="Hatırlatıcı ayarlarını atla ve onboarding'i tamamla"
        />
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: theme.spacing.large,
    },
    headerContainer: {
      alignItems: 'center',
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.large,
    },
    iconContainer: {
      marginBottom: theme.spacing.large,
    },
    iconBackground: {
      width: 100,
      height: 100,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primaryContainer,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.elevation.lg,
      shadowColor: theme.colors.primary,
    },
    title: {
      ...theme.typography.headlineLarge,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.medium,
      fontWeight: '700',
    },
    description: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: theme.spacing.medium,
    },
    contentContainer: {
      flex: 1,
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    settingsCard: {
      width: '100%',
      marginBottom: theme.spacing.large,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.large,
    },
    settingsContent: {
      padding: theme.spacing.large,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    settingInfo: {
      flex: 1,
      marginRight: theme.spacing.medium,
    },
    settingLabel: {
      ...theme.typography.titleMedium,
      color: theme.colors.onSurface,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    settingDescription: {
      ...theme.typography.bodySmall,
      color: theme.colors.onSurfaceVariant,
      lineHeight: 18,
    },
    toggleContainer: {
      alignItems: 'center',
    },
    timeSettingContainer: {
      width: '100%',
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.outlineVariant,
      marginVertical: theme.spacing.large,
      marginHorizontal: -theme.spacing.large,
    },
    timePickerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
    },
    timeDisplay: {
      borderRadius: theme.borderRadius.medium,
      backgroundColor: theme.colors.primaryContainer,
      paddingVertical: theme.spacing.medium,
      paddingHorizontal: theme.spacing.large,
      minWidth: 120,
    },
    timeDisplayContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeIcon: {
      marginRight: theme.spacing.small,
    },
    timeText: {
      ...theme.typography.labelLarge,
      color: theme.colors.primary,
      fontWeight: '600',
      marginRight: theme.spacing.small,
    },
    timePickerContainer: {
      width: '100%',
      marginBottom: theme.spacing.large,
    },
    buttonContainer: {
      width: '100%',
      paddingBottom: theme.spacing.xl,
    },
    primaryButton: {
      width: '100%',
      marginBottom: theme.spacing.medium,
      paddingVertical: theme.spacing.medium + 2,
      borderRadius: theme.borderRadius.large,
      ...theme.elevation.md,
    },
    skipButton: {
      width: '100%',
      alignSelf: 'center',
    },
    // Accessible styles for screen readers
    accessibleTitle: {
      ...theme.typography.headlineMedium,
      color: theme.colors.onBackground,
      textAlign: 'center',
      marginBottom: theme.spacing.medium,
      fontWeight: '700',
    },
    accessibleDescription: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    accessibleSettingContainer: {
      width: '100%',
      marginVertical: theme.spacing.large,
    },
    accessibleSettingLabel: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
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
