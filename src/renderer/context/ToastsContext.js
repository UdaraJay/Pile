import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';

export const ToastsContext = createContext();

export const ToastsContextProvider = ({ children }) => {
  const [notificationsQueue, setNotificationsQueue] = useState([]);

  const notificationTimeoutRef = useRef();

  const processQueue = () => {
    if (notificationsQueue.length > 0) {
      // Set a timeout to dismiss the first notification
      notificationTimeoutRef.current = setTimeout(() => {
        setNotificationsQueue((currentQueue) => currentQueue.slice(1));
      }, notificationsQueue[0].dismissTime || 5000); // Default 5 seconds
    }
  };

  useEffect(() => {
    // Clear any existing timeouts
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }

    processQueue();

    // Clean up timeout on unmount
    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [notificationsQueue]);

  const addNotification = ({
    id,
    type = 'info',
    message,
    dismissTime = 5000,
    immediate = false
  }) => {
    const newNotification = { id, type, message, dismissTime };
    setNotificationsQueue((currentQueue) => immediate ? [newNotification] : [...currentQueue, newNotification]);
  };

  const updateNotification = (targetId, newType, newMessage) => {
    setNotificationsQueue((currentQueue) =>
      currentQueue.map((notification) =>
        notification.id === targetId
          ? { ...notification, type: newType, message: newMessage }
          : notification
      )
    );
  };

  const removeNotification = (targetId) => {
    setNotificationsQueue((currentQueue) =>
      currentQueue.filter((notification) => notification.id !== targetId)
    );

    // If the notification being removed is the first in the queue, we need to clear the timeout
    // and process the next notification if available
    if (
      notificationsQueue.length > 0 &&
      notificationsQueue[0].id === targetId
    ) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
      processQueue();
    }
  };

  const ToastsContextValue = {
    notifications: notificationsQueue,
    addNotification,
    updateNotification,
    removeNotification,
  };

  return (
    <ToastsContext.Provider value={ToastsContextValue}>
      {children}
    </ToastsContext.Provider>
  );
};

export const useToastsContext = () => useContext(ToastsContext);
