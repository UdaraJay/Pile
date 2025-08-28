import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import * as Switch from '@radix-ui/react-switch';
import ConflictsPanel from './Conflicts';
import styles from './index.module.scss';

export default function PileSync() {
  const { currentPile, getCurrentPilePath, isAuthenticated } = usePilesContext();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoEnabled, setAutoEnabled] = useState(false);

  const pilePath = useMemo(() => getCurrentPilePath?.() ?? null, [getCurrentPilePath, currentPile]);
  const isLocalPile = !!pilePath;

  const fetchStatus = useCallback(async () => {
    if (!isLocalPile || !window.electron?.sync?.getStatus) {
      setStatus(null);
      return;
    }
    try {
      const res = await window.electron.sync.getStatus(pilePath);
      const pile = Array.isArray(res?.piles)
        ? res.piles.find((p) => p.pilePath === pilePath)
        : res;
      setStatus(pile || null);
    } catch (e) {
      console.error('Failed to load sync status', e);
      setError('Failed to load sync status');
    }
  }, [isLocalPile, pilePath]);

  useEffect(() => {
    setError(null);
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pilePath]);

  useEffect(() => {
    // Load autosync setting
    (async () => {
      try {
        const val = await window.electron?.store?.get('sync_auto_enabled');
        setAutoEnabled(Boolean(val));
      } catch (_) {
        setAutoEnabled(false);
      }
    })();
  }, []);

  const handleToggleAuto = useCallback(async (nextVal) => {
    try {
      setAutoEnabled(nextVal);
      await window.electron?.store?.set('sync_auto_enabled', nextVal);
      window.dispatchEvent(new CustomEvent('sync:auto-toggle', { detail: nextVal }));
    } catch (e) {
      setError('Failed to update auto-sync setting');
    }
  }, []);

  const handleLink = useCallback(async () => {
    if (!pilePath) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.electron.sync.linkPile(pilePath);
      if (res && res.linked === false) {
        setError(res.error || 'Failed to enable sync');
      } else {
        await fetchStatus();
      }
    } catch (e) {
      console.error('Failed to link pile', e);
      const msg = (e && e.message) || 'Failed to enable sync.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [pilePath, fetchStatus]);

  const handleUnlink = useCallback(async () => {
    if (!pilePath) return;
    setLoading(true);
    setError(null);
    try {
      await window.electron.sync.unlinkPile(pilePath);
      await fetchStatus();
    } catch (e) {
      console.error('Failed to unlink pile', e);
      setError('Failed to disable sync');
    } finally {
      setLoading(false);
    }
  }, [pilePath, fetchStatus]);

  const handleSync = useCallback(async () => {
    if (!pilePath) return;
    setLoading(true);
    setError(null);
    try {
      await window.electron.sync.runSync(pilePath);
      await fetchStatus();
    } catch (e) {
      console.error('Sync failed', e);
      setError('Sync failed');
    } finally {
      setLoading(false);
    }
  }, [pilePath, fetchStatus]);

  if (!isLocalPile) {
    return null; // Only show for local piles
  }

  const linked = !!status?.linked;
  const hasConflicts = (status?.conflictsCount ?? 0) > 0;
  const queueLen = status?.queueLen ?? 0;
  const lastSync = status?.lastPushAt || status?.lastPullAt;

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.pill} title={linked ? 'Cloud sync enabled' : 'Not linked'}>
          <span>{linked ? '✅' : '⚪'}</span>
          <span>{linked ? 'Cloud Sync Enabled' : 'Cloud Sync Disabled'}</span>
        </div>
        {queueLen > 0 && (
          <span className={styles.muted}>⏳ {queueLen} pending</span>
        )}
        {hasConflicts && (
          <span className={styles.warning}>⚠️ {status.conflictsCount} conflicts</span>
        )}
        {lastSync && (
          <span className={styles.muted}>
            Last sync: {new Date(lastSync).toLocaleString()}
          </span>
        )}
      </div>

      {!linked ? (
        <div className={styles.row}>
          <button className={styles.btn} onClick={handleLink} disabled={loading || !isAuthenticated}>
            {loading ? 'Linking…' : 'Enable Cloud Sync'}
          </button>
          {!isAuthenticated && (
            <span className={styles.muted}>Sign in to enable sync</span>
          )}
        </div>
      ) : (
        <div className={styles.row}>
          <button className={styles.btn} onClick={handleSync} disabled={loading}>
            {loading ? 'Syncing…' : 'Sync Now'}
          </button>
          <button className={styles.btnSecondary} onClick={handleUnlink} disabled={loading}>
            Disable Sync
          </button>
          <button
            className={styles.btnSecondary}
            onClick={async () => {
              if (!pilePath) return;
              setLoading(true);
              setError(null);
              try {
                await window.electron.sync.rescan(pilePath);
                await window.electron.sync.runSync(pilePath);
                await fetchStatus();
              } catch (e) {
                setError(e?.message || 'Rescan failed');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            title="Re-scan files and enqueue for sync"
          >
            Force Rescan
          </button>
        </div>
      )}

      {linked && (
        <div className={styles.row}>
          <label className={styles.muted} htmlFor="auto-sync">
            Auto-sync every 5 minutes
          </label>
          <Switch.Root
            id="auto-sync"
            checked={autoEnabled}
            onCheckedChange={handleToggleAuto}
            style={{
              width: 38,
              height: 22,
              background: autoEnabled ? '#2a9d8f' : '#333',
              borderRadius: 9999,
              position: 'relative',
            }}
          >
            <Switch.Thumb
              style={{
                display: 'block',
                width: 18,
                height: 18,
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'transform 100ms',
                transform: autoEnabled ? 'translateX(18px)' : 'translateX(2px)',
                willChange: 'transform',
                margin: 2,
              }}
            />
          </Switch.Root>
        </div>
      )}

      {linked && status?.lastError && (
        <div className={styles.row}>
          <span className={styles.warning}>Last error: {status.lastError}</span>
          <button className={styles.btnSecondary} onClick={handleSync} disabled={loading}>
            Retry Sync
          </button>
        </div>
      )}

      {linked && hasConflicts && (
        <ConflictsPanel onResolved={fetchStatus} />
      )}

      {error && <div className={styles.warning}>{error}</div>}
    </div>
  );
}
