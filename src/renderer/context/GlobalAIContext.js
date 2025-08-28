import { createContext, useContext, useState, useCallback } from 'react';

const GlobalAIContext = createContext();

export function GlobalAIProvider({ children }) {
  const [globalAIState, setGlobalAIState] = useState({
    isActive: false,
    message: '',
    hasError: false,
    canCancel: false,
    canRetry: false,
  });

  const showAISpinner = useCallback(
    (message = 'AI is thinking...', options = {}) => {
      console.log('🌐 [GlobalAI] Showing spinner:', message, options);
      setGlobalAIState({
        isActive: true,
        message,
        hasError: false,
        canCancel: options.canCancel || false,
        canRetry: false,
        onCancel: options.onCancel,
        onRetry: options.onRetry,
      });
    },
    [],
  );

  const showAIError = useCallback((errorMessage, options = {}) => {
    console.log('🌐 [GlobalAI] Showing error:', errorMessage, options);
    setGlobalAIState({
      isActive: true,
      message: errorMessage,
      hasError: true,
      canCancel: options.canCancel || false,
      canRetry: options.canRetry || true,
      onCancel: options.onCancel,
      onRetry: options.onRetry,
    });
  }, []);

  const hideAISpinner = useCallback(() => {
    console.log('🌐 [GlobalAI] Hiding spinner');
    setGlobalAIState({
      isActive: false,
      message: '',
      hasError: false,
      canCancel: false,
      canRetry: false,
    });
  }, []);

  return (
    <GlobalAIContext.Provider
      value={{
        globalAIState,
        showAISpinner,
        showAIError,
        hideAISpinner,
      }}
    >
      {children}
    </GlobalAIContext.Provider>
  );
}

export const useGlobalAI = () => {
  const context = useContext(GlobalAIContext);
  if (!context) {
    throw new Error('useGlobalAI must be used within a GlobalAIProvider');
  }
  return context;
};
