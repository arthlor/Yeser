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
import { LogBox, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import RootNavigator from './navigation/RootNavigator';
import { useTheme } from './providers/ThemeProvider';
import EnhancedSplashScreen from './features/auth/screens/SplashScreen';
// Analytics disabled
import { useUserProfile } from './shared/hooks/useUserProfile';
// DISABLED: import { initializeGlobalErrorMonitoring } from '@/utils/errorTranslation';
import { RootStackParamList } from './types/navigation';
import { AppProviders } from './providers/AppProviders';
import SplashOverlayProvider from './providers/SplashOverlayProvider';
import { useAuthBootstrap } from './features/auth/hooks/useAuthBootstrap';
import { useCoreAuthStore } from './features/auth/store/coreAuthStore';
import { useAppTrackingTransparency } from './shared/hooks/useAppTrackingTransparency';
import { useNotificationResponse } from './shared/hooks/useNotificationResponse';
import { checkVersionCompatibility } from './services/versionCompatibilityService';

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

// Deep link handling is fully delegated to authCoordinator + deepLinkService
// which handles: atomic URL processing, race condition prevention, memory cleanup, and token queueing

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
          MainAppTabs: {
            path: '',
            screens: {
              HomeTab: '',
              DailyEntryTab: 'daily-entry',
              PastEntriesTab: 'past-entries',
              CalendarTab: 'calendar',
              SettingsTab: 'settings',
            },
          },
          EntryDetail: 'entry/:entryId',
          PrivacyPolicy: 'privacy',
          TermsOfService: 'terms',
          Help: 'help',
          WhyGratitude: 'why-gratitude',
          MoodAnalysis: 'mood-analysis',
          PastEntryCreation: 'past-entry-creation',
          CustomerCenter: 'customer-center',
        },
      },
      Onboarding: 'onboarding',
      NotFound: '*',
    } as PathConfigMap<RootStackParamList>,
  },
};

const AppContent: React.FC = () => {
  const { theme, colorMode } = useTheme();
  const { profile } = useUserProfile();
  const isAuthenticated = useCoreAuthStore((state) => state.isAuthenticated);
  const routeNameRef = React.useRef<string | undefined>(undefined);
  const navigationRef = React.useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const [isNavigationReady, setIsNavigationReady] = React.useState(false);
  const [requiredVersion, setRequiredVersion] = React.useState<string | null>(null);
  const isMainAppReady = isAuthenticated && Boolean(profile?.onboarded);

  // Removed verbose AppState debug tracing
  // Request App Tracking Transparency on iOS when appropriate
  useAppTrackingTransparency({ shouldRequest: true });

  useAuthBootstrap(profile);
  useNotificationResponse(navigationRef, isNavigationReady, isMainAppReady);

  React.useEffect(() => {
    let isMounted = true;

    checkVersionCompatibility().then((result) => {
      if (isMounted && !result.compatible) {
        setRequiredVersion(result.minVersion ?? '');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const navigationTheme = React.useMemo(
    () => ({
      ...(colorMode === 'dark' ? NavigationDarkTheme : DefaultTheme),
      colors: {
        ...(colorMode === 'dark' ? NavigationDarkTheme.colors : DefaultTheme.colors),
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.onBackground,
        border: theme.colors.outline,
      },
    }),
    [colorMode, theme]
  );

  const statusBarStyle: StatusBarStyle = colorMode === 'dark' ? 'light' : 'dark';

  if (requiredVersion !== null) {
    return (
      <View style={[styles.updateRequiredContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.updateRequiredTitle, { color: theme.colors.onBackground }]}>
          Update required
        </Text>
        <Text style={[styles.updateRequiredBody, { color: theme.colors.onSurfaceVariant }]}>
          This version is no longer supported. Install the latest Yeşer update to continue.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[styles.updateRequiredButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            const storeUrl =
              Platform.OS === 'android'
                ? 'market://details?id=com.arthlor.yeser'
                : 'https://apps.apple.com/app/yeser';
            Linking.openURL(storeUrl).catch(() => undefined);
          }}
        >
          <Text style={[styles.updateRequiredButtonText, { color: theme.colors.onPrimary }]}>
            Update
          </Text>
        </Pressable>
        {requiredVersion.length > 0 ? (
          <Text style={[styles.updateRequiredMeta, { color: theme.colors.onSurfaceVariant }]}>
            Minimum version {requiredVersion}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}
      fallback={<EnhancedSplashScreen />}
      onReady={() => setIsNavigationReady(true)}
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

// Root component - startup orchestration lives in useInitialization (AppProviders)
const App: React.FC = () => {
  return (
    <AppProviders>
      <SplashOverlayProvider>
        <View style={styles.container}>
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
  updateRequiredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  updateRequiredTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  updateRequiredBody: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  updateRequiredButton: {
    marginTop: 24,
    minWidth: 160,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  updateRequiredButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  updateRequiredMeta: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default App;
