import React, { createContext, ReactNode, useContext } from 'react';
import { Alert } from 'react-native';
import { logger } from '@/utils/debugConfig';

interface GlobalErrorContextType {
  handleMutationError: (error: Error, operation: string) => void;
  showErrorAlert: (title: string, message: string) => void;
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
}

export const GlobalErrorProvider: React.FC<Props> = ({ children }) => {
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

    showErrorAlert('Hata', userMessage);
  };

  const showErrorAlert = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: 'Tamam' }]);
  };

  return (
    <GlobalErrorContext.Provider value={{ handleMutationError, showErrorAlert }}>
      {children}
    </GlobalErrorContext.Provider>
  );
}; 