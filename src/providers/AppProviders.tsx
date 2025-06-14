import React, { ReactNode, useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { firebaseService } from '@/services/firebaseService';
import { networkMonitorService } from '@/services/networkMonitorService';
import { backgroundSyncService } from '@/services/backgroundSyncService';
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

  useEffect(() => {
    // Initialize core services with enhanced error protection
    const initializeServices = async () => {
      try {
        // 🚨 COLD START FIX: Manually initialize Firebase first
        await firebaseService.initializeFirebase();

        // Register global error handlers with enhanced 7-layer protection
        registerGlobalErrorHandlers({ showError, showSuccess });

        // Initialize Firebase Analytics (non-blocking) - now depends on manual init
        firebaseService.initialize().catch((error) => {
          logger.error('Firebase Analytics initialization failed (non-critical):', { error });
        });

        // Initialize network monitoring (non-blocking)
        networkMonitorService.initialize().catch((error) => {
          logger.error('Network monitoring initialization failed (non-critical):', { error });
        });

        // Background sync service initializes automatically in constructor
        logger.debug('Background sync service initialized');

        logger.debug('Core services initialized successfully');
      } catch (error) {
        logger.error('Service initialization failed:', { error });
        // Don't throw - app should still function with limited features
      }
    };

    // 🚨 COLD START FIX: Don't initialize services immediately
    // Use setTimeout to defer initialization and prevent blocking the main thread
    const initTimer = setTimeout(() => {
      initializeServices();
    }, 100);

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
      clearTimeout(initTimer);
      appStateSubscription?.remove();
      cleanupSingletons();
      backgroundSyncService.stopPeriodicSync();
      logger.debug('App providers cleanup completed');
    };
  }, [showError, showSuccess]);

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
