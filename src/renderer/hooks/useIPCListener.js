import { useState, useEffect } from 'react';

const useIPCListener = (channel, initialData) => {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    const handler = (newData) => {
      setData(newData);
    };

    const cleanup = window.electron.ipc.on(channel, handler);
    return cleanup;
  }, [channel]);

  return data;
};

export default useIPCListener;
