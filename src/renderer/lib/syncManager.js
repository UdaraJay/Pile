/**
 * Sync Manager - Coordinates between local cache, offline queue, and Supabase
 * Implements the core sync infrastructure and replay logic
 */

import { supabase } from './supabase.js';
import { localCache } from './localCache.js';
import { offlineQueue, OPERATION_TYPES, SUPPORTED_TABLES } from './offlineQueue.js';
import { networkStatus } from './networkStatus.js';

class SyncManager {
  constructor() {
    this.isInitialized = false;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.conflictResolutionStrategy = 'last-write-wins';
    this.listeners = [];
    
    this.setupNetworkListener();
  }

  /**
   * Initialize the sync manager
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Initialize local cache
      await localCache.init();
      
      // Set up network connectivity listener
      this.setupNetworkListener();
      
      // Load last sync time from metadata
      this.lastSyncTime = await localCache.getMetadata('last_sync_time');
      
      // If we're online, start initial sync
      if (networkStatus.getStatus().isOnline) {
        this.scheduleSync();
      }
      
      this.isInitialized = true;
      console.log('SyncManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SyncManager:', error);
      throw error;
    }
  }

  /**
   * Setup network status listener
   */
  setupNetworkListener() {
    networkStatus.addListener((status) => {
      if (status.isOnline && !status.previousStatus) {
        console.log('Back online - starting sync process');
        this.scheduleSync();
      }
    });
  }

  /**
   * Add a sync event listener
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of sync events
   */
  notifyListeners(event, data = {}) {
    this.listeners.forEach(listener => {
      try {
        listener({
          event,
          timestamp: new Date().toISOString(),
          ...data
        });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Schedule sync with debouncing
   */
  scheduleSync(delayMs = 1000) {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.performFullSync();
    }, delayMs);
  }

  /**
   * Perform a full synchronization process
   */
  async performFullSync() {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping');
      return;
    }

    if (!networkStatus.getStatus().isOnline) {
      console.log('Cannot sync: offline');
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners('sync_started');

    try {
      console.log('Starting full synchronization...');
      
      // Step 1: Process offline queue (replay local changes)
      await this.processOfflineQueue();
      
      // Step 2: Pull remote changes
      await this.pullRemoteChanges();
      
      // Step 3: Update sync metadata
      this.lastSyncTime = new Date().toISOString();
      await localCache.setMetadata('last_sync_time', this.lastSyncTime);
      
      console.log('Full synchronization completed successfully');
      this.notifyListeners('sync_completed', { 
        success: true,
        syncTime: this.lastSyncTime 
      });
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.notifyListeners('sync_failed', { error: error.message });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process the offline queue - replay local changes to server
   */
  async processOfflineQueue() {
    console.log('Processing offline queue...');
    
    const pendingItems = await offlineQueue.getPendingItems();
    if (pendingItems.length === 0) {
      console.log('No pending operations to sync');
      return;
    }

    console.log(`Processing ${pendingItems.length} offline operations`);
    
    for (const item of pendingItems) {
      try {
        await offlineQueue.updateQueueItemStatus(item.id, 'PROCESSING');
        await this.executeOperation(item);
        await offlineQueue.updateQueueItemStatus(item.id, 'COMPLETED');
        console.log(`Successfully synced operation ${item.id}`);
      } catch (error) {
        console.error(`Failed to sync operation ${item.id}:`, error);
        await offlineQueue.updateQueueItemStatus(item.id, 'FAILED', error.message);
      }
    }

    // Clean up completed items
    await offlineQueue.cleanupQueue();
  }

  /**
   * Execute a queued operation against Supabase
   */
  async executeOperation(queueItem) {
    const { operation_type, table_name, data, metadata } = queueItem;
    
    switch (operation_type) {
      case OPERATION_TYPES.CREATE:
        return await this.executeCreateOperation(table_name, data, metadata);
      case OPERATION_TYPES.UPDATE:
        return await this.executeUpdateOperation(table_name, data, metadata);
      case OPERATION_TYPES.DELETE:
        return await this.executeDeleteOperation(table_name, data, metadata);
      default:
        throw new Error(`Unknown operation type: ${operation_type}`);
    }
  }

  /**
   * Execute CREATE operation
   */
  async executeCreateOperation(tableName, data, metadata) {
    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Update local cache with server response
      switch (tableName) {
        case SUPPORTED_TABLES.POSTS:
          await localCache.upsertPost(result);
          break;
        case SUPPORTED_TABLES.PILES:
          await localCache.upsertPile(result);
          break;
        case SUPPORTED_TABLES.USER_PROFILES:
          await localCache.upsertUserProfile(result);
          break;
      }

      return result;
    } catch (error) {
      console.error(`CREATE operation failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute UPDATE operation
   */
  async executeUpdateOperation(tableName, data, metadata) {
    try {
      const { id, ...updateData } = data;
      const { data: result, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle conflicts with last-write-wins strategy
      const localItem = await this.getLocalItem(tableName, id);
      const resolvedData = this.resolveConflict(localItem, result, updateData, tableName);

      // Update local cache
      switch (tableName) {
        case SUPPORTED_TABLES.POSTS:
          await localCache.upsertPost(resolvedData);
          break;
        case SUPPORTED_TABLES.PILES:
          await localCache.upsertPile(resolvedData);
          break;
        case SUPPORTED_TABLES.USER_PROFILES:
          await localCache.upsertUserProfile(resolvedData);
          break;
      }

      return resolvedData;
    } catch (error) {
      console.error(`UPDATE operation failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Execute DELETE operation
   */
  async executeDeleteOperation(tableName, data, metadata) {
    try {
      const { id } = data;
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local cache
      switch (tableName) {
        case SUPPORTED_TABLES.POSTS:
          await localCache.deletePost(id);
          break;
        case SUPPORTED_TABLES.PILES:
          await localCache.deletePile(id);
          break;
        case SUPPORTED_TABLES.USER_PROFILES:
          // User profiles are typically not deleted, just handle error
          console.warn('Delete operation on user_profiles is not typically allowed');
          break;
      }

      return { id, deleted: true };
    } catch (error) {
      console.error(`DELETE operation failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Pull remote changes since last sync
   */
  async pullRemoteChanges() {
    console.log('Pulling remote changes...');
    
    const since = this.lastSyncTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago if no last sync
    
    try {
      // Pull posts changes
      await this.pullTableChanges(SUPPORTED_TABLES.POSTS, since);
      
      // Pull piles changes
      await this.pullTableChanges(SUPPORTED_TABLES.PILES, since);
      
      // Pull user profiles changes
      await this.pullTableChanges(SUPPORTED_TABLES.USER_PROFILES, since);
      
    } catch (error) {
      console.error('Failed to pull remote changes:', error);
      throw error;
    }
  }

  /**
   * Pull changes for a specific table
   */
  async pullTableChanges(tableName, since) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .gt('updated_at', since)
        .order('updated_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`Pulled ${data.length} changes for ${tableName}`);
        
        for (const item of data) {
          // Check for local conflicts
          const localItem = await this.getLocalItem(tableName, item.id);
          const resolvedItem = this.resolveConflict(localItem, item, null, tableName);
          
          // Update local cache
          switch (tableName) {
            case SUPPORTED_TABLES.POSTS:
              await localCache.upsertPost(resolvedItem);
              break;
            case SUPPORTED_TABLES.PILES:
              await localCache.upsertPile(resolvedItem);
              break;
            case SUPPORTED_TABLES.USER_PROFILES:
              await localCache.upsertUserProfile(resolvedItem);
              break;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to pull changes for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get local item by table and ID
   */
  async getLocalItem(tableName, id) {
    try {
      switch (tableName) {
        case SUPPORTED_TABLES.POSTS:
          return await localCache.getPost(id);
        case SUPPORTED_TABLES.PILES:
          return await localCache.getPile(id);
        case SUPPORTED_TABLES.USER_PROFILES:
          return await localCache.getUserProfile(id);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error getting local item ${id} from ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Resolve conflicts using last-write-wins strategy
   */
  resolveConflict(localItem, remoteItem, pendingChanges = null, tableName = null) {
    if (!localItem) {
      // No local version, use remote
      return remoteItem;
    }

    if (!remoteItem) {
      // No remote version, use local
      return localItem;
    }

    // Compare timestamps for last-write-wins
    const localTime = new Date(localItem.updated_at || localItem.cached_at);
    const remoteTime = new Date(remoteItem.updated_at);

    const bothChangedSinceLastSync = async () => {
      try {
        const lastSync = this.lastSyncTime ? new Date(this.lastSyncTime) : null;
        const localChanged = lastSync ? new Date(localItem.cached_at || localItem.updated_at) > lastSync : false;
        const remoteChanged = lastSync ? new Date(remoteItem.updated_at) > lastSync : true;
        // Heuristic: if we have pendingChanges (local update) and remote changed, consider conflict
        const hasPending = !!pendingChanges;
        return (localChanged || hasPending) && remoteChanged;
      } catch {
        return false;
      }
    };

    // Detect conflict scenario and record it for UI resolution
    // We still return a best-effort value using LWW to keep cache consistent
    (async () => {
      if (await bothChangedSinceLastSync()) {
        try {
          await localCache.addConflict({
            table_name: tableName || (localItem && Object.prototype.hasOwnProperty.call(localItem, 'pile_id') ? SUPPORTED_TABLES.POSTS : SUPPORTED_TABLES.PILES),
            item_id: localItem.id || remoteItem.id,
            local: localItem,
            remote: remoteItem,
            strategy: 'lww_detect',
          });
          console.warn('Conflict detected and recorded for item', localItem.id || remoteItem.id);
        } catch (e) {
          console.warn('Failed to add conflict record:', e?.message || e);
        }
      }
    })();

    if (remoteTime > localTime) {
      console.log(`Remote item is newer, using remote version for ${remoteItem.id}`);
      return remoteItem;
    } else {
      console.log(`Local item is newer or same age, keeping local version for ${localItem.id}`);
      return localItem;
    }
  }

  /**
   * Queue an operation for offline execution
   */
  async queueOperation(operationType, tableName, data, metadata = {}) {
    if (!networkStatus.getStatus().isOnline) {
      console.log(`Queueing ${operationType} operation on ${tableName} (offline)`);
      return await offlineQueue.enqueue(operationType, tableName, data, metadata);
    } else {
      // If online, execute immediately
      console.log(`Executing ${operationType} operation on ${tableName} (online)`);
      try {
        const queueItem = {
          operation_type: operationType,
          table_name: tableName,
          data,
          metadata
        };
        return await this.executeOperation(queueItem);
      } catch (error) {
        // If immediate execution fails, queue it
        console.log(`Immediate execution failed, queueing operation: ${error.message}`);
        return await offlineQueue.enqueue(operationType, tableName, data, metadata);
      }
    }
  }

  /**
   * Get sync status and statistics
   */
  async getStatus() {
    const queueStats = await offlineQueue.getQueueStats();
    const cacheStats = await localCache.getCacheStats();
    const networkStats = networkStatus.getStats();

    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      networkStatus: networkStats,
      queueStats,
      cacheStats,
      listenersCount: this.listeners.length
    };
  }

  /**
   * Force a manual sync
   */
  async forceSync() {
    console.log('Force sync requested');
    await this.performFullSync();
  }

  /**
   * Clear all local data (cache and queue)
   */
  async clearAllData() {
    console.log('Clearing all local data...');
    await localCache.clearCache();
    await offlineQueue.clearQueue();
    this.lastSyncTime = null;
    await localCache.setMetadata('last_sync_time', null);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.listeners = [];
    console.log('SyncManager cleaned up');
  }
}

// Create and export singleton instance
export const syncManager = new SyncManager();
export default syncManager;
