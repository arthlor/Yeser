'use strict';

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
import { AppState, AppStateStatus, InteractionManager, StyleSheet, View } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import RootNavigator from './navigation/RootNavigator';
import { useTheme } from './providers/ThemeProvider';
import EnhancedSplashScreen from './features/auth/screens/SplashScreen';
import { analyticsService } from './services/analyticsService';
import { notificationService } from './services/notificationService';
import useAuthStore from './store/authStore';
import { useUserProfile } from './shared/hooks/useUserProfile';
import { logger } from '@/utils/debugConfig';
// DISABLED: import { initializeGlobalErrorMonitoring } from '@/utils/errorTranslation';
import { RootStackParamList } from './types/navigation';
import { AppProviders } from './providers/AppProviders';
import SplashOverlayProvider from './providers/SplashOverlayProvider';

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

// **RACE CONDITION FIX**: Track URL processing state to prevent duplicate handling
interface UrlProcessingState {
  status: 'processing' | 'completed';
  timestamp: number;
}
const urlProcessingMap = new Map<string, UrlProcessingState>();

// **MEMORY LEAK FIX**: Store cleanup timeout references
const cleanupTimeoutRefs = new Map<string, ReturnType<typeof setTimeout>>();

// **RACE CONDITION FIX**: Atomic URL processing state management
const atomicUrlProcessingCheck = (url: string): boolean => {
  try {
    const existingState = urlProcessingMap.get(url);
    const now = Date.now();

    // Check if URL is currently being processed
    if (existingState?.status === 'processing') {
      logger.debug('URL already being processed, ignoring duplicate:', { url });
      return false;
    }

    // Check if URL was recently completed (within 30 seconds)
    if (existingState?.status === 'completed' && now - existingState.timestamp < 30000) {
      logger.debug('URL recently processed, ignoring duplicate:', { url });
      return false;
    }

    // Mark URL as being processed atomically
    urlProcessingMap.set(url, { status: 'processing', timestamp: now });
    return true;
  } catch (error) {
    logger.error('Error in atomicUrlProcessingCheck:', { error: (error as Error).message, url });
    return false;
  }
};

// **RACE CONDITION FIX**: Mark URL processing as completed
const markUrlProcessingCompleted = (url: string): void => {
  try {
    urlProcessingMap.set(url, { status: 'completed', timestamp: Date.now() });

    // **MEMORY LEAK FIX**: Clear existing timeout before setting new one
    const existingTimeout = cleanupTimeoutRefs.get(url);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Cleanup old entries to prevent memory leaks
    const timeoutRef = setTimeout(() => {
      const entry = urlProcessingMap.get(url);
      if (entry?.status === 'completed' && Date.now() - entry.timestamp > 60000) {
        urlProcessingMap.delete(url);
        cleanupTimeoutRefs.delete(url);
      }
    }, 60000);

    cleanupTimeoutRefs.set(url, timeoutRef);
  } catch (error) {
    logger.error('Error in markUrlProcessingCompleted:', { error: (error as Error).message, url });
  }
};

