import React, { createContext, useCallback, useContext, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { useTheme } from './ThemeProvider';
import type { AppTheme } from '@/themes/types';

export interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
  showSuccess: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  showError: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  showWarning: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  showInfo: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

const getToastColors = (theme: AppTheme, type: ToastState['type']) => {
  switch (type) {
    case 'success':
      return {
        backgroundColor: theme.colors.success,
        textColor: theme.colors.onSuccess,
        actionColor: theme.colors.onSuccess,
      };
    case 'error':
      return {
        backgroundColor: theme.colors.error,
        textColor: theme.colors.onError,
        actionColor: theme.colors.onError,
      };
    case 'warning':
      return {
        backgroundColor: theme.colors.warning,
        textColor: theme.colors.onWarning,
        actionColor: theme.colors.onWarning,
      };
    case 'info':
    default:
      return {
        backgroundColor: theme.colors.primary,
        textColor: theme.colors.onPrimary,
        actionColor: theme.colors.onPrimary,
      };
  }
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { theme } = useTheme();
  const [toastState, setToastState] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
    duration: 4000,
  });

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const { duration = 4000, type = 'info', action } = options;

    setToastState({
      visible: true,
      message,
      type,
      duration,
      action,
    });
  }, []);

  const showSuccess = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'success' });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'error' });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'warning' });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
      showToast(message, { ...options, type: 'info' });
    },
    [showToast]
  );

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, visible: false }));
  }, []);

  const colors = getToastColors(theme, toastState.type);

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Snackbar
        visible={toastState.visible}
        onDismiss={hideToast}
        duration={toastState.duration}
        action={
          toastState.action
            ? {
                label: toastState.action.label,
                onPress: () => {
                  toastState.action?.onPress();
                  hideToast();
                },
                textColor: colors.actionColor,
              }
            : undefined
        }
        style={{
          backgroundColor: colors.backgroundColor,
        }}
        contentStyle={{
          backgroundColor: colors.backgroundColor,
        }}
        theme={{
          colors: {
            onSurface: colors.textColor,
            surface: colors.backgroundColor,
          },
        }}
      >
        {toastState.message}
      </Snackbar>
    </ToastContext.Provider>
  );
};
