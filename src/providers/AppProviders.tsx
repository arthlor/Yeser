import React, { ReactNode, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { firebaseService } from '@/services/firebaseService';
import { networkMonitorService } from '@/services/networkMonitorService';
import { logger } from '@/utils/debugConfig';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider, useToast } from './ToastProvider';
import { GlobalErrorProvider } from './GlobalErrorProvider';

interface AppProvidersProps {
  children: ReactNode;
}

// Firebase initialization component
const FirebaseInitializer: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isFirebaseReady, setIsFirebaseReady] = React.useState(false);

  useEffect(() => {
    const initializeServices = async () => {
      try {
        logger.debug('🚀 Initializing app services...');

        // Initialize network monitoring first
        await networkMonitorService.initialize();

        // Then initialize Firebase
        logger.debug('🔥 Initializing Firebase...');
        const success = await firebaseService.initialize();

        if (success) {
          logger.debug('✅ Firebase initialized successfully');
        } else {
          logger.warn('⚠️ Firebase initialization failed - continuing without Analytics');
        }

        // Always set ready to true to prevent blocking the app
        setIsFirebaseReady(true);
      } catch (error) {
        logger.error('❌ Service initialization error:', error as Error);
        // Don't block the app if services fail
        setIsFirebaseReady(true);
      }
    };

    initializeServices();
  }, []);

  // Don't block the app while Firebase initializes
  if (!isFirebaseReady) {
    logger.debug('🔄 Waiting for Firebase initialization...');
  }

  return <>{children}</>;
};

// Inner component that provides toast handlers to GlobalErrorProvider
const ErrorProviderWithToast: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showError, showSuccess } = useToast();

  return (
    <GlobalErrorProvider toastHandlers={{ showError, showSuccess }}>{children}</GlobalErrorProvider>
  );
};

// 🚨 FIX: Consolidated provider composition with Firebase initialization
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.gestureHandler}>
          <FirebaseInitializer>
            <ThemeProvider>
              <QueryClientProvider client={queryClient}>
                <ToastProvider>
                  <ErrorProviderWithToast>{children}</ErrorProviderWithToast>
                </ToastProvider>
              </QueryClientProvider>
            </ThemeProvider>
          </FirebaseInitializer>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  gestureHandler: {
    flex: 1,
  },
});
