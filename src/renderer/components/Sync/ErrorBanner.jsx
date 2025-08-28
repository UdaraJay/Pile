import React from 'react';
import styles from './ErrorBanner.module.scss';
import { AlertTriangleIcon } from 'renderer/icons';
import { useSyncInfra } from '../../context/SyncInfraContext';

export default function ErrorBanner() {
  const { lastError, lastErrorAt, forceSync, clearError, isOnline } = useSyncInfra();
  if (!lastError) return null;

  return (
    <div className={styles.banner}>
      <div><AlertTriangleIcon style={{ width: 16, height: 16 }} /></div>
      <div className={styles.text}>
        <div style={{ fontWeight: 600 }}>Sync error</div>
        <div>{lastError}</div>
        {lastErrorAt && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>at {new Date(lastErrorAt).toLocaleTimeString()}</div>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.button} onClick={forceSync} disabled={!isOnline}>Retry</button>
        <button className={`${styles.button} ${styles.secondary}`} onClick={clearError}>Dismiss</button>
      </div>
    </div>
  );
}
