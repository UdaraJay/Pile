import { useState, useEffect } from 'react';

const useIPCListener = (channel, initialData) => {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (!window.electron?.ipc?.on) return;
    
    const handler = (newData) => {
      setData(newData);
    };

    const cleanup = window.electron.ipc.on(channel, handler);
    return cleanup;
  }, [channel]);

  return data;
};

export default useIPCListener;
