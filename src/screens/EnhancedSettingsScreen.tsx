import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform, // Kept for potential conditional rendering in child components
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceInfo from 'react-native-device-info';

import ThemedButton from '../components/ThemedButton';
import { useTheme } from '../providers/ThemeProvider';
import { analyticsService } from '../services/analyticsService';
import useAuthStore from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { useThemeStore } from '../store/themeStore';
import { AppTheme, ThemeName } from '../themes/types';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation';

// New component imports
import DailyReminderSettings from '../components/settings/DailyReminderSettings';
import ThrowbackReminderSettings from '../components/settings/ThrowbackReminderSettings';
import AppearanceSettings from '../components/settings/AppearanceSettings';
import AccountSettings from '../components/settings/AccountSettings';
import AboutSettings from '../components/settings/AboutSettings';

type SettingsScreenNavigationProp = BottomTabNavigationProp<
  MainAppTabParamList,
  'SettingsTab'
>;

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
    navigation
      .getParent<StackNavigationProp<RootStackParamList>>()
      ?.navigate('PrivacyPolicy');
  };

  const navigateToTermsOfService = () => {
    navigation
      .getParent<StackNavigationProp<RootStackParamList>>()
      ?.navigate('TermsOfService');
  };

  const navigateToHelp = () => {
    navigation
      .getParent<StackNavigationProp<RootStackParamList>>()
      ?.navigate('Help'); // TODO: Verify 'Help' is the correct route name, might be 'HelpScreen'
  };

  // Loading state for initial profile load
  if (profileLoading && !profileId) { // Show full screen loader only if profile hasn't been loaded at all yet
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
      </View>
    );
  }

  // Error state for initial profile load
  if (profileError && !profileId) { // Show full screen error only if profile hasn't been loaded at all yet
    return (
      <View style={styles.centeredView}>
        <Icon name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>
          Ayarlar yüklenirken bir hata oluştu.
        </Text>
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
      paddingBottom: theme.spacing.large, // Ensure space at the bottom
    },
    screenTitle: {
      fontSize: 28,
      fontFamily: theme.typography.fontFamilyBold,
      color: theme.colors.text,
      marginTop: theme.spacing.large, // Space from top or header
      marginBottom: theme.spacing.medium,
      textAlign: 'left',
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
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamilyRegular,
    },
    errorText: {
      fontSize: 16,
      color: theme.colors.error,
      textAlign: 'center',
      marginVertical: theme.spacing.medium,
      fontFamily: theme.typography.fontFamilyRegular,
    },
    retryButton: {
      marginTop: theme.spacing.medium,
    },
    retryButtonText: {
      fontFamily: theme.typography.fontFamilyMedium,
    },
    versionText: {
      textAlign: 'center',
      fontSize: 12,
      fontFamily: theme.typography.fontFamilyRegular,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.large,
    },
  });

export default EnhancedSettingsScreen;
