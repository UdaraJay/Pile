import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';

const DebugContext = createContext();

export function DebugProvider({ children }) {
  const [aiStatus, setAiStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  const showAIStatus = useCallback((type, message, options = {}) => {
    console.log(`🌐 [Debug] AI Status: ${type} - ${message}`);
    setAiStatus({
      type, // 'loading' | 'error' | 'success'
      message,
      ...options,
    });
  }, []);

  const hideAIStatus = useCallback(() => {
    console.log('🌐 [Debug] Hiding AI status');
    setAiStatus(null);
  }, []);

  const addDebugLog = useCallback((type, message) => {
    const newLog = {
      id: Date.now() + Math.random(),
      type, // 'info' | 'error' | 'success'
      message,
      timestamp: new Date().toLocaleTimeString(),
    };

    setLogs((prev) => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Set up console interception for AI-related logs
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    console.log = (...args) => {
      const message = args.join(' ');
      if (
        message.includes('🤖 [AI]') ||
        message.includes('📝 [Editor]') ||
        message.includes('🌐 [GlobalAI]')
      ) {
        addDebugLog('info', message);
      }
      originalConsoleLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.join(' ');
      if (
        message.includes('🤖 [AI]') ||
        message.includes('📝 [Editor]') ||
        message.includes('🌐 [GlobalAI]')
      ) {
        addDebugLog('error', message);
      }
      originalConsoleError.apply(console, args);
    };

    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, [addDebugLog]);

  return (
    <DebugContext.Provider
      value={{
        aiStatus,
        logs,
        showAIStatus,
        hideAIStatus,
        addDebugLog,
        clearLogs,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export const useDebug = () => {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
};
