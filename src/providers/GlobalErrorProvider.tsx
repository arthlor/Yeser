import React, { createContext, ReactNode, useContext } from 'react';
import { logger } from '@/utils/debugConfig';
import { safeErrorDisplay } from '@/utils/errorTranslation';

interface GlobalErrorContextType {
  handleMutationError: (error: unknown, operation: string) => void;
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
  const handleMutationError = (error: unknown, operation: string) => {
    // Convert error to Error object safely
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Log technical details for debugging (never shown to users)
    logger.error(`Global mutation error in ${operation}:`, {
      message: errorObj.message,
      name: errorObj.name,
      stack: errorObj.stack,
      operation,
      originalError: error,
    });

    // Always use safeErrorDisplay to ensure user-friendly Turkish messages
    const userMessage = safeErrorDisplay(errorObj);
    
    // Only show error if it's not empty (cancellations return empty string)
    if (userMessage && userMessage.trim() !== '') {
      showError(userMessage);
    }
  };

  const showError = (message: string) => {
    // Message is already sanitized by handleMutationError, no need for double translation
    if (message && message.trim() !== '') {
      if (toastHandlers?.showError) {
        toastHandlers.showError(message);
      } else {
        // Fallback to console if toast not available (dev only)
        logger.warn('Error to display (no toast available):', { message });
      }
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
