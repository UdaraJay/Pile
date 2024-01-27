import React, { useState, createContext, useEffect, useContext } from 'react';
import { useToastsContext } from './ToastsContext';

export const AutoUpdateContext = createContext();

export const AutoUpdateContextProvider = ({ children }) => {
  const { addNotification, removeNotification } = useToastsContext();

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateNotAvailable, setUpdateNotAvailable] = useState(false);

  const handleUpdateAvailable = () => {
    addNotification({
      id: 'auto-update',
      message: 'Update available',
      dismissTime: 3000,
    });

    addNotification({
      id: 'auto-update',
      type: 'waiting',
      message: 'Downloading update...',
      dismissTime: 5000,
      immediate: true,
    });

    setUpdateAvailable(true);
  };

  const handleUpdateDownloaded = () => {
    removeNotification('auto-update');
    setUpdateDownloaded(true);
  };

  const handleUpdateError = (error) => {
    addNotification({
      id: 'auto-update',
      type: 'failed',
      message: 'Auto update failed',
      dismissTime: 5000,
      immediate: true,
    });

    setUpdateError(error);
  };

  const handleUpdateNotAvailable = () => {
    addNotification({
      id: 'auto-update',
      message: 'Pile is up-to-date',
      type: 'success',
      dismissTime: 5000,
      immediate: true,
    });

    setUpdateNotAvailable(true);
  };

  useEffect(() => {
    if (!window) return;

    window.electron.ipc.on('update_available', handleUpdateAvailable);
    window.electron.ipc.on('update_downloaded', handleUpdateDownloaded);
    window.electron.ipc.on('update_error', handleUpdateError);
    window.electron.ipc.on('update_not_available', handleUpdateNotAvailable);

    return () => {
      window.electron.ipc.removeListener(
        'update_available',
        handleUpdateAvailable
      );
      window.electron.ipc.removeListener(
        'update_downloaded',
        handleUpdateDownloaded
      );
      window.electron.ipc.removeListener('update_error', handleUpdateError);
      window.electron.ipc.removeListener(
        'update_not_available',
        handleUpdateNotAvailable
      );
    };
  }, []);

  const restartAndUpdate = () => {
    if (!window) return;
    window.electron.ipc.sendMessage('restart_app');
  };

  const autoUpdateContextValue = {
    updateAvailable,
    updateDownloaded,
    updateError,
    updateNotAvailable,
    restartAndUpdate,
  };

  return (
    <AutoUpdateContext.Provider value={autoUpdateContextValue}>
      {children}
    </AutoUpdateContext.Provider>
  );
};

export const useAutoUpdateContext = () => useContext(AutoUpdateContext);
