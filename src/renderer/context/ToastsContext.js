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
  // this keeps track of async tasks that the user is notified about
  // by the AI. This can include general app notifications as well.
  const [notifications, setNotifications] = useState([]);
  const notificationTimeoutsRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(notificationTimeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  const addNotification = (
    targetId,
    type = 'info',
    message,
    autoDismiss = true
  ) => {
    const newNotification = { id: targetId, type, message, autoDismiss };

    setNotifications((currentNotifications) => [
      ...currentNotifications,
      newNotification,
    ]);

    if (autoDismiss) {
      if (notificationTimeoutsRef.current[targetId]) {
        clearTimeout(notificationTimeoutsRef.current[targetId]);
      }

      notificationTimeoutsRef.current[targetId] = setTimeout(() => {
        removeNotification(targetId);
        delete notificationTimeoutsRef.current[targetId];
      }, 30000);
    }
  };

  const updateNotification = (targetId, newType, newMessage) => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === targetId
          ? { ...notification, type: newType, message: newMessage }
          : notification
      )
    );
  };

  const removeNotification = (targetId) => {
    setNotifications((currentNotifications) =>
      currentNotifications.filter(
        (notification) => notification.id !== targetId
      )
    );
    if (notificationTimeoutsRef.current[targetId]) {
      clearTimeout(notificationTimeoutsRef.current[targetId]);
      delete notificationTimeoutsRef.current[targetId];
    }
  };

  const ToastsContextValue = {
    notifications,
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
