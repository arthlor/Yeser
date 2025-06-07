import React, { createContext, ReactNode, useContext } from 'react';
import { logger } from '@/utils/debugConfig';

interface GlobalErrorContextType {
  handleMutationError: (error: Error, operation: string) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null);

export const useGlobalError = () => {
  const context = useContext(GlobalErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within GlobalErrorProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
  toastHandlers?: {
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
  };
}

export const GlobalErrorProvider: React.FC<Props> = ({ children, toastHandlers }) => {
  const handleMutationError = (error: Error, operation: string) => {
    logger.error(`Global mutation error in ${operation}:`, error);

    // Extract user-friendly message
    let userMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';

    if (error.message.includes('network')) {
      userMessage = 'İnternet bağlantınızı kontrol edin.';
    } else if (error.message.includes('Authentication required')) {
      userMessage = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
    } else if (error.message.includes('Access denied')) {
      userMessage = 'Bu işlem için yetkiniz bulunmuyor.';
    }

    showError(userMessage);
  };

  const showError = (message: string) => {
    if (toastHandlers?.showError) {
      toastHandlers.showError(message);
    } else {
      // Fallback to console if toast not available
      logger.warn('Error to display (no toast available):', { message });
    }
  };

  const showSuccess = (message: string) => {
    if (toastHandlers?.showSuccess) {
      toastHandlers.showSuccess(message);
    } else {
      // Fallback to console if toast not available
      logger.info('Success to display (no toast available):', { message });
    }
  };

  return (
    <GlobalErrorContext.Provider value={{ handleMutationError, showError, showSuccess }}>
      {children}
    </GlobalErrorContext.Provider>
  );
};
