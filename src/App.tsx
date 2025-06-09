import 'react-native-url-polyfill/auto';

import {
  DefaultTheme,
  LinkingOptions,
  NavigationContainer,
  NavigationContainerRef,
  DarkTheme as NavigationDarkTheme,
  NavigationState,
  PathConfigMap,
} from '@react-navigation/native';

import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import React from 'react';
import RootNavigator from './navigation/RootNavigator';
import { useTheme } from './providers/ThemeProvider';
import SplashScreen from './features/auth/screens/SplashScreen';
import { analyticsService } from './services/analyticsService';
import { notificationService } from './services/notificationService';
import useAuthStore from './store/authStore';
import { logger } from '@/utils/debugConfig';
import { initializeGlobalErrorMonitoring } from '@/utils/errorTranslation';
import { RootStackParamList } from './types/navigation';
import { AppProviders } from './providers/AppProviders';

// Initialize global error monitoring as early as possible
initializeGlobalErrorMonitoring();

// Helper function to get the active route name
const getActiveRouteName = (state: NavigationState | undefined): string | undefined => {
  if (!state) {
    return undefined;
  }
  const route = state.routes[state.index];

  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
};

// Helper function to handle deep links
const handleDeepLink = (
  url: string,
  confirmMagicLink: (tokenHash: string, type?: string) => Promise<void>
) => {
  try {
    logger.debug('Deep link received:', { url });

    // Parse the URL
    const parsedUrl = new URL(url);

    // Check if it's a magic link confirmation
    if (parsedUrl.pathname === '/auth/confirm' || parsedUrl.pathname === '/confirm') {
      logger.debug('Magic link path detected');

      // Extract tokens from URL fragment or query parameters
      const fragment = parsedUrl.hash.substring(1); // Remove the # character
      const fragmentParams = new URLSearchParams(fragment);
      const queryParams = parsedUrl.searchParams;

      // Check for OAuth-style tokens (access_token + refresh_token)
      const accessToken = fragmentParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = fragmentParams.get('refresh_token') || queryParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Handle OAuth-style magic links
        logger.debug('OAuth tokens found, setting session...');
        const setSessionFromTokens = useAuthStore.getState().setSessionFromTokens;
        setSessionFromTokens(accessToken, refreshToken);
        analyticsService.logEvent('magic_link_oauth_tokens');
      } else {
        // Handle OTP-style tokens (fallback for traditional magic links)
        const tokenHash =
          fragmentParams.get('token_hash') ||
          fragmentParams.get('token') ||
          queryParams.get('token_hash') ||
          queryParams.get('token');
        const type = fragmentParams.get('type') || queryParams.get('type') || 'magiclink';

        if (tokenHash) {
          logger.debug('OTP token found, confirming magic link...');
          confirmMagicLink(tokenHash, type);
          analyticsService.logEvent('magic_link_clicked', { type });
        } else {
          logger.error('No valid tokens found in magic link URL');
          analyticsService.logEvent('magic_link_invalid');
        }
      }
    } else {
      logger.debug('Not a magic link path:', { pathname: parsedUrl.pathname });
    }
  } catch (error) {
    logger.error('Error parsing deep link:', { error: (error as Error).message, url });
    analyticsService.logEvent('deep_link_error', { error: (error as Error).message });
  }
};

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'yeserapp://'],
  config: {
    screens: {
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
        },
      },
      MainApp: {
        path: 'app',
        screens: {
          HomeTab: '',
          DailyEntryTab: 'daily-entry',
          PastEntriesTab: 'past-entries',
          CalendarTab: 'calendar',
          SettingsTab: 'settings',
        },
      },
      Onboarding: 'onboarding',
      OnboardingReminderSetup: 'onboarding/reminder',
      ReminderSettings: 'settings/reminders',
      EntryDetail: 'entry/:entryId',
      PrivacyPolicy: 'privacy',
      TermsOfService: 'terms',
      Help: 'help',
    } as PathConfigMap<RootStackParamList>,
  },
};

const AppContent: React.FC = () => {
  const { theme, colorMode } = useTheme();
  const confirmMagicLink = useAuthStore((state) => state.confirmMagicLink);
  const routeNameRef = React.useRef<string | undefined>(undefined);
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  React.useEffect(() => {
    void analyticsService.logAppOpen();

    // Initialize notification service on app start
    notificationService.initialize().then((hasPermissions) => {
      logger.debug('Notifications initialized:', { extra: { hasPermissions } });
    });

    // Set up notification response received listener
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      logger.debug('Notification response received:', { extra: { response } });

      const categoryIdentifier = response.notification.request.content.categoryIdentifier;
      const notificationData = response.notification.request.content.data;

      if (categoryIdentifier === 'throwback_reminder' && notificationData?.entryId) {
        // Navigate to throwback entry detail
        navigationRef.current?.navigate('EntryDetail', {
          entryId: notificationData.entryId as string,
        });
      } else if (categoryIdentifier === 'daily_reminder') {
        // Navigate to daily entry creation
        navigationRef.current?.navigate('MainApp', {
          screen: 'DailyEntryTab',
        });
      }
    });

    // Handle deep links when app is already running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url, confirmMagicLink);
    });

    // Handle deep links when app is opened from a closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url, confirmMagicLink);
      }
    });

    return () => {
      subscription.remove();
      linkingSubscription.remove();
    };
  }, [confirmMagicLink]);

  const navigationTheme = React.useMemo(
    () => ({
      ...(colorMode === 'dark' ? NavigationDarkTheme : DefaultTheme),
      colors: {
        ...(colorMode === 'dark' ? NavigationDarkTheme.colors : DefaultTheme.colors),
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.primary,
      },
    }),
    [colorMode, theme]
  );

  const statusBarStyle: StatusBarStyle = colorMode === 'dark' ? 'light' : 'dark';

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}
      fallback={<SplashScreen />}
      onStateChange={(state) => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = getActiveRouteName(state);

        if (previousRouteName !== currentRouteName && currentRouteName) {
          void analyticsService.logScreenView(currentRouteName);
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <StatusBar style={statusBarStyle} />
      <RootNavigator />
    </NavigationContainer>
  );
};

const App: React.FC = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;
