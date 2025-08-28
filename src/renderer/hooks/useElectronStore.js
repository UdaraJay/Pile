import { useState, useCallback, useEffect } from 'react';

export function useElectronStore(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue);

  useEffect(() => {
    if (window.electron?.settingsGet) {
      window.electron.settingsGet(key).then((value) => {
        if (value !== undefined) setStoredValue(value);
      });
    }
  }, [key]);

  const setValue = useCallback(
    (value) => {
      const newValue = value instanceof Function ? value(storedValue) : value;
      setStoredValue(newValue);
      if (window.electron?.settingsSet) {
        window.electron.settingsSet(key, newValue);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
}
