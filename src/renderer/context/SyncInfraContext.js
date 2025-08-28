/**
 * Sync Infrastructure Context - React integration for offline-first sync
 * Provides React hooks and context for the sync infrastructure
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncManager } from '../lib/syncManager.js';
import { networkStatus } from '../lib/networkStatus.js';
import { offlineQueue } from '../lib/offlineQueue.js';
import { localCache } from '../lib/localCache.js';

const SyncInfraContext = createContext();

export function SyncInfraContextProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    isInitialized: false,
    syncInProgress: false,
    lastSyncTime: null,
    queueStats: { total: 0, pending: 0, failed: 0 },
    cacheStats: {}
  });
  const [networkLatency, setNetworkLatency] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [lastErrorAt, setLastErrorAt] = useState(null);

  // Refresh sync status (defined early to avoid TDZ issues in effects)
  const refreshSyncStatus = useCallback(async () => {
    try {
      const status = await syncManager.getStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Failed to refresh sync status:', error);
    }
  }, []);

  // Initialize sync infrastructure
  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log('Initializing sync infrastructure...');
        
        // Initialize sync manager
        await syncManager.init();
        
        // Update initial status
        const status = await syncManager.getStatus();
        setSyncStatus(status);
        
        console.log('Sync infrastructure initialized successfully');
      } catch (error) {
        console.error('Failed to initialize sync infrastructure:', error);
      }
    };

    initializeSync();

    // Cleanup on unmount
    return () => {
      syncManager.cleanup();
      networkStatus.cleanup();
    };
  }, []);

  // Setup network status listener
  useEffect(() => {
    const unsubscribe = networkStatus.addListener((status) => {
      setIsOnline(status.isOnline);
      setNetworkLatency(status.latency);
      
      // Update sync status when connectivity changes
      refreshSyncStatus();
    });

    return unsubscribe;
  }, [refreshSyncStatus]);

  // Setup sync manager listener
  useEffect(() => {
    const unsubscribe = syncManager.addListener((event) => {
      console.log('Sync event:', event);
      if (event?.event === 'sync_failed') {
        setLastError(event?.error || 'Synchronization failed');
        setLastErrorAt(new Date().toISOString());
      }
      if (event?.event === 'sync_started') {
        // clear transient error on new attempt
        setLastError(null);
      }
      refreshSyncStatus();
    });

    return unsubscribe;
  }, [refreshSyncStatus]);

  // Force sync
  const forceSync = useCallback(async () => {
    try {
      await syncManager.forceSync();
    } catch (error) {
      console.error('Force sync failed:', error);
      setLastError(error?.message || String(error));
      setLastErrorAt(new Date().toISOString());
    }
  }, []);

  // Queue an operation
  const queueOperation = useCallback(async (operationType, tableName, data, metadata = {}) => {
    try {
      const result = await syncManager.queueOperation(operationType, tableName, data, metadata);
      await refreshSyncStatus(); // Update status after queueing
      return result;
    } catch (error) {
      console.error('Failed to queue operation:', error);
      throw error;
    }
  }, [refreshSyncStatus]);

  // Clear all local data
  const clearLocalData = useCallback(async () => {
    try {
      await syncManager.clearAllData();
      await refreshSyncStatus();
    } catch (error) {
      console.error('Failed to clear local data:', error);
      throw error;
    }
  }, [refreshSyncStatus]);

  // Check connectivity
  const checkConnectivity = useCallback(async () => {
    try {
      const result = await networkStatus.forceCheck();
      return result;
    } catch (error) {
      console.error('Connectivity check failed:', error);
      return { isOnline: false, error: error.message };
    }
  }, []);

  // Get cached data
  const getCachedPosts = useCallback(async (pileId) => {
    try {
      return await localCache.getPostsByPile(pileId);
    } catch (error) {
      console.error('Failed to get cached posts:', error);
      return [];
    }
  }, []);

  const getCachedPiles = useCallback(async (userId) => {
    try {
      return await localCache.getPilesByUser(userId);
    } catch (error) {
      console.error('Failed to get cached piles:', error);
      return [];
    }
  }, []);

  // Context value
  const contextValue = {
    // Network status
    isOnline,
    networkLatency,
    checkConnectivity,

    // Sync status
    syncStatus,
    refreshSyncStatus,

    // Sync operations
    forceSync,
    queueOperation,
    clearLocalData,

    // Cache operations
    getCachedPosts,
    getCachedPiles,

    // Computed values
    isPendingSync: syncStatus.queueStats.pending > 0,
    isFailedOperations: syncStatus.queueStats.failed > 0,
    lastSyncFormatted: syncStatus.lastSyncTime 
      ? new Date(syncStatus.lastSyncTime).toLocaleString()
      : 'Never',

    // Error state
    lastError,
    lastErrorAt,
    clearError: () => setLastError(null),
  };

  return (
    <SyncInfraContext.Provider value={contextValue}>
      {children}
    </SyncInfraContext.Provider>
  );
}

// Custom hook to use sync infrastructure
export function useSyncInfra() {
  const context = useContext(SyncInfraContext);
  if (!context) {
    throw new Error('useSyncInfra must be used within a SyncInfraContextProvider');
  }
  return context;
}

// Custom hook for network status only
export function useNetworkStatus() {
  const { isOnline, networkLatency, checkConnectivity } = useSyncInfra();
  return { isOnline, networkLatency, checkConnectivity };
}

// Custom hook for sync operations only
export function useSyncOperations() {
  const { forceSync, queueOperation, refreshSyncStatus, syncStatus } = useSyncInfra();
  return { forceSync, queueOperation, refreshSyncStatus, syncStatus };
}

// Custom hook for offline queue status
export function useOfflineQueue() {
  const { syncStatus, isPendingSync, isFailedOperations } = useSyncInfra();
  return { 
    queueStats: syncStatus.queueStats,
    isPendingSync, 
    isFailedOperations
  };
}

export default SyncInfraContext;
