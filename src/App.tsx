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
import { ProfileState, useProfileStore } from './store/profileStore'; // Corrected import for named export and type
import { useThrowbackStore } from './store/throwbackStore'; // Added for throwback
import { RootStackParamList } from './types/navigation'; // Import RootStackParamList

// Define the linking configuration
// Note: You'll need to create an EmailConfirmScreen and add it to your AuthNavigator
// for the 'auth/confirm' path to work as intended.

// Helper function to get the active route name
const getActiveRouteName = (
  state: NavigationState | undefined
): string | undefined => {
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
  const { theme, currentThemeName } = useTheme();
  const throwbackStore = useThrowbackStore();
  const fetchRandomEntry = throwbackStore.fetchRandomEntry;
  const isThrowbackVisible = throwbackStore.isThrowbackVisible; // Corrected: Use isThrowbackVisible
  const randomThrowbackEntry = throwbackStore.randomEntry;

  const isAuthenticated = useAuthStore(state => state.isAuthenticated); // Corrected: Removed parentheses
  const profileId = useProfileStore((state: ProfileState) => state.id); // Check if profile is loaded by checking id
  const routeNameRef = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    analyticsService.logAppOpen();

    // Only attempt to fetch throwback if user is authenticated and profile is loaded
    if (isAuthenticated && profileId) {
      // Simple 25% chance to show throwback on app content mount
      // Consider making this configurable or based on user preferences later
      if (Math.random() < 0.25) {
        fetchRandomEntry();
      }
    }
  }, [isAuthenticated, profileId, fetchRandomEntry]);

  const navigationTheme = React.useMemo(
    () => ({
      ...(currentThemeName === 'dark' ? NavigationDarkTheme : DefaultTheme),
      colors: {
        ...(currentThemeName === 'dark'
          ? NavigationDarkTheme.colors
          : DefaultTheme.colors),
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface, // In many themes, 'card' maps to 'surface' or 'background'
        text: theme.colors.text,
        border: theme.colors.border, // Or theme.colors.outline if you have it
        notification: theme.colors.primary, // Or theme.colors.error for error notifications
      },
    }),
    [currentThemeName, theme] // Corrected: Removed DefaultTheme and NavigationDarkTheme from deps
  );

  const statusBarStyle: StatusBarStyle =
    currentThemeName === 'dark' ? 'light' : 'dark';

  return (
    <NavigationContainer
      theme={navigationTheme}
      linking={linking}
      fallback={<SplashScreen />}
      onStateChange={state => {
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
