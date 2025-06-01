// src/navigation/RootNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';

import { useTheme } from '../providers/ThemeProvider'; // Assuming useTheme is here
// Import enhanced screens
import EnhancedCalendarViewScreen from '../screens/EnhancedCalendarViewScreen';
import DailyEntryScreen from '../screens/EnhancedDailyEntryScreen'; // Import DailyEntryScreen
import EntryDetailScreen from '../screens/EnhancedEntryDetailScreen';
import EnhancedHelpScreen from '../screens/EnhancedHelpScreen';
import HomeScreen from '../screens/EnhancedHomeScreen';
import EnhancedPastEntriesScreen from '../screens/EnhancedPastEntriesScreen';
import PrivacyPolicyScreen from '../screens/EnhancedPrivacyPolicyScreen'; // Import PrivacyPolicyScreen
import ReminderSettingsScreen from '../screens/EnhancedReminderSettingsScreen'; // Import EnhancedReminderSettingsScreen
import SettingsScreen from '../screens/EnhancedSettingsScreen';
import EnhancedSplashScreen from '../screens/EnhancedSplashScreen';
import TermsOfServiceScreen from '../screens/EnhancedTermsOfServiceScreen'; // Import TermsOfServiceScreen
import OnboardingReminderSetupScreen from '../screens/onboarding/EnhancedOnboardingReminderSetupScreen'; // Import OnboardingReminderSetupScreen
import OnboardingScreen from '../screens/onboarding/EnhancedOnboardingScreen'; // Import OnboardingScreen
import useAuthStore from '../store/authStore';
import { useProfileStore } from '../store/profileStore';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation'; // Updated to MainAppTabParamList
import AuthNavigator from './AuthNavigator';

// Define the Main App Tab Navigator
const Tab = createBottomTabNavigator<MainAppTabParamList>();

