import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { usePilesContext } from './PilesContext';
import { supabase } from '../lib/supabase';

const SyncContext = createContext({});

export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};

// Local cache using IndexedDB wrapper - Task 15.1 & 15.2
class LocalCache {
  constructor() {
    this.dbName = 'pilebintang-cache';
    this.version = 1;
    this.db = null;
    this.ready = false;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create posts store
        if (!db.objectStoreNames.contains('posts')) {
          const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
          postsStore.createIndex('pile_id', 'pile_id', { unique: false });
          postsStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Create piles store
        if (!db.objectStoreNames.contains('piles')) {
          const pilesStore = db.createObjectStore('piles', { keyPath: 'id' });
          pilesStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Create offline queue store
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queueStore = db.createObjectStore('offline_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('operation', 'operation', { unique: false });
        }

        // Create sync metadata store
        if (!db.objectStoreNames.contains('sync_metadata')) {
          db.createObjectStore('sync_metadata', { keyPath: 'key' });
        }
      };
    });
  }

  async getPosts(pileId = null) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['posts'], 'readonly');
      const store = transaction.objectStore('posts');

      if (pileId) {
        const index = store.index('pile_id');
        const request = index.getAll(pileId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    });
  }

  async getPost(id) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['posts'], 'readonly');
      const store = transaction.objectStore('posts');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePost(post) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['posts'], 'readwrite');
      const store = transaction.objectStore('posts');
      const request = store.put({
        ...post,
        _cached_at: new Date().toISOString(),
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePost(id) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['posts'], 'readwrite');
      const store = transaction.objectStore('posts');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async savePosts(posts) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['posts'], 'readwrite');
      const store = transaction.objectStore('posts');
      let completed = 0;
      const errors = [];

      if (posts.length === 0) {
        resolve(true);
        return;
      }

      posts.forEach((post) => {
        const request = store.put({
          ...post,
          _cached_at: new Date().toISOString(),
        });

        request.onsuccess = () => {
          completed++;
          if (completed === posts.length) {
            resolve(errors.length === 0);
          }
        };

        request.onerror = () => {
          errors.push(request.error);
          completed++;
          if (completed === posts.length) {
            if (errors.length === posts.length) {
              reject(errors[0]);
            } else {
              resolve(false); // Partial success
            }
          }
        };
      });
    });
  }

  async getPiles() {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['piles'], 'readonly');
      const store = transaction.objectStore('piles');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async savePile(pile) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['piles'], 'readwrite');
      const store = transaction.objectStore('piles');
      const request = store.put({
        ...pile,
        _cached_at: new Date().toISOString(),
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePile(id) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['piles'], 'readwrite');
      const store = transaction.objectStore('piles');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async addToOfflineQueue(operation) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offline_queue'], 'readwrite');
      const store = transaction.objectStore('offline_queue');
      const request = store.add({
        ...operation,
        timestamp: new Date().toISOString(),
        queueId: Date.now() + Math.random(), // Simple unique ID for queue items
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineQueue() {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offline_queue'], 'readonly');
      const store = transaction.objectStore('offline_queue');
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromOfflineQueue(id) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offline_queue'], 'readwrite');
      const store = transaction.objectStore('offline_queue');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async setSyncMetadata(key, value) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_metadata'], 'readwrite');
      const store = transaction.objectStore('sync_metadata');
      const request = store.put({
        key,
        value,
        updated_at: new Date().toISOString(),
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncMetadata(key) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_metadata'], 'readonly');
      const store = transaction.objectStore('sync_metadata');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }
}

export function SyncProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { currentPile } = usePilesContext();

  const [localCache] = useState(() => new LocalCache());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [queueLength, setQueueLength] = useState(0);
  const [syncError, setSyncError] = useState(null);

  const syncIntervalRef = useRef(null);
  // Initialize local cache when component mounts
  useEffect(() => {
    localCache.init().catch(console.error);
  }, [localCache]);

  // Task 15.3: Network connectivity detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncError(null);
      // Trigger sync when coming back online
      if (isAuthenticated) {
        processOfflineQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated]);

  // Set up periodic sync when online and authenticated
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      // Initial sync
      performInitialDataFetch();

      // Set up periodic sync every 30 seconds
      syncIntervalRef.current = setInterval(() => {
        performIncrementalSync();
      }, 30000);
    } else {
      // Clear interval when offline or not authenticated
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isAuthenticated, isOnline]);

  // Update queue length when needed
  const updateQueueLength = useCallback(async () => {
    try {
      const queue = await localCache.getOfflineQueue();
      setQueueLength(queue.length);
    } catch (error) {
      console.error('Error updating queue length:', error);
    }
  }, [localCache]);

  // Task 15.1: Initial Supabase data fetch & local cache population
  const performInitialDataFetch = useCallback(async () => {
    if (!isAuthenticated || !isOnline) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('Performing initial data fetch from Supabase...');

      // Fetch all user's piles
      const { data: piles, error: pilesError } = await supabase
        .from('piles')
        .select('*')
        .eq('user_id', user.id);

      if (pilesError) throw pilesError;

      // Cache piles locally
      for (const pile of piles) {
        await localCache.savePile(pile);
      }

      // Fetch all posts for user's piles
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in(
          'pile_id',
          piles.map((p) => p.id),
        )
        .order('updated_at', { ascending: false });

      if (postsError) throw postsError;

      // Cache posts locally
      await localCache.savePosts(posts);

      // Store sync metadata
      await localCache.setSyncMetadata(
        'last_full_sync',
        new Date().toISOString(),
      );

      setLastSyncTime(new Date());
      console.log(
        `Initial sync completed: ${piles.length} piles, ${posts.length} posts`,
      );
    } catch (error) {
      console.error('Initial data fetch failed:', error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, isOnline, user, localCache]);

  // Task 15.4: Incremental sync (pull mechanism)
  const performIncrementalSync = useCallback(async () => {
    if (!isAuthenticated || !isOnline || isSyncing) return;

    try {
      const lastSyncTime = await localCache.getSyncMetadata(
        'last_incremental_sync',
      );
      const sinceTime =
        lastSyncTime ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24h if no sync time

      console.log('Performing incremental sync since:', sinceTime);

      // Fetch updated piles
      const { data: updatedPiles, error: pilesError } = await supabase
        .from('piles')
        .select('*')
        .eq('user_id', user.id)
        .gt('updated_at', sinceTime);

      if (pilesError) throw pilesError;

      // Update local cache with new piles data
      for (const pile of updatedPiles) {
        await localCache.savePile(pile);
      }

      // Fetch updated posts
      const { data: userPiles } = await supabase
        .from('piles')
        .select('id')
        .eq('user_id', user.id);

      const { data: updatedPosts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in(
          'pile_id',
          userPiles.map((p) => p.id),
        )
        .gt('updated_at', sinceTime);

      if (postsError) throw postsError;

      // Task 15.5: Apply last-write-wins conflict resolution
      for (const remotePost of updatedPosts) {
        const localPost = await localCache.getPost(remotePost.id);

        if (
          !localPost ||
          new Date(remotePost.updated_at) >= new Date(localPost.updated_at)
        ) {
          // Remote is newer or doesn't exist locally, use remote version
          await localCache.savePost(remotePost);
        }
        // If local is newer, keep local version (last-write-wins)
      }

      // Update sync timestamp
      await localCache.setSyncMetadata(
        'last_incremental_sync',
        new Date().toISOString(),
      );

      if (updatedPiles.length > 0 || updatedPosts.length > 0) {
        console.log(
          `Incremental sync: ${updatedPiles.length} piles, ${updatedPosts.length} posts updated`,
        );
      }
    } catch (error) {
      console.error('Incremental sync failed:', error);
      setSyncError(error.message);
    }
  }, [isAuthenticated, isOnline, isSyncing, user, localCache]);

  // Task 15.2: Local cache CRUD operations
  const createPostLocal = useCallback(
    async (postData) => {
      const post = {
        ...postData,
        id: postData.id || `local_${Date.now()}_${Math.random()}`,
        created_at: postData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id,
      };

      await localCache.savePost(post);

      // Task 15.3: Write-through to Supabase if online
      if (isOnline && isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .insert(post)
            .select()
            .single();

          if (error) throw error;

          // Update local cache with server-generated data
          await localCache.savePost(data);
          return data;
        } catch (error) {
          console.error('Failed to sync new post to Supabase:', error);
          // Add to offline queue for later sync
          await localCache.addToOfflineQueue({
            operation: 'create',
            table: 'posts',
            data: post,
          });
          await updateQueueLength();
        }
      } else {
        // Offline: add to queue
        await localCache.addToOfflineQueue({
          operation: 'create',
          table: 'posts',
          data: post,
        });
        await updateQueueLength();
      }

      return post;
    },
    [localCache, isOnline, isAuthenticated, user, updateQueueLength],
  );

  const updatePostLocal = useCallback(
    async (id, updates) => {
      const existingPost = await localCache.getPost(id);
      if (!existingPost) {
        throw new Error('Post not found in local cache');
      }

      const updatedPost = {
        ...existingPost,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await localCache.savePost(updatedPost);

      // Write-through to Supabase if online
      if (isOnline && isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          // Update local cache with server response
          await localCache.savePost(data);
          return data;
        } catch (error) {
          console.error('Failed to sync post update to Supabase:', error);
          // Add to offline queue
          await localCache.addToOfflineQueue({
            operation: 'update',
            table: 'posts',
            id,
            data: updates,
          });
          await updateQueueLength();
        }
      } else {
        // Offline: add to queue
        await localCache.addToOfflineQueue({
          operation: 'update',
          table: 'posts',
          id,
          data: updates,
        });
        await updateQueueLength();
      }

      return updatedPost;
    },
    [localCache, isOnline, isAuthenticated, updateQueueLength],
  );

  const deletePostLocal = useCallback(
    async (id) => {
      await localCache.deletePost(id);

      // Write-through to Supabase if online
      if (isOnline && isAuthenticated) {
        try {
          const { error } = await supabase.from('posts').delete().eq('id', id);

          if (error) throw error;
        } catch (error) {
          console.error('Failed to sync post deletion to Supabase:', error);
          // Add to offline queue
          await localCache.addToOfflineQueue({
            operation: 'delete',
            table: 'posts',
            id,
          });
          await updateQueueLength();
        }
      } else {
        // Offline: add to queue
        await localCache.addToOfflineQueue({
          operation: 'delete',
          table: 'posts',
          id,
        });
        await updateQueueLength();
      }

      return true;
    },
    [localCache, isOnline, isAuthenticated, updateQueueLength],
  );

  const getPostLocal = useCallback(
    async (id) => {
      return await localCache.getPost(id);
    },
    [localCache],
  );

  const getPostsLocal = useCallback(
    async (pileId = null) => {
      return await localCache.getPosts(pileId);
    },
    [localCache],
  );

  // Process offline queue when coming back online
  const processOfflineQueue = useCallback(async () => {
    if (!isOnline || !isAuthenticated || isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const queue = await localCache.getOfflineQueue();
      console.log(`Processing offline queue: ${queue.length} operations`);

      for (const operation of queue) {
        try {
          let success = false;

          switch (operation.operation) {
            case 'create':
              if (operation.table === 'posts') {
                const { data, error } = await supabase
                  .from('posts')
                  .insert(operation.data)
                  .select()
                  .single();

                if (!error) {
                  await localCache.savePost(data);
                  success = true;
                }
              }
              break;

            case 'update':
              if (operation.table === 'posts') {
                const { data, error } = await supabase
                  .from('posts')
                  .update(operation.data)
                  .eq('id', operation.id)
                  .select()
                  .single();

                if (!error) {
                  await localCache.savePost(data);
                  success = true;
                }
              }
              break;

            case 'delete':
              if (operation.table === 'posts') {
                const { error } = await supabase
                  .from('posts')
                  .delete()
                  .eq('id', operation.id);

                if (!error) {
                  success = true;
                }
              }
              break;

            default:
              console.warn('Unknown operation type:', operation.operation);
          }

          if (success) {
            await localCache.removeFromOfflineQueue(operation.id);
          }
        } catch (error) {
          console.error('Failed to process queued operation:', error);
          // Keep in queue for next attempt
        }
      }

      await updateQueueLength();
    } catch (error) {
      console.error('Failed to process offline queue:', error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isAuthenticated, isSyncing, localCache, updateQueueLength]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline || !isAuthenticated) return;

    await performInitialDataFetch();
    await processOfflineQueue();
  }, [isOnline, isAuthenticated, performInitialDataFetch, processOfflineQueue]);

  const value = {
    // State
    isOnline,
    isSyncing,
    lastSyncTime,
    queueLength,
    syncError,

    // Local cache CRUD operations - Task 15.2
    createPostLocal,
    updatePostLocal,
    deletePostLocal,
    getPostLocal,
    getPostsLocal,

    // Sync operations - Tasks 15.1, 15.4, 15.5
    triggerSync,
    processOfflineQueue,
    performInitialDataFetch,
    performIncrementalSync,

    // Cache utilities
    localCache,

    // Utils
    canSync: isAuthenticated && isOnline,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export default SyncContext;
