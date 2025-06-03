import 'react-native-url-polyfill/auto';

import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme,
  LinkingOptions,
  NavigationContainer,
  NavigationState,
} from '@react-navigation/native';
import * as Linking from 'expo-linking'; // Import expo-linking for the prefix
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import React from 'react';

import ThrowbackModal from './components/features/ThrowbackModal'; // Added for throwback
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider, useTheme } from './providers/ThemeProvider';
import SplashScreen from './screens/EnhancedSplashScreen'; // Import SplashScreen
import { analyticsService } from './services/analyticsService';
import useAuthStore from './store/authStore'; // Corrected import for default export
import { useGratitudeStore } from './store/gratitudeStore'; // Hypothetical: Assuming this store exists and provides total entry count
import { ProfileState, useProfileStore } from './store/profileStore'; // Corrected import for named export and type
import { useThrowbackStore, ThrowbackFrequency } from './store/throwbackStore'; // Added for throwback & import ThrowbackFrequency
import { RootStackParamList } from './types/navigation'; // Import RootStackParamList

// Define the linking configuration
// Note: You'll need to create an EmailConfirmScreen and add it to your AuthNavigator
// for the 'auth/confirm' path to work as intended.

// Helper function to get the active route name
const getActiveRouteName = (state: NavigationState | undefined): string | undefined => {
  if (!state) {
    return undefined;
  }
  const route = state.routes[state.index];

  if (route.state) {
    // Dive deeper
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
};

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/')],
  config: {
    // The `screens` object maps route names in RootStackParamList to their linking config
    screens: {
      Auth: {
        // Config for the 'Auth' route (which is AuthNavigator)
        path: 'auth', // URL prefix: yeserapp://auth
        screens: {
          // Screens within AuthNavigator (from AuthStackParamList)
          // You will need to create an 'EmailConfirm' screen in your AuthNavigator.
          EmailConfirm: 'confirm', // Deep link: yeserapp://auth/confirm
          // Example for Login screen, if you add it to AuthStackParamList and want to deep link
          // Login: 'login', // Deep link: yeserapp://auth/login
        },
      },
      MainApp: {
        // Config for the 'MainApp' route (which is MainAppNavigator)
        path: 'app', // URL prefix: yeserapp://app
        screens: {
          // Screens within MainAppNavigator (now MainAppTabParamList)
          HomeTab: 'home', // Deep link: yeserapp://app/home will go to the HomeTab
          DailyEntryTab: 'new-entry', // Deep link: yeserapp://app/new-entry
          PastEntriesTab: 'past-entries', // Deep link: yeserapp://app/past-entries
          // Add other tabs here if they get deep links
        },
      },
      // If you had a top-level screen in RootStackParamList like:
      // NotFound: 'not-found', // Deep link: yeserapp://not-found
    },
  },
};

const AppContent: React.FC = () => {
  const { theme, colorMode } = useTheme();
  // Updated to use checkAndShowThrowbackIfNeeded
  const {
    isThrowbackVisible,
    randomEntry: randomThrowbackEntry, // Renamed for clarity if randomEntry is used elsewhere
    checkAndShowThrowbackIfNeeded,
  } = useThrowbackStore();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileId = useProfileStore((state: ProfileState) => state.id);
  const throwback_reminder_enabled = useProfileStore(
    (state: ProfileState) => state.throwback_reminder_enabled
  );
  const throwback_reminder_frequency = useProfileStore(
    (state: ProfileState) => state.throwback_reminder_frequency
  );

  // Get total entry count and fetch action from gratitude store
  const totalEntryCount = useGratitudeStore((state) => state.totalEntries);
  const fetchTotalEntriesCount = useGratitudeStore((state) => state.fetchTotalEntriesCount);
  const routeNameRef = React.useRef<string | undefined>(undefined);

  // Effect 1: Log app open (runs once on mount)
  React.useEffect(() => {
    analyticsService.logAppOpen();
  }, []);

  // Effect 2: Fetch total entries count
  React.useEffect(() => {
    if (isAuthenticated && profileId) {
      fetchTotalEntriesCount();
    }
  }, [isAuthenticated, profileId, fetchTotalEntriesCount]);

  // Effect 3: Check and show throwback
  React.useEffect(() => {
    // Only attempt to show throwback if user is authenticated, profile is loaded,
    // throwback is enabled, frequency is set, AND totalEntryCount has been fetched (is not null)
    if (
      isAuthenticated &&
      profileId &&
      throwback_reminder_enabled !== undefined &&
      throwback_reminder_frequency !== undefined &&
      totalEntryCount !== null // Ensure count is fetched
    ) {
      checkAndShowThrowbackIfNeeded({
        isEnabled: throwback_reminder_enabled,
        frequency: throwback_reminder_frequency as ThrowbackFrequency,
        totalEntryCount, // Pass the fetched count
      });
    }
  }, [
    isAuthenticated,
    profileId,
    throwback_reminder_enabled,
    throwback_reminder_frequency,
    totalEntryCount,
    checkAndShowThrowbackIfNeeded,
  ]);

  const navigationTheme = React.useMemo(
    () => ({
      ...(colorMode === 'dark' ? NavigationDarkTheme : DefaultTheme),
      colors: {
        ...(colorMode === 'dark' ? NavigationDarkTheme.colors : DefaultTheme.colors),
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface, // In many themes, 'card' maps to 'surface' or 'background'
        text: theme.colors.text,
        border: theme.colors.border, // Or theme.colors.outline if you have it
        notification: theme.colors.primary, // Or theme.colors.error for error notifications
      },
    }),
    [colorMode, theme] // Corrected: Removed DefaultTheme and NavigationDarkTheme from deps
  );

  const statusBarStyle: StatusBarStyle = colorMode === 'dark' ? 'light' : 'dark';

  return (
    <NavigationContainer
      theme={navigationTheme}
      linking={linking}
      fallback={<SplashScreen />}
      onStateChange={(state) => {
        // Corrected: Removed parentheses and added newline for block
        const previousRouteName = routeNameRef.current;
        const currentRouteName = getActiveRouteName(state);

        if (previousRouteName !== currentRouteName && currentRouteName) {
          analyticsService.logScreenView(currentRouteName);
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <StatusBar style={statusBarStyle} />
      <RootNavigator />
      {/* Ensure randomThrowbackEntry is used here if it's the correct variable from the store */}
      {randomThrowbackEntry && isThrowbackVisible && <ThrowbackModal />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
