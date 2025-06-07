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
import { ThemeProvider, useTheme } from './providers/ThemeProvider';
import SplashScreen from './features/auth/screens/SplashScreen';
import { analyticsService } from './services/analyticsService';
import { notificationService } from './services/notificationService';
import { firebaseService } from './services/firebaseService';
import useAuthStore from './store/authStore';
import { logger } from '@/utils/debugConfig';
import { RootStackParamList } from './types/navigation';
import { AppProviders } from './providers/AppProviders';
import { ToastWrapper } from './providers/ToastWrapper';

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

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'yeserapp://'],
  getInitialURL: async () => {
    const url = await Linking.getInitialURL();
    console.log('[DEBUG] Initial URL:', url);
    return url;
  },
  subscribe: (listener) => {
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[DEBUG] Deep link received:', event.url);
      // Parse URL to see parameters
      const url = new URL(event.url);
      console.log('[DEBUG] URL pathname:', url.pathname);
      console.log('[DEBUG] URL search params:', Object.fromEntries(url.searchParams));
      listener(event.url);
    });
    return () => subscription?.remove();
  },
  config: {
    screens: {
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
          SignUp: 'signup',
          ResetPassword: 'reset-password',
          SetNewPassword: {
            path: 'set-new-password',
            parse: {
              access_token: (token: string) => {
                console.log('[DEBUG] Parsing access_token:', token);
                return token;
              },
              refresh_token: (token: string) => {
                console.log('[DEBUG] Parsing refresh_token:', token);
                return token;
              },
              type: (type: string) => {
                console.log('[DEBUG] Parsing type:', type);
                return type;
              },
            },
          },
          EmailConfirm: 'verify-email',
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const routeNameRef = React.useRef<string | undefined>(undefined);
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  React.useEffect(() => {
    // Initialize Firebase first
    firebaseService.initialize().then((isInitialized) => {
      logger.debug('Firebase initialized:', { extra: { isInitialized } });

      // Only log analytics if Firebase is properly initialized
      if (isInitialized) {
        void analyticsService.logAppOpen();
      }
    });

    // Initialize notification service on app start
    notificationService.initialize().then((hasPermissions) => {
      logger.debug('Notifications initialized:', { extra: { hasPermissions } });
    });

    // Set up notification response received listener
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      logger.debug('Notification response received:', { extra: { response } });

      const categoryIdentifier = response.notification.request.content.categoryIdentifier;
      const notificationData = response.notification.request.content.data;

      // Handle different notification types
      if (
        categoryIdentifier === 'DAILY_REMINDER' &&
        notificationData?.action === 'open_daily_entry'
      ) {
        // Navigate to daily entry screen
        if (navigationRef.current && isAuthenticated) {
          const today = new Date().toISOString().split('T')[0];

          // Navigate to DailyEntryTab with today's date
          navigationRef.current.navigate('MainApp', {
            screen: 'DailyEntryTab',
            params: { date: today },
          });

          // Log analytics
          analyticsService.logEvent('notification_daily_reminder_tapped', {
            date: today,
            notification_data: JSON.stringify(notificationData),
          });

          logger.debug('Navigated to daily entry from notification', { extra: { date: today } });
        }
      } else if (
        categoryIdentifier === 'THROWBACK_REMINDER' &&
        notificationData?.action === 'open_past_entries'
      ) {
        // Navigate to past entries or calendar
        if (navigationRef.current && isAuthenticated) {
          navigationRef.current.navigate('MainApp', {
            screen: 'PastEntriesTab',
          });

          // Log analytics
          analyticsService.logEvent('notification_throwback_reminder_tapped', {
            notification_data: JSON.stringify(notificationData),
          });

          logger.debug('Navigated to past entries from notification');
        }
      } else {
        // Fallback for unknown notifications
        logger.warn('Unknown notification type received', {
          extra: {
            categoryIdentifier,
            notificationData,
          },
        });

        // Just navigate to home if authenticated
        if (navigationRef.current && isAuthenticated) {
          navigationRef.current.navigate('MainApp', {
            screen: 'HomeTab',
          });
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

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
      onReady={() => {
        console.log('Navigation ready');
      }}
      onUnhandledAction={(action) => {
        console.log('Unhandled navigation action:', action);
      }}
    >
      <StatusBar style={statusBarStyle} />
      <RootNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AppProviders>
      <ThemeProvider>
        <ToastWrapper>
          <AppContent />
        </ToastWrapper>
      </ThemeProvider>
    </AppProviders>
  );
}