const handleDeepLink = async (url: string) => {
  try {
    logger.debug('Deep link received:', { url });

    // **RACE CONDITION FIX**: Atomic duplicate processing prevention
    if (!atomicUrlProcessingCheck(url)) {
      return;
    }
    // Parse the URL with error protection
    const parsedUrl = new URL(url);

    // Check if it's a magic link confirmation - FIXED to match actual Supabase redirect URL
    if (
      parsedUrl.pathname === '/auth/callback' ||
      parsedUrl.pathname === '/auth/confirm' ||
      parsedUrl.pathname === '/confirm' ||
      parsedUrl.pathname === '/callback'
    ) {
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
        try {
          const setSessionFromTokens = useAuthStore.getState().setSessionFromTokens;
          await setSessionFromTokens(accessToken, refreshToken);
          logger.debug('OAuth token authentication completed successfully');
          analyticsService.logEvent('magic_link_oauth_tokens');
        } catch (error) {
          logger.error('OAuth token authentication failed:', { error: (error as Error).message });
          analyticsService.logEvent('magic_link_oauth_error', { error: (error as Error).message });
        }
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
          try {
            // 🚨 FIX: Use direct state access for consistency with setSessionFromTokens
            const confirmMagicLink = useAuthStore.getState().confirmMagicLink;
            await confirmMagicLink(tokenHash, type);
            logger.debug('OTP magic link authentication completed successfully');
            analyticsService.logEvent('magic_link_clicked', { type });
          } catch (error) {
            logger.error('OTP magic link authentication failed:', {
              error: (error as Error).message,
            });
            analyticsService.logEvent('magic_link_otp_error', { error: (error as Error).message });
          }
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
  } finally {
    // **RACE CONDITION FIX**: Mark URL processing as completed
    markUrlProcessingCompleted(url);
  }
};

// CRITICAL FIX: Include environment-specific URL schemes
const getUrlPrefixes = (): string[] => {
  const env = process.env.EXPO_PUBLIC_ENV || 'development';
  const baseSchemes = [Linking.createURL('/')];

  if (env === 'development') {
    baseSchemes.push('yeser-dev://');
  } else if (env === 'preview') {
    baseSchemes.push('yeser-preview://');
  } else {
    baseSchemes.push('yeser://');
  }

  // Also include other common schemes for fallback
  baseSchemes.push('yeser://', 'yeser-dev://', 'yeser-preview://');

  return baseSchemes;
};

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: getUrlPrefixes(),
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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { profile } = useUserProfile();
  const routeNameRef = React.useRef<string | undefined>(undefined);
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList> | null>(null);

  // Check if user is fully ready for MainApp navigation
  const isMainAppReady = isAuthenticated && profile?.onboarded;

  // 🚨 COLD START DEBUG: Add AppState logging to confirm the theory
  const appStateRef = React.useRef(AppState.currentState);
  const appStartTimeRef = React.useRef(Date.now());

  React.useEffect(() => {
    logger.debug('[COLD START DEBUG] Initial AppState:', {
      extra: {
        initialState: appStateRef.current,
        appStartTime: appStartTimeRef.current,
      },
    });

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const timeSinceStart = Date.now() - appStartTimeRef.current;
      const previousState = appStateRef.current;

      logger.debug('[COLD START DEBUG] AppState changed:', {
        extra: {
          from: previousState,
          to: nextAppState,
          timeSinceStart,
          isAuthenticated,
          hasProfile: !!profile,
        },
      });

      if (nextAppState === 'active' && previousState !== 'active') {
        logger.debug('[COLD START DEBUG] ⭐ App became ACTIVE - this could fix hanging promises', {
          extra: {
            timeSinceStart,
            isAuthenticated,
            hasProfile: !!profile,
          },
        });
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, profile]);

  React.useEffect(() => {
    void analyticsService.logAppOpen();

    // Initialize notification service on app start
    notificationService.initialize().then((hasPermissions) => {
      logger.debug('Notifications initialized:', { extra: { hasPermissions } });
    });

    // Enhanced notification response handler with comprehensive navigation
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      logger.debug('Notification response received:', { extra: data });

      // Navigate based on notification type
      if (data?.type === 'daily_reminder') {
        // Navigate to daily entry screen
        if (isMainAppReady && navigationRef.current) {
          navigationRef.current.navigate('DailyEntry');
        }
      } else if (data?.type === 'throwback_reminder') {
        // Navigate to home screen (where throwback is displayed)
        if (isMainAppReady && navigationRef.current) {
          navigationRef.current.navigate('MainApp', {
            screen: 'Home',
          });
        }
      }
    });

    // Handle deep links when app is already running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      void handleDeepLink(event.url);
    });

    // Handle deep links when app is opened from a closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        void handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
      linkingSubscription.remove();
    };
  }, [isMainAppReady, isAuthenticated, profile?.onboarded]);

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
      fallback={<EnhancedSplashScreen />}
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

// Root component responsible for hiding the native splash screen once the first frame is rendered
const App: React.FC = () => {
  const [appIsReady, setAppIsReady] = React.useState(false);
  const [authInitialized, setAuthInitialized] = React.useState(false);

  React.useEffect(() => {
    // 🚨 COLD START FIX: Progressive initialization to prevent AsyncStorage deadlocks
    const initializeApp = async () => {
      try {
        // Step 1: Let React render cycle complete first
        await new Promise((resolve) => setTimeout(resolve, 0));
        setAppIsReady(true);

        // Step 2: Wait for UI to be interactive before touching AsyncStorage
        // This prevents AsyncStorage deadlocks during cold starts
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Step 2.5: Wait for all interactions to complete (most reliable approach)
        await new Promise((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve(undefined));
        });

        // Step 3: Initialize auth after UI is ready and stable
        logger.debug('[COLD START FIX] Starting deferred auth initialization');
        const authStore = useAuthStore.getState();
        await authStore.initializeAuth();
        setAuthInitialized(true);
        logger.debug('[COLD START FIX] Auth initialization completed successfully');
      } catch (error) {
        logger.error(
          '[COLD START FIX] Auth initialization failed, proceeding with unauthenticated state:',
          error as Error
        );
        // Don't block the app - user can try to log in manually
        setAuthInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Callback executed on the root view layout event
  const onLayoutRootView = React.useCallback(async () => {
    // Hide splash screen once UI is ready, don't wait for auth
    if (appIsReady) {
      try {
        await ExpoSplashScreen.hideAsync();
        logger.debug('[COLD START FIX] Splash screen hidden, app UI ready');
      } catch {
        // Intentionally swallow errors – splash will auto-hide eventually
      }
    }
  }, [appIsReady]);

  // Show loading state while auth is being initialized
  if (!authInitialized) {
    return (
      <AppProviders>
        <SplashOverlayProvider>
          <View onLayout={onLayoutRootView} style={styles.container}>
            <EnhancedSplashScreen />
          </View>
        </SplashOverlayProvider>
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <SplashOverlayProvider>
        <View onLayout={onLayoutRootView} style={styles.container}>
          <AppContent />
        </View>
      </SplashOverlayProvider>
    </AppProviders>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
