import React, { ReactNode, useEffect } from 'react';
import { StyleSheet } from 'react-native';
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
        // Register global error handlers with enhanced 7-layer protection
        registerGlobalErrorHandlers({ showError, showSuccess });

        // Initialize Firebase Analytics (non-blocking)
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

    initializeServices();

    // Cleanup function
    return () => {
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
