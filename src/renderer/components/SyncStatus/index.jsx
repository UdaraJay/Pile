/**
 * Sync Status Component - Shows current sync status and controls
 */

import React from 'react';
import { useSyncInfra } from '../../context/SyncInfraContext.js';
import styles from './SyncStatus.module.scss';
import { RefreshIcon, CheckIcon, AlertTriangleIcon, ClockIcon, GlobeIcon } from 'renderer/icons';

export default function SyncStatus({ compact = false, showDetails = true }) {
  const {
    isOnline,
    networkLatency,
    syncStatus,
    forceSync,
    refreshSyncStatus,
    isPendingSync,
    isFailedOperations,
    lastSyncFormatted,
    checkConnectivity
  } = useSyncInfra();

  const handleForceSync = async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const handleCheckConnectivity = async () => {
    try {
      const result = await checkConnectivity();
      console.log('Connectivity check result:', result);
    } catch (error) {
      console.error('Connectivity check failed:', error);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'var(--error-color, #ff4444)';
    if (syncStatus.syncInProgress) return 'var(--warning-color, #ffaa00)';
    if (isFailedOperations) return 'var(--error-color, #ff4444)';
    if (isPendingSync) return 'var(--info-color, #4488ff)';
    return 'var(--success-color, #44ff44)';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (isFailedOperations) return `${syncStatus.queueStats.failed} Failed`;
    if (isPendingSync) return `${syncStatus.queueStats.pending} Pending`;
    return 'Synced';
  };

  const statusName = !isOnline
    ? 'offline'
    : syncStatus.syncInProgress
    ? 'syncing'
    : isFailedOperations
    ? 'failed'
    : isPendingSync
    ? 'pending'
    : 'synced';

  const getStatusIcon = () => {
    if (!isOnline) return <AlertTriangleIcon className={styles.svgIcon} />;
    if (syncStatus.syncInProgress) return <RefreshIcon className={styles.svgIcon} />;
    if (isFailedOperations) return <AlertTriangleIcon className={styles.svgIcon} />;
    if (isPendingSync) return <ClockIcon className={styles.svgIcon} />;
    return <CheckIcon className={styles.svgIcon} />;
  };

  if (compact) {
    return (
      <div className={`${styles.syncStatus} ${styles.compact}`}>
        <div 
          className={styles.indicator}
          data-status={statusName}
          style={{ backgroundColor: getStatusColor() }}
          title={`${getStatusText()}${networkLatency ? ` (${networkLatency}ms)` : ''}`}
        >
          <span className={styles.icon}>{getStatusIcon()}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.syncStatus}>
      <div className={styles.header}>
        <div className={styles.statusRow}>
          <div 
            className={styles.indicator}
            data-status={statusName}
            style={{ backgroundColor: getStatusColor() }}
          >
            <span className={styles.icon}>{getStatusIcon()}</span>
          </div>
          <div className={styles.statusText}>
            <span className={styles.status}>{getStatusText()}</span>
            {networkLatency && isOnline && (
              <span className={styles.latency}>{networkLatency}ms</span>
            )}
          </div>
        </div>
        
        {showDetails && (
          <div className={styles.actions}>
            <button 
              onClick={handleForceSync}
              disabled={!isOnline || syncStatus.syncInProgress}
              className={styles.actionButton}
              title="Force synchronization"
            >
              <RefreshIcon className={styles.svgIcon} />
            </button>
            <button 
              onClick={handleCheckConnectivity}
              className={styles.actionButton}
              title="Check connectivity"
            >
              <GlobeIcon className={styles.svgIcon} />
            </button>
            <button 
              onClick={refreshSyncStatus}
              className={styles.actionButton}
              title="Refresh status"
            >
              <RefreshIcon className={styles.svgIcon} />
            </button>
          </div>
        )}
      </div>

      {showDetails && (
        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Last Sync:</span>
            <span className={styles.value}>{lastSyncFormatted}</span>
          </div>
          
          {syncStatus.queueStats.total > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Queue:</span>
              <span className={styles.value}>
                {syncStatus.queueStats.pending} pending, {' '}
                {syncStatus.queueStats.failed} failed
              </span>
            </div>
          )}
          
          <div className={styles.detailRow}>
            <span className={styles.label}>Cache:</span>
            <span className={styles.value}>
              {Object.values(syncStatus.cacheStats).reduce((a, b) => a + b, 0)} items
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
