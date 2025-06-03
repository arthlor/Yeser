import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react'; // Added useState
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform, // Kept for potential conditional rendering in child components
  Switch, // Added for the new toggle
  Alert,
} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { prepareUserExportFile, shareExportedFile, cleanupTemporaryFile } from '../api/userDataApi'; // Ensure path is correct
import AboutSettings from '../components/settings/AboutSettings';
import AccountSettings from '../components/settings/AccountSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import DailyReminderSettings from '../components/settings/DailyReminderSettings';
import ThrowbackReminderSettings from '../components/settings/ThrowbackReminderSettings';
import ThemedButton from '../components/ThemedButton';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import useAuthStore from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useThemeStore } from '../store/themeStore';
import { AppTheme, ThemeName } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

// New component imports

// Import API functions for data export

type SettingsScreenNavigationProp = BottomTabNavigationProp<MainAppTabParamList, 'SettingsTab'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

/**
 * EnhancedSettingsScreen provides an improved UI/UX for the settings screen.
 * It uses animation components and themed UI elements for a more engaging and
 * polished user experience.
 */
const EnhancedSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [isExporting, setIsExporting] = useState(false); // New state for export loading

  const handleExportData = async () => {
    setIsExporting(true);
    let tempFilePath: string | undefined;

    try {
      // It's better to show a loading indicator directly on the button or screen
      // than to use an initial alert that blocks the UI.
      // Alert.alert(
      //   'Veri Dışa Aktarma Başlatılıyor',
      //   'Verileriniz hazırlanıyor. Bu işlem biraz zaman alabilir.'
      // );

      const prepareResult = await prepareUserExportFile();

      if (!prepareResult.success || !prepareResult.filePath || !prepareResult.filename) {
        Alert.alert(
          'Dışa Aktarma Hatası',
          prepareResult.message || 'Veriler dışa aktarılırken bir hata oluştu.'
        );
        return;
      }

      tempFilePath = prepareResult.filePath;
      const shareResult = await shareExportedFile(prepareResult.filePath, prepareResult.filename);

      if (shareResult.success) {
        // No explicit success message here as the share dialog itself provides feedback.
        console.log('Data shared successfully or share dialog opened.');
      } else {
        if (shareResult.message && shareResult.message !== 'Sharing cancelled by user.') {
          Alert.alert('Paylaşım Hatası', shareResult.message);
        } else if (shareResult.message === 'Sharing cancelled by user.') {
          console.log('User cancelled sharing process.');
          // Optionally inform user about cancellation.
        }
      }
    } catch (error: any) {
      console.error('Export data error:', error);
      Alert.alert('Dışa Aktarma Hatası', error.message || 'Beklenmedik bir hata oluştu.');
    } finally {
      if (tempFilePath) {
        await cleanupTemporaryFile(tempFilePath);
      }
      setIsExporting(false);
    }
  };

  const {
    id: profileId,
    username,
    reminder_enabled,
    reminder_time,
    throwback_reminder_enabled,
    throwback_reminder_frequency,
    loading: profileLoading,
    error: profileError,
    fetchProfile,
    updateThrowbackPreferences,
    updateDailyReminderSettings,
    useVariedPrompts, // Added
    updateUseVariedPromptsPreference, // Added
  } = useProfileStore();

  const { user, logout } = useAuthStore();
  const { activeThemeName, toggleTheme } = useThemeStore();

  useEffect(() => {
    analyticsService.logScreenView('EnhancedSettingsScreen');
    // Attempt to fetch profile if not loaded and user exists
    // Check for profileId to prevent re-fetching if already loaded or loading
    if (!profileId && user?.id && !profileLoading) {
      fetchProfile();
    }
  }, [profileId, user, fetchProfile, profileLoading]);

  const navigateToPrivacyPolicy = () => {
    navigation.getParent<StackNavigationProp<RootStackParamList>>()?.navigate('PrivacyPolicy');
  };

  const navigateToTermsOfService = () => {
    navigation.getParent<StackNavigationProp<RootStackParamList>>()?.navigate('TermsOfService');
  };

  const navigateToHelp = () => {
    navigation.getParent<StackNavigationProp<RootStackParamList>>()?.navigate('Help'); // TODO: Verify 'Help' is the correct route name, might be 'HelpScreen'
  };

  // Loading state for initial profile load
  if (profileLoading && !profileId) {
    // Show full screen loader only if profile hasn't been loaded at all yet
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
      </View>
    );
  }

  // Error state for initial profile load
  if (profileError && !profileId) {
    // Show full screen error only if profile hasn't been loaded at all yet
    return (
      <View style={styles.centeredView}>
        <Icon name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Ayarlar yüklenirken bir hata oluştu.</Text>
        <ThemedButton
          title="Tekrar Dene"
          onPress={() => user && fetchProfile()} // Ensure user is not null
          style={styles.retryButton} // Ensure this style is defined
          variant="primary"
          disabled={!user || profileLoading}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Ayarlar</Text>

      {/* Daily Reminder Settings */}
      <DailyReminderSettings
        reminderEnabled={reminder_enabled ?? false} // Default to false if undefined
        reminderTime={reminder_time}
        onUpdateSettings={updateDailyReminderSettings}
      />

      {/* Throwback Reminder Settings */}
      <ThrowbackReminderSettings
        throwbackEnabled={throwback_reminder_enabled ?? false} // Default to false if undefined
        throwbackFrequency={throwback_reminder_frequency ?? 'weekly'} // Default to weekly
        onUpdateSettings={updateThrowbackPreferences}
      />

      {/* Appearance Settings */}
      <AppearanceSettings
        activeThemeName={activeThemeName as ThemeName} // Cast activeThemeName
        onToggleTheme={toggleTheme}
      />

      {/* Varied Daily Prompts Settings */}
      <View style={styles.settingsSectionCard}>
        <Text style={styles.sectionTitle}>Örnekler</Text>
        <View style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Minnet önerilerini aç</Text>
          <Switch
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }} // Using border for inactive track
            thumbColor={theme.colors.surface} // Surface is good for thumb on both states
            ios_backgroundColor={theme.colors.border} // Similar to trackColor.false
            onValueChange={updateUseVariedPromptsPreference}
            value={useVariedPrompts ?? false}
            disabled={profileLoading}
          />
        </View>
      </View>

      {/* Data Management Section - NEW */}
      <View style={styles.settingsSectionCard}>
        <Text style={styles.sectionTitle}>Veri Yönetimi</Text>
        <View style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Verilerimi Dışa Aktar</Text>
          <ThemedButton
            title={isExporting ? 'Dışa Aktarılıyor...' : 'Dışa Aktar'}
            onPress={handleExportData}
            variant="primary"
            disabled={isExporting}
            style={{ minWidth: 120, justifyContent: 'center' }} // Basic styling for the button
          />
        </View>
        <Text style={styles.settingDescription}>
          Tüm şükran günlüğü girdilerinizi JSON formatında dışa aktarın.
        </Text>
      </View>

      {/* Account Settings */}
      <AccountSettings onLogout={logout} username={username} />

      {/* About Settings */}
      <AboutSettings
        onNavigateToPrivacyPolicy={navigateToPrivacyPolicy}
        onNavigateToTermsOfService={navigateToTermsOfService}
        onNavigateToHelp={navigateToHelp}
      />

      {/* Version Info */}
      <Text style={styles.versionText}>
        Yeşer v{DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()})
      </Text>
    </ScrollView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      paddingHorizontal: theme.spacing.large,
      paddingBottom: theme.spacing.large,
    },
    screenTitle: {
      fontSize: 28,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.text,
      marginTop: theme.spacing.large,
      marginBottom: theme.spacing.medium,
      textAlign: 'left',
    },
    settingsSectionCard: {
      backgroundColor: theme.colors.surface || '#FFFFFF',
      borderRadius: theme.borderRadius?.medium || 8,
      paddingHorizontal: theme.spacing.medium,
      paddingVertical: theme.spacing.small,
      marginBottom: theme.spacing.medium,
      // Example: ...(theme.shadows?.small || {}), // Optional: if shadows are defined in theme
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.text,
      marginBottom: theme.spacing.medium,
    },
    settingsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.small,
    },
    settingsLabel: {
      fontSize: theme.typography.body1?.fontSize || 16,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.text,
      flexShrink: 1, // Allow label to shrink if next to a button/switch
      marginRight: theme.spacing.medium, // Space between label and control
    },
    settingDescription: {
      fontSize: theme.typography.caption?.fontSize || 14,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.small,
      paddingHorizontal: theme.spacing.small, // Match section card padding
    },
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.large,
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      marginTop: theme.spacing.medium,
      fontSize: theme.typography.body1?.fontSize || 16,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.textSecondary,
    },
    errorText: {
      marginTop: theme.spacing.medium,
      fontSize: theme.typography.body1?.fontSize || 16,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.error,
      textAlign: 'center',
      marginBottom: theme.spacing.medium,
    },
    retryButton: {
      marginTop: theme.spacing.medium,
      // ThemedButton will handle its own text styling
    },
    versionText: {
      fontSize: theme.typography.caption?.fontSize || 12,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.large,
      marginBottom: theme.spacing.medium, // Added for consistency
    },
  });

export default EnhancedSettingsScreen;
