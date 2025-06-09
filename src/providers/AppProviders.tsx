import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider, useToast } from './ToastProvider';
import { GlobalErrorProvider } from './GlobalErrorProvider';

interface AppProvidersProps {
  children: ReactNode;
}

// Inner component that provides toast handlers to GlobalErrorProvider
const ErrorProviderWithToast: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showError, showSuccess } = useToast();

  return (
    <GlobalErrorProvider toastHandlers={{ showError, showSuccess }}>
      {children}
    </GlobalErrorProvider>
  );
};

// 🚨 FIX: Consolidated provider composition in correct dependency order
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.gestureHandler}>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <ToastProvider>
                <ErrorProviderWithToast>
                  {children}
                </ErrorProviderWithToast>
              </ToastProvider>
            </QueryClientProvider>
          </ThemeProvider>
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
