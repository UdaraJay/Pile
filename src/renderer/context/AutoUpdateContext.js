import React, { useState, createContext, useEffect, useContext } from 'react';

export const AutoUpdateContext = createContext();

export const AutoUpdateContextProvider = ({ children }) => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [updateError, setUpdateError] = useState(null);
    const [updateNotAvailable, setUpdateNotAvailable] = useState(false);

    const handleUpdateAvailable = () => setUpdateAvailable(true);
    const handleUpdateDownloaded = () => setUpdateDownloaded(true);
    const handleUpdateError = error => setUpdateError(error);
    const handleUpdateNotAvailable = () => setUpdateNotAvailable(true);

    useEffect(() => {
      if(!window || !window.electron.ipc) return;

      window.electron.ipc.on('update_available', handleUpdateAvailable);
      window.electron.ipc.on('update_downloaded', handleUpdateDownloaded);
      window.electron.ipc.on('update_error', handleUpdateError);
      window.electron.ipc.on('update_not_available', handleUpdateNotAvailable);

      return () => {
          window.electron.ipc.removeListener('update_available', handleUpdateAvailable);
          window.electron.ipc.removeListener('update_downloaded', handleUpdateDownloaded);
          window.electron.ipc.removeListener('update_error', handleUpdateError);
          window.electron.ipc.removeListener('update_not_available', handleUpdateNotAvailable);
      };
    }, []);

    const restartAndUpdate = () => {
      if(!window?.electron) return; 
      window.electron.ipc.sendMessage('restart_app');
  };

    const autoUpdateContextValue = {
        updateAvailable,
        updateDownloaded,
        updateError,
        updateNotAvailable,
        restartAndUpdate
    };

    return (
        <AutoUpdateContext.Provider value={autoUpdateContextValue}>
            {children}
        </AutoUpdateContext.Provider>
    );
};

export const useAutoUpdateContext = () => useContext(AutoUpdateContext);
