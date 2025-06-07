import React, { ReactNode } from 'react';
import { ToastProvider, useToast } from './ToastProvider';
import { GlobalErrorProvider } from './GlobalErrorProvider';

interface ToastWrapperProps {
  children: ReactNode;
}

// Inner component that has access to toast
const ErrorProviderWithToast: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showError, showSuccess } = useToast();

  return (
    <GlobalErrorProvider toastHandlers={{ showError, showSuccess }}>{children}</GlobalErrorProvider>
  );
};

export const ToastWrapper: React.FC<ToastWrapperProps> = ({ children }) => {
  return (
    <ToastProvider>
      <ErrorProviderWithToast>{children}</ErrorProviderWithToast>
    </ToastProvider>
  );
};