const MainAppNavigator: React.FC = () => {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant, // Optional: for a subtle top border
        },
        headerStyle: {
          backgroundColor: theme.colors.surface, // For screens within tabs that might show a header
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: theme.typography.titleMedium.fontFamily, // Example: Using a theme font
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Ana Sayfa' }} // Turkish title for Home tab
      />
      <Tab.Screen
        name="DailyEntryTab"
        component={DailyEntryScreen}
        options={{ title: 'Yeni Kayıt' }} // Turkish title for Daily Entry tab
      />
      <Tab.Screen
        name="PastEntriesTab"
        component={EnhancedPastEntriesScreen}
        options={{ title: 'Geçmiş Kayıtlar' }} // Turkish title for Past Entries tab
      />
      <Tab.Screen
        name="CalendarTab"
        component={EnhancedCalendarViewScreen}
        options={{ title: 'Takvim' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Ayarlar' }} // Turkish title for Settings tab
      />
      {/* Add other main app tabs here */}
    </Tab.Navigator>
  );
};

// Define the Root Stack that switches between Auth, MainApp, and Loading
const Root = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { theme } = useTheme(); // Moved useTheme to the top
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const authIsLoading = useAuthStore(state => state.isLoading);
  const initializeAuth = useAuthStore(state => state.initializeAuth);
  const profileId = useProfileStore(state => state.id);
  const onboarded = useProfileStore(state => state.onboarded);
  const fetchProfile = useProfileStore(state => state.fetchProfile);
  const profileIsLoading = useProfileStore(state => state.loading);
  const profileInitialFetchAttempted = useProfileStore(
    state => state.initialProfileFetchAttempted
  );
  // Throwback store integration
  // Effect to fetch profile data when user is authenticated and profile is not yet loaded
  // This is a simplified fetch trigger; a more robust solution might involve profileApi.getProfile
  // and setting it in the store, which should happen after login/auth state change.
  useEffect(() => {
    console.log(
      `[RootNavigator] useEffect for fetchProfile: isAuthenticated=${isAuthenticated}, profileId=${profileId}, profileIsLoading=${profileIsLoading}, profileInitialFetchAttempted=${profileInitialFetchAttempted}`
    );
    // profileStore.fetchProfile now internally checks if it should run based on its own state (loading, attempted, authUserId)
    // We just need to ensure it's called when the user is authenticated.
    // The profileStore's subscription to authStore handles resetting its state (like initialProfileFetchAttempted) on user change.
    if (isAuthenticated && !profileInitialFetchAttempted && !profileIsLoading) {
      console.log(
        '[RootNavigator] Conditions met, calling profileStore.fetchProfile()...'
      );
      fetchProfile(); // fetchProfile from profileStore will manage its own initialProfileFetchAttempted flag
    }
  }, [
    isAuthenticated,
    fetchProfile, // from profileStore, should be stable
    profileInitialFetchAttempted, // from profileStore
    profileIsLoading, // from profileStore
    profileId, // Added: profileId is used in the console.log inside the effect
  ]);

  useEffect(() => {
    initializeAuth();

    // Call initializeAuth only once on mount as its definition is stable.
  }, [initializeAuth]); // Added initializeAuth to dependency array

  // Show splash screen if auth is loading, or if user is authenticated but profile is still loading or not yet fetched.
  // After profileStore resets (due to auth change), profileId will be null and profileInitialFetchAttempted will be false.
  // fetchProfile will be called, setting profileIsLoading to true.
  if (authIsLoading) {
    console.log('[RootNavigator] Showing Splash: Auth is loading.');
    return <EnhancedSplashScreen />;
  }
  if (
    isAuthenticated &&
    (profileIsLoading || (!profileId && !profileInitialFetchAttempted))
  ) {
    // If authenticated: show splash if profile is actively loading OR
    // if there's no profileId AND the initial fetch hasn't been marked as attempted yet by profileStore.
    // This covers the brief period after login before fetchProfile kicks in or completes.
    console.log(
      `[RootNavigator] Showing Splash: isAuthenticated=${isAuthenticated}, profileIsLoading=${profileIsLoading}, profileId=${profileId}, profileInitialFetchAttempted=${profileInitialFetchAttempted}`
    );
    return <EnhancedSplashScreen />;
  }
  return (
    <Root.Navigator
      screenOptions={{
        headerShown: false, // Default for most root screens
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: theme.typography.titleLarge.fontFamily, // Example for stack navigator titles
          fontSize: theme.typography.titleLarge.fontSize,
        },
      }}
    >
      {!isAuthenticated ? (
        <Root.Screen name="Auth" component={AuthNavigator} />
      ) : !onboarded ? ( // Use selected onboarded status
        // User is authenticated but not onboarded - show the onboarding flow
        // This group will handle the two-step onboarding
        <Root.Group>
          <Root.Screen name="Onboarding" component={OnboardingScreen} />
          <Root.Screen
            name="OnboardingReminderSetup"
            component={OnboardingReminderSetupScreen}
          />
        </Root.Group>
      ) : (
        // User is authenticated and onboarded
        <Root.Screen name="MainApp" component={MainAppNavigator} />
      )}
      {/* ReminderSettingsScreen is available in the stack but needs a navigation trigger */}
      <Root.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
        options={{ headerShown: true, title: 'Hatırlatıcı Ayarları' }}
      />
      <Root.Screen
        name="EntryDetail"
        component={EntryDetailScreen}
        options={{ headerShown: true, title: 'Detay' }}
      />
      <Root.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: true, title: 'Gizlilik Politikası' }}
      />
      <Root.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ headerShown: true, title: 'Kullanım Koşulları' }}
      />
      <Root.Screen
        name="Help"
        component={EnhancedHelpScreen}
        options={{ headerShown: true, title: 'Yardım ve SSS' }}
      />
      {/* Settings screen is now a tab */}
    </Root.Navigator>
  );
};

export default RootNavigator;
