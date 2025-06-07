import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/queryClient';
import ErrorBoundary from '@/shared/components/layout/ErrorBoundary';
import { GlobalErrorProvider } from './GlobalErrorProvider';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.gestureHandler}>
          <QueryClientProvider client={queryClient}>
            <GlobalErrorProvider>{children}</GlobalErrorProvider>
          </QueryClientProvider>
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
