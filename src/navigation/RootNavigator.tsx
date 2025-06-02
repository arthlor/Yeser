// src/navigation/RootNavigator.tsx
import { createBottomTabNavigator, BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { EventArg, RouteProp } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Platform } from 'react-native'; // Added for OS-specific padding
import { hapticFeedback } from '../utils/hapticFeedback';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../providers/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Assuming useTheme is here

// Import enhanced screens
import EnhancedCalendarViewScreen from '../screens/EnhancedCalendarViewScreen';
import DailyEntryScreen from '../screens/EnhancedDailyEntryScreen'; // Import DailyEntryScreen
import EntryDetailScreen from '../screens/EnhancedEntryDetailScreen';
import EnhancedHelpScreen from '../screens/EnhancedHelpScreen';
import EnhancedHomeScreen from '../screens/EnhancedHomeScreen';
import EnhancedPastEntriesScreen from '../screens/EnhancedPastEntriesScreen';
import PrivacyPolicyScreen from '../screens/EnhancedPrivacyPolicyScreen'; // Import PrivacyPolicyScreen
import ReminderSettingsScreen from '../screens/EnhancedReminderSettingsScreen'; // Import EnhancedReminderSettingsScreen
import SettingsScreen from '../screens/EnhancedSettingsScreen';
import EnhancedSplashScreen from '../screens/EnhancedSplashScreen';
import TermsOfServiceScreen from '../screens/EnhancedTermsOfServiceScreen'; // Import TermsOfServiceScreen
import OnboardingReminderSetupScreen from '../screens/onboarding/EnhancedOnboardingReminderSetupScreen'; // Import OnboardingReminderSetupScreen
import OnboardingScreen from '../screens/onboarding/EnhancedOnboardingScreen'; // Import OnboardingScreen
import useAuthStore, { AuthState } from '../store/authStore';
import { useProfileStore, ProfileState, ProfileActions } from '../store/profileStore';
import { MainAppTabParamList, RootStackParamList } from '../types/navigation'; // Updated to MainAppTabParamList
import AuthNavigator from './AuthNavigator';

// Define the Main App Tab Navigator
const Tab = createBottomTabNavigator<MainAppTabParamList>();

const MainAppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = '';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'DailyEntryTab') {
            iconName = focused ? 'plus-circle' : 'plus-circle-outline';
          } else if (route.name === 'PastEntriesTab') {
            iconName = 'history'; // Consider focused ? 'view-list' : 'view-list-outline';
          } else if (route.name === 'CalendarTab') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'cog' : 'cog-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: theme.colors.surfaceVariant, // Active tab item background
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant, // Keep or remove based on preference with shadow
          height: 65 + insets.bottom,
          paddingTop: theme.spacing.xs || 8,
          paddingBottom: theme.spacing.xs || 8, 
          shadowColor: theme.colors.shadow || theme.colors.onBackground, // Fallback for shadow color
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: theme.spacing.xxs || 2, 
        },
        headerStyle: {
          backgroundColor: theme.colors.surface, // For screens within tabs that might show a header
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontFamily: theme.typography.titleMedium.fontFamily, // Example: Using a theme font
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={EnhancedHomeScreen}
        options={({ navigation, route }) => ({
          title: 'Ana Sayfa',
          listeners: {
            tabPress: (e: EventArg<'tabPress', true, undefined>) => {
              hapticFeedback.light();
            },
          },
        })}
      />
      <Tab.Screen
        name="DailyEntryTab"
        component={DailyEntryScreen}
        options={({ navigation, route }) => ({
          title: 'Yeni Kayıt',
          listeners: {
            tabPress: (e: EventArg<'tabPress', true, undefined>) => {
              hapticFeedback.light();
            },
          },
        })}
      />
      <Tab.Screen
        name="PastEntriesTab"
        component={EnhancedPastEntriesScreen}
        options={({ navigation, route }) => ({
          title: 'Geçmiş Kayıtlar',
          listeners: {
            tabPress: (e: EventArg<'tabPress', true, undefined>) => {
              hapticFeedback.light();
            },
          },
        })}
      />
      <Tab.Screen
        name="CalendarTab"
        component={EnhancedCalendarViewScreen}
        options={({ navigation, route }) => ({
          title: 'Takvim',
          listeners: {
            tabPress: (e: EventArg<'tabPress', true, undefined>) => {
              hapticFeedback.light();
            },
          },
        })}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={({ navigation, route }) => ({
          title: 'Ayarlar',
          listeners: {
            tabPress: (e: EventArg<'tabPress', true, undefined>) => {
              hapticFeedback.light();
            },
          },
        })}
      />
      {/* Add other main app tabs here */}
    </Tab.Navigator>
  );
};

// Define the Root Stack that switches between Auth, MainApp, and Loading
const Root = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const { theme } = useTheme(); // Moved useTheme to the top
  const isAuthenticated = useAuthStore((state: AuthState) => state.isAuthenticated);
  const authIsLoading = useAuthStore((state: AuthState) => state.isLoading);
  const initializeAuth = useAuthStore((state: AuthState) => state.initializeAuth);
  const profileId = useProfileStore((state: ProfileState & ProfileActions) => state.id);
  const onboarded = useProfileStore((state: ProfileState & ProfileActions) => state.onboarded);
  const fetchProfile = useProfileStore((state: ProfileState & ProfileActions) => state.fetchProfile);
  const profileIsLoading = useProfileStore((state: ProfileState & ProfileActions) => state.loading);
  const profileInitialFetchAttempted = useProfileStore(
    (state: ProfileState & ProfileActions) => state.initialProfileFetchAttempted
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
