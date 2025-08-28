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
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import React from 'react';
import { InteractionManager, LogBox, StyleSheet, View } from 'react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import RootNavigator from './navigation/RootNavigator';
import { useTheme } from './providers/ThemeProvider';
import EnhancedSplashScreen from './features/auth/screens/SplashScreen';
// Analytics disabled
import useAuthStore from './store/authStore';
import { useUserProfile } from './shared/hooks/useUserProfile';
import { logger } from '@/utils/debugConfig';
// DISABLED: import { initializeGlobalErrorMonitoring } from '@/utils/errorTranslation';
import { RootStackParamList } from './types/navigation';
import { AppProviders } from './providers/AppProviders';
import SplashOverlayProvider from './providers/SplashOverlayProvider';
import { authCoordinator } from './features/auth/services/authCoordinator';
import { supabaseService } from './utils/supabaseClient';
import { useAppTrackingTransparency } from './shared/hooks/useAppTrackingTransparency';

// Silence known upstream deprecation warnings from dependencies during development
if (__DEV__) {
  LogBox.ignoreLogs([
    'ProgressBarAndroid has been extracted from react-native core',
    'Clipboard has been extracted from react-native core',
    'PushNotificationIOS has been extracted from react-native core',
  ]);
}

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

// 🚨 OTP TOKEN QUEUEING SYSTEM: Now handled by authCoordinator

// Process queued OTP tokens when database becomes ready
const processQueuedTokens = async (): Promise<void> => {
  await authCoordinator.processQueuedTokens();
};

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

const handleDeepLink = async (url: string, databaseReady: boolean = false) => {
  try {
    logger.debug('Deep link received:', { url, databaseReady });

    // **RACE CONDITION FIX**: Atomic duplicate processing prevention
    if (!atomicUrlProcessingCheck(url)) {
      return;
    }

    // Delegate unified parsing and handling to the centralized auth coordinator
    await authCoordinator.handleAuthCallback(url, databaseReady);
  } catch (error) {
    logger.error('Error parsing deep link:', { error: (error as Error).message, url });
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
  const isMainAppReady = isAuthenticated;

  // 🚨 OAUTH QUEUE: Track database readiness for token processing
  const [databaseReady, setDatabaseReady] = React.useState(false);

  // Removed verbose AppState debug tracing
  // Request App Tracking Transparency on iOS when appropriate
  useAppTrackingTransparency({ shouldRequest: true });

  React.useEffect(() => {
    // 🚨 OAUTH QUEUE: Monitor Supabase initialization to detect database readiness
    const checkDatabaseReadiness = () => {
      // Database is ready when Supabase client is actually initialized
      const isReady = supabaseService.isInitialized();

      if (isReady && !databaseReady) {
        logger.debug('[OAUTH QUEUE] Database ready detected, processing queued tokens');
        setDatabaseReady(true);

        // Process any queued OTP tokens
        const queueStatus = authCoordinator.getAuthStatus().deepLink;
        if (queueStatus.otpTokens > 0) {
          logger.debug('[OTP QUEUE] Found queued tokens, processing now');
          processQueuedTokens().catch((error) => {
            logger.error('[OTP QUEUE] Failed to process queued tokens:', error as Error);
          });
        }
      }
    };

    // Check immediately
    checkDatabaseReadiness();

    // Set up periodic check for database readiness
    const readinessInterval = setInterval(checkDatabaseReadiness, 500);

    // Cleanup interval
    const cleanupReadinessCheck = () => {
      clearInterval(readinessInterval);
    };

    // Handle deep links when app is already running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      void handleDeepLink(event.url, databaseReady);
    });

    // Handle deep links when app is opened from a closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        void handleDeepLink(url, databaseReady);
      }
    });

    return () => {
      linkingSubscription.remove();
      cleanupReadinessCheck();
    };
  }, [isMainAppReady, isAuthenticated, profile?.onboarded, databaseReady]);

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
          // Analytics disabled
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
