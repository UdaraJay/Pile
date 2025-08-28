import { useEffect, useRef, useState, useCallback } from 'react';
import { useToastsContext } from 'renderer/context/ToastsContext';

const STORE_KEY = 'sync_auto_enabled';
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function AutoSyncManager() {
  const { addNotification } = useToastsContext();
  const [enabled, setEnabled] = useState(false);
  const timerRef = useRef(null);

  const loadEnabled = useCallback(async () => {
    try {
      const val = await window.electron?.store?.get(STORE_KEY);
      setEnabled(Boolean(val));
    } catch (_) {
      setEnabled(false);
    }
  }, []);

  const tick = useCallback(async () => {
    try {
      if (!window.electron?.sync?.getStatus) return;
      const res = await window.electron.sync.getStatus();
      const piles = Array.isArray(res?.piles) ? res.piles : [];
      for (const p of piles) {
        if (p.linked && (p.queueLen ?? 0) > 0) {
          try {
            const result = await window.electron.sync.runSync(p.pilePath);
            if (!result?.started && result?.error) {
              addNotification({
                id: `autosync-error-${p.pilePath}`,
                type: 'error',
                message: `Auto-sync failed to start for this pile: ${result.error}`,
                dismissTime: 5000,
                immediate: false,
              });
            }
          } catch (e) {
            addNotification({
              id: `autosync-error-${p.pilePath}`,
              type: 'error',
              message: `Auto-sync error: ${e?.message || 'Unknown error'}`,
              dismissTime: 5000,
              immediate: false,
            });
          }
        }
      }
    } catch (e) {
      // Swallow global errors to avoid loops; errors are surfaced per-pile
    }
  }, [addNotification]);

  // Load initial setting
  useEffect(() => {
    loadEnabled();
  }, [loadEnabled]);

  // Listen for toggle events from Settings
  useEffect(() => {
    const handler = (ev) => setEnabled(Boolean(ev?.detail));
    window.addEventListener('sync:auto-toggle', handler);
    return () => window.removeEventListener('sync:auto-toggle', handler);
  }, []);

  // Manage interval
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (enabled) {
      // Run once immediately, then on interval
      tick();
      timerRef.current = setInterval(tick, INTERVAL_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, tick]);

  return null;
}

