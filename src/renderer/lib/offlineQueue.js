/**
 * Offline Queue Management for storing and replaying CUD operations
 * Works with LocalCache to ensure data consistency during offline periods
 */

import { localCache } from './localCache.js';

// Operation types for the queue
export const OPERATION_TYPES = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
};

// Queue item statuses
export const QUEUE_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING'
};

// Table names that can be queued
export const SUPPORTED_TABLES = {
  POSTS: 'posts',
  PILES: 'piles',
  USER_PROFILES: 'user_profiles'
};

class OfflineQueue {
  constructor() {
    this.isOnline = navigator.onLine;
    this.retryAttempts = 3;
    this.retryDelayMs = 1000;
    this.setupConnectivityListeners();
  }

  /**
   * Setup network connectivity event listeners
   */
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('Network connectivity restored');
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('Network connectivity lost');
      this.isOnline = false;
    });
  }

  /**
   * Add an operation to the offline queue
   */
  async enqueue(operationType, tableName, data, metadata = {}) {
    if (!Object.values(OPERATION_TYPES).includes(operationType)) {
      throw new Error(`Invalid operation type: ${operationType}`);
    }

    if (!Object.values(SUPPORTED_TABLES).includes(tableName)) {
      throw new Error(`Unsupported table: ${tableName}`);
    }

    const queueItem = {
      operation_type: operationType,
      table_name: tableName,
      data: data,
      metadata: metadata,
      status: QUEUE_STATUS.PENDING,
      created_at: new Date().toISOString(),
      retry_count: 0,
      error_message: null
    };

    const db = await localCache.ensureInitialized();
    const transaction = db.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem);
      request.onsuccess = () => {
        const itemId = request.result;
        console.log(`Operation queued: ${operationType} on ${tableName} (ID: ${itemId})`);
        resolve({ ...queueItem, id: itemId });
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending queue items
   */
  async getPendingItems() {
    const db = await localCache.ensureInitialized();
    const transaction = db.transaction(['offline_queue'], 'readonly');
    const store = transaction.objectStore('offline_queue');
    const index = store.index('status');

    return new Promise((resolve, reject) => {
      const request = index.getAll(QUEUE_STATUS.PENDING);
      request.onsuccess = () => {
        const pendingItems = request.result;
        // Sort by creation time to maintain order
        pendingItems.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        resolve(pendingItems);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update queue item status
   */
  async updateQueueItemStatus(itemId, status, errorMessage = null) {
    const db = await localCache.ensureInitialized();
    const transaction = db.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(itemId);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          reject(new Error(`Queue item not found: ${itemId}`));
          return;
        }

        item.status = status;
        item.error_message = errorMessage;
        item.updated_at = new Date().toISOString();

        if (status === QUEUE_STATUS.RETRYING) {
          item.retry_count = (item.retry_count || 0) + 1;
        }

        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve(item);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Remove completed or failed items from queue
   */
  async cleanupQueue() {
    const db = await localCache.ensureInitialized();
    const transaction = db.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');

    return new Promise((resolve, reject) => {
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const allItems = getAllRequest.result;
        const itemsToDelete = allItems.filter(
          item => item.status === QUEUE_STATUS.COMPLETED || 
                 (item.status === QUEUE_STATUS.FAILED && item.retry_count >= this.retryAttempts)
        );

        if (itemsToDelete.length === 0) {
          resolve(0);
          return;
        }

        let deleteCount = 0;
        itemsToDelete.forEach(item => {
          const deleteRequest = store.delete(item.id);
          deleteRequest.onsuccess = () => {
            deleteCount++;
            if (deleteCount === itemsToDelete.length) {
              console.log(`Cleaned up ${deleteCount} queue items`);
              resolve(deleteCount);
            }
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  /**
   * Process the queue when back online
   */
  async processQueue() {
    if (!this.isOnline) {
      console.log('Cannot process queue: offline');
      return;
    }

    console.log('Processing offline queue...');
    const pendingItems = await this.getPendingItems();

    if (pendingItems.length === 0) {
      console.log('No pending items in queue');
      return;
    }

    console.log(`Processing ${pendingItems.length} queued operations`);

    for (const item of pendingItems) {
      try {
        await this.updateQueueItemStatus(item.id, QUEUE_STATUS.PROCESSING);
        await this.executeQueuedOperation(item);
        await this.updateQueueItemStatus(item.id, QUEUE_STATUS.COMPLETED);
        console.log(`Successfully processed queue item ${item.id}`);
      } catch (error) {
        console.error(`Failed to process queue item ${item.id}:`, error);
        
        if (item.retry_count < this.retryAttempts) {
          await this.updateQueueItemStatus(item.id, QUEUE_STATUS.RETRYING, error.message);
          console.log(`Will retry queue item ${item.id} (attempt ${item.retry_count + 1}/${this.retryAttempts})`);
          
          // Retry with exponential backoff
          setTimeout(() => {
            this.processQueueItem(item.id);
          }, this.retryDelayMs * Math.pow(2, item.retry_count));
        } else {
          await this.updateQueueItemStatus(item.id, QUEUE_STATUS.FAILED, error.message);
          console.error(`Queue item ${item.id} failed permanently after ${this.retryAttempts} attempts`);
        }
      }
    }

    // Clean up completed items
    await this.cleanupQueue();
  }

  /**
   * Process a single queue item
   */
  async processQueueItem(itemId) {
    const db = await localCache.ensureInitialized();
    const transaction = db.transaction(['offline_queue'], 'readonly');
    const store = transaction.objectStore('offline_queue');

    return new Promise((resolve, reject) => {
      const request = store.get(itemId);
      request.onsuccess = async () => {
        const item = request.result;
        if (!item) {
          reject(new Error(`Queue item not found: ${itemId}`));
          return;
        }

        try {
          await this.updateQueueItemStatus(itemId, QUEUE_STATUS.PROCESSING);
          await this.executeQueuedOperation(item);
          await this.updateQueueItemStatus(itemId, QUEUE_STATUS.COMPLETED);
          resolve(item);
        } catch (error) {
          if (item.retry_count < this.retryAttempts) {
            await this.updateQueueItemStatus(itemId, QUEUE_STATUS.RETRYING, error.message);
          } else {
            await this.updateQueueItemStatus(itemId, QUEUE_STATUS.FAILED, error.message);
          }
          reject(error);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute a queued operation (this will be implemented with actual Supabase calls)
   * For now, this is a placeholder that simulates the operation
   */
  async executeQueuedOperation(queueItem) {
    const { operation_type, table_name, data, metadata } = queueItem;
    
    console.log(`Executing ${operation_type} operation on ${table_name}:`, data);

    // TODO: This will be replaced with actual Supabase operations in the sync manager
    // For now, just simulate success/failure for testing
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate 90% success rate for testing
        if (Math.random() < 0.9) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`Simulated failure for ${operation_type} on ${table_name}`));
        }
      }, 100);
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const db = await localCache.ensureInitialized();
    const transaction = db.transaction(['offline_queue'], 'readonly');
    const store = transaction.objectStore('offline_queue');

    return new Promise((resolve, reject) => {
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const items = getAllRequest.result;
        const stats = {
          total: items.length,
          pending: items.filter(item => item.status === QUEUE_STATUS.PENDING).length,
          processing: items.filter(item => item.status === QUEUE_STATUS.PROCESSING).length,
          completed: items.filter(item => item.status === QUEUE_STATUS.COMPLETED).length,
          failed: items.filter(item => item.status === QUEUE_STATUS.FAILED).length,
          retrying: items.filter(item => item.status === QUEUE_STATUS.RETRYING).length,
          byOperation: {},
          byTable: {}
        };

        // Group by operation type
        items.forEach(item => {
          stats.byOperation[item.operation_type] = (stats.byOperation[item.operation_type] || 0) + 1;
          stats.byTable[item.table_name] = (stats.byTable[item.table_name] || 0) + 1;
        });

        resolve(stats);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  /**
   * Clear all items from the queue
   */
  async clearQueue() {
    const db = await localCache.ensureInitialized();
    const transaction = db.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('Offline queue cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if we're currently online
   */
  isOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Manually trigger connectivity check
   */
  async checkConnectivity() {
    // Try to make a simple request to determine actual connectivity
    try {
      const response = await fetch('https://cikhrockryhbgeefhhec.supabase.co/rest/v1/', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      if (this.isOnline && !wasOnline) {
        console.log('Connectivity restored via check');
        this.processQueue();
      }
      
      return this.isOnline;
    } catch (error) {
      console.log('Connectivity check failed:', error.message);
      this.isOnline = false;
      return false;
    }
  }
}

// Create and export singleton instance
export const offlineQueue = new OfflineQueue();
export default offlineQueue;