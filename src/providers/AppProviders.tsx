import React, { ReactNode, useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { useInitialization } from '@/hooks/useInitialization';
import { logger } from '@/utils/debugConfig';
import { cleanupSingletons } from '@/utils/cleanupSingletons';
import useAuthStore from '@/store/authStore';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider, useToast } from './ToastProvider';
import { GlobalErrorProvider } from './GlobalErrorProvider';
import { registerGlobalErrorHandlers } from '@/store/authStore';

interface AppProvidersProps {
  children: ReactNode;
}

const AppProvidersContent: React.FC<AppProvidersProps> = ({ children }) => {
  const { showError, showSuccess } = useToast();

  // 🚀 COLD START: Use staged initialization system
  const initialization = useInitialization();

  useEffect(() => {
    // Register global error handlers with enhanced 7-layer protection
    registerGlobalErrorHandlers({ showError, showSuccess });

    logger.debug('[COLD START] AppProviders initialized - staged initialization running...', {
      stage: initialization.stage,
      progress: initialization.progress,
      databaseReady: initialization.databaseReady,
    });

    // 🚨 FORCE QUIT FIX: AppState listener to detect and fix AsyncStorage deadlocks
    // When app is force quit during onboarding, AsyncStorage operations can deadlock
    // Background → foreground cycle resets the native module and fixes the issue
    const appStartTime = Date.now();
    let hasBeenBackground = false;

    const handleAppStateChange = (nextAppState: string) => {
      const timeSinceStart = Date.now() - appStartTime;

      if (nextAppState === 'background') {
        hasBeenBackground = true;
        logger.debug('App went to background', { timeSinceStart });
      } else if (nextAppState === 'active' && hasBeenBackground) {
        logger.debug('App returned from background', { timeSinceStart });

        // If app was stuck on splash and user backgrounded/foregrounded it,
        // this likely fixed an AsyncStorage deadlock - re-initialize auth to ensure proper state
        const authState = useAuthStore.getState();
        if (authState.isLoading && timeSinceStart > 3000) {
          logger.warn('Detected potential AsyncStorage deadlock recovery - re-initializing auth');

          // Small delay to let AppState change complete
          setTimeout(() => {
            authState.initializeAuth().catch((error) => {
              logger.error('Auth re-initialization after background recovery failed:', error);
            });
          }, 100);
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup function
    return () => {
      appStateSubscription?.remove();
      cleanupSingletons();
      logger.debug('App providers cleanup completed');
    };
  }, [
    showError,
    showSuccess,
    initialization.stage,
    initialization.progress,
    initialization.databaseReady,
  ]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GlobalErrorProvider>
          <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>{children}</SafeAreaProvider>
          </GestureHandlerRootView>
        </GlobalErrorProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppProvidersContent>{children}</AppProvidersContent>
      </ToastProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
