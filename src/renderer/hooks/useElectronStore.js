import { useState, useCallback, useEffect } from 'react';

export function useElectronStore(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue);

  useEffect(() => {
    window.electron.settingsGet(key).then((value) => {
      if (value !== undefined) setStoredValue(value);
    });
  }, [key]);

  const setValue = useCallback(
    (value) => {
      const newValue = value instanceof Function ? value(storedValue) : value;
      setStoredValue(newValue);
      window.electron.settingsSet(key, newValue);
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}
