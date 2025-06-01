import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Switch from 'toggle-switch-react-native';

import ThemedButton from '../components/ThemedButton';
import ThemedCard from '../components/ThemedCard';
import ThemedDivider from '../components/ThemedDivider';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import useAuthStore from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useThemeStore } from '../store/themeStore'; // Added for theme switching
import { AppTheme } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

// Define frequency options for clarity, mapping machine values to human-readable Turkish text
const frequencyOptions: { label: string; value: string }[] = [
  { label: 'Günlük', value: 'daily' },
  { label: 'Haftalık', value: 'weekly' },
  { label: 'Aylık', value: 'monthly' },
];

type SettingsScreenNavigationProp = BottomTabNavigationProp<
  MainAppTabParamList,
  'SettingsTab'
>;

/**
 * EnhancedSettingsScreen provides an improved UI/UX for the settings screen.
 * It uses animation components and themed UI elements for a more engaging and
 * polished user experience.
 */
const EnhancedSettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Profile store state
  const {
    throwback_reminder_enabled,
    throwback_reminder_frequency,
    loading: profileLoading,
    error: profileError,
    fetchProfile,
    updateThrowbackPreferences,
    reminder_enabled,
    reminder_time,
    updateDailyReminderSettings,
  } = useProfileStore();

  // Auth store state
  const { user, logout } = useAuthStore();

  // Theme store state
  const { activeThemeName, toggleTheme } = useThemeStore();

  // State for time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (reminder_time) {
      const [hours, minutes] = reminder_time.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return date;
    }
    return new Date();
  });

  useEffect(() => {
    // Log screen view
    analyticsService.logScreenView('EnhancedSettingsScreen');
  }, []);

  // Handling the time picker
  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (date) {
      setSelectedTime(date);
      // Format the time as HH:MM
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;

      // Update the reminder settings
      updateDailyReminderSettings({
        reminder_enabled,
        reminder_time: formattedTime,
      });
    }
  };

  // Toggle reminder settings
  const toggleReminder = (isEnabled: boolean) => {
    const currentTime = reminder_time || '09:00'; // Default to 9:00 AM if not set
    updateDailyReminderSettings({
      reminder_enabled: isEnabled,
      reminder_time: currentTime,
    });
  };

  // Toggle throwback reminder settings
  const toggleThrowbackReminder = (isEnabled: boolean) => {
    updateThrowbackPreferences({
      throwback_reminder_enabled: isEnabled,
      throwback_reminder_frequency: throwback_reminder_frequency || 'weekly',
    });
  };

  // Update throwback frequency
  const updateThrowbackFrequency = (frequency: string) => {
    updateThrowbackPreferences({
      throwback_reminder_enabled,
      throwback_reminder_frequency: frequency,
    });
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  // Navigate to privacy policy
  const navigateToPrivacyPolicy = () => {
    navigation
      .getParent<StackNavigationProp<RootStackParamList>>()
      ?.navigate('PrivacyPolicy');
  };

  // Navigate to terms of service
  const navigateToTermsOfService = () => {
    navigation
      .getParent<StackNavigationProp<RootStackParamList>>()
      ?.navigate('TermsOfService');
  };

  // Navigate to help
  const navigateToHelp = () => {
    navigation
      .getParent<StackNavigationProp<RootStackParamList>>()
      ?.navigate('Help');
  };

  // If loading, show loading indicator
  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Ayarlar Yükleniyor...</Text>
      </View>
    );
  }

  // If error, show error message
  if (profileError) {
    return (
      <View style={styles.errorContainer}>
        <ThemedCard
          variant="outlined"
          contentPadding="md"
          style={styles.errorCard}
        >
          <Icon
            name="alert-circle-outline"
            size={40}
            color={theme.colors.error}
          />
          <Text style={styles.errorText}>
            Ayarlar yüklenirken bir hata oluştu: {profileError}
          </Text>
          <ThemedButton
            variant="primary"
            onPress={() => fetchProfile()}
            title="Tekrar Dene"
          />
        </ThemedCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ayarlar</Text>
        </View>

        {/* Profile Section */}
        <View>
          <ThemedCard
            variant="elevated"
            elevation="sm"
            contentPadding="md"
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Icon
                name="account-circle"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.sectionTitle}>Profil</Text>
            </View>

            <ThemedDivider style={styles.divider} />

            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>E-posta:</Text>
              <Text style={styles.profileValue}>
                {user?.email || 'Yükleniyor...'}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileLabel}>Hesap Oluşturma:</Text>
              <Text style={styles.profileValue}>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('tr-TR')
                  : 'Yükleniyor...'}
              </Text>
            </View>
          </ThemedCard>
        </View>

        {/* Reminder Settings Section */}
        <View style={[{ marginTop: theme.spacing.medium }]}>
          <ThemedCard
            variant="elevated"
            elevation="sm"
            contentPadding="md"
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Icon
                name="bell-ring-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.sectionTitle}>Hatırlatıcılar</Text>
            </View>

            <ThemedDivider style={styles.divider} />

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Günlük Hatırlatıcı</Text>
              <Switch
                isOn={reminder_enabled}
                onToggle={toggleReminder}
                onColor={theme.colors.primary}
                offColor={theme.colors.surfaceVariant}
                size="medium"
              />
            </View>

            {reminder_enabled && (
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Hatırlatıcı Zamanı</Text>
                <TouchableOpacity
                  style={styles.timePickerButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.timePickerButtonText}>
                    {selectedTime.toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </Text>
                  <Icon
                    name="clock-outline"
                    size={18}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>
                Anı Pırıltısı Hatırlatıcısı
              </Text>
              <Switch
                isOn={throwback_reminder_enabled}
                onToggle={toggleThrowbackReminder}
                onColor={theme.colors.primary}
                offColor={theme.colors.surfaceVariant}
                size="medium"
              />
            </View>

            {throwback_reminder_enabled && (
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Anı Sıklığı</Text>
                <View style={styles.pickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <Picker
                      selectedValue={throwback_reminder_frequency || 'weekly'}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                      onValueChange={updateThrowbackFrequency}
                    >
                      {frequencyOptions.map(option => (
                        <Picker.Item
                          key={option.value}
                          label={option.label}
                          value={option.value}
                        />
                      ))}
                    </Picker>
                  ) : (
                    <View style={styles.androidPickerContainer}>
                      <Picker
                        selectedValue={throwback_reminder_frequency || 'weekly'}
                        style={styles.androidPicker}
                        onValueChange={updateThrowbackFrequency}
                      >
                        {frequencyOptions.map(option => (
                          <Picker.Item
                            key={option.value}
                            label={option.label}
                            value={option.value}
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ThemedCard>
        </View>

        {/* Theme Switch Section */}
        <View style={[{ marginTop: theme.spacing.medium }]}>
          <ThemedCard
            variant="elevated"
            elevation="sm"
            contentPadding="md"
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Icon
                name={
                  activeThemeName === 'dark' ? 'weather-night' : 'weather-sunny'
                }
                size={24}
                color={theme.colors.primary}
                style={styles.settingIcon} // Added style for consistency if needed
              />
              <Text style={styles.sectionTitle}>Görünüm</Text>
            </View>
            <ThemedDivider style={styles.divider} />
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Koyu Mod</Text>
              <Switch
                isOn={activeThemeName === 'dark'}
                onColor={theme.colors.primary}
                offColor={theme.colors.outline} // Use outline or surfaceVariant for off state
                size="medium"
                onToggle={newIsOn => {
                  toggleTheme();
                  analyticsService.logEvent('theme_switched', {
                    to_theme: newIsOn ? 'dark' : 'light',
                  });
                }}
              />
            </View>
          </ThemedCard>
        </View>

        {/* Account & Legal Section */}
        <View style={{ marginTop: theme.spacing.medium }}>
          <ThemedCard
            variant="elevated"
            elevation="sm"
            contentPadding="md"
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Icon
                name="shield-account-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.sectionTitle}>Hesap & Yasal</Text>
            </View>

            <ThemedDivider style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={navigateToPrivacyPolicy}
            >
              <Icon
                name="shield-check-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.menuItemText}>Gizlilik Politikası</Text>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.colors.outline}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={navigateToTermsOfService}
            >
              <Icon
                name="file-document-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.menuItemText}>Kullanım Koşulları</Text>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.colors.outline}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={navigateToHelp}>
              <Icon
                name="help-circle-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.menuItemText}>Yardım</Text>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.colors.outline}
              />
            </TouchableOpacity>

            <ThemedDivider style={styles.divider} />

            <ThemedButton
              variant="outline"
              onPress={handleLogout}
              title="Çıkış Yap"
              style={styles.logoutButton}
            >
              <Icon
                name="logout"
                size={18}
                color={theme.colors.error}
                style={{ marginRight: theme.spacing.xs }}
              />
            </ThemedButton>
          </ThemedCard>
        </View>

        {/* App Version Footer */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Yeşer v1.0.0</Text>
        </View>

        {/* Time Picker Modal for iOS */}
        {showTimePicker && (
          <View style={styles.timePickerContainer}>
            <View style={styles.timePickerContent}>
              <Text style={styles.timePickerTitle}>Hatırlatıcı Zamanı Seç</Text>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={onTimeChange}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.timePickerDoneButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.timePickerDoneText}>Tamam</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.primary,
      marginTop: theme.spacing.medium,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: theme.spacing.large,
    },
    settingIcon: {
      marginRight: theme.spacing.md,
    },
    errorCard: {
      alignItems: 'center',
      gap: theme.spacing.small,
      backgroundColor: theme.colors.errorContainer,
      borderColor: theme.colors.error,
    },
    errorText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.error,
      textAlign: 'center',
      marginVertical: theme.spacing.small,
    },
    header: {
      paddingTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.large,
      alignItems: 'center',
      marginBottom: theme.spacing.medium,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    section: {
      marginHorizontal: theme.spacing.medium,
      marginBottom: theme.spacing.medium,
    },
    sectionCard: {
      marginHorizontal: theme.spacing.medium,
      marginBottom: theme.spacing.medium,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.small,
      gap: theme.spacing.small,
    },
    sectionTitle: {
      ...theme.typography.h2,
      color: theme.colors.primary,
    },
    divider: {
      marginVertical: theme.spacing.small,
    },
    profileInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: theme.spacing.small / 2,
    },
    profileLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    profileValue: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      flex: 2,
      textAlign: 'right',
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: theme.spacing.small,
    },
    settingLabel: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
    },
    timePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceVariant,
      paddingHorizontal: theme.spacing.medium,
      paddingVertical: theme.spacing.small / 2,
      borderRadius: theme.borderRadius.small,
      gap: theme.spacing.small / 2,
    },
    timePickerButtonText: {
      ...theme.typography.bodyMedium,
      color: theme.colors.primary,
    },
    pickerContainer: {
      borderRadius: theme.borderRadius.small,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceVariant,
      width: 150,
      height: Platform.OS === 'ios' ? 100 : 45,
    },
    picker: {
      width: 150,
      height: Platform.OS === 'ios' ? 100 : 45,
    },
    pickerItem: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
    },
    androidPickerContainer: {
      width: 150,
      height: 45,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    androidPicker: {
      width: 150,
      height: 45,
      color: theme.colors.onSurface,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.small,
      gap: theme.spacing.small,
    },
    menuItemText: {
      ...theme.typography.bodyLarge,
      color: theme.colors.onSurface,
      flex: 1,
    },
    logoutButton: {
      marginTop: theme.spacing.small,
      borderColor: theme.colors.error,
    },
    logoutButtonText: {
      color: theme.colors.error,
    },
    versionContainer: {
      alignItems: 'center',
      marginVertical: theme.spacing.large,
    },
    versionText: {
      ...theme.typography.caption,
      color: theme.colors.outline,
    },
    timePickerContainer: {
      position: 'absolute',
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    },
    timePickerContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.borderRadius.medium,
      borderTopRightRadius: theme.borderRadius.medium,
      padding: theme.spacing.medium,
    },
    timePickerTitle: {
      ...theme.typography.h3,
      color: theme.colors.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.small,
    },
    timePickerDoneButton: {
      alignSelf: 'flex-end',
      paddingVertical: theme.spacing.small,
      paddingHorizontal: theme.spacing.medium,
    },
    timePickerDoneText: {
      ...theme.typography.button,
      color: theme.colors.primary,
    },
  });

export default EnhancedSettingsScreen;
