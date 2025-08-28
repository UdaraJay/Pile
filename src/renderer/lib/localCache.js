/**
 * Local Data Cache using IndexedDB for offline-first functionality
 * Mirrors Supabase data structure locally
 */

const DB_NAME = 'PileBintangCache';
const DB_VERSION = 2; // bump for conflicts store

// Define the schema for our local cache
const STORES = {
  POSTS: 'posts',
  PILES: 'piles',
  USER_PROFILES: 'user_profiles',
  OFFLINE_QUEUE: 'offline_queue',
  METADATA: 'metadata'
};

class LocalCache {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize IndexedDB database with schema
   */
  async init() {
    if (this.isInitialized) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('Upgrading IndexedDB schema...');

        // Posts store - mirrors Supabase posts table
        if (!db.objectStoreNames.contains(STORES.POSTS)) {
          const postsStore = db.createObjectStore(STORES.POSTS, { keyPath: 'id' });
          postsStore.createIndex('pile_id', 'pile_id', { unique: false });
          postsStore.createIndex('user_id', 'user_id', { unique: false });
          postsStore.createIndex('created_at', 'created_at', { unique: false });
          postsStore.createIndex('updated_at', 'updated_at', { unique: false });
          postsStore.createIndex('file_path', 'file_path', { unique: false });
        }

        // Piles store - mirrors Supabase piles table
        if (!db.objectStoreNames.contains(STORES.PILES)) {
          const pilesStore = db.createObjectStore(STORES.PILES, { keyPath: 'id' });
          pilesStore.createIndex('user_id', 'user_id', { unique: false });
          pilesStore.createIndex('name', 'name', { unique: false });
          pilesStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // User profiles store - mirrors Supabase user_profiles table
        if (!db.objectStoreNames.contains(STORES.USER_PROFILES)) {
          const profilesStore = db.createObjectStore(STORES.USER_PROFILES, { keyPath: 'id' });
          profilesStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // Offline queue store for pending operations
        if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          queueStore.createIndex('operation_type', 'operation_type', { unique: false });
          queueStore.createIndex('table_name', 'table_name', { unique: false });
          queueStore.createIndex('created_at', 'created_at', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
        }

        // Metadata store for sync timestamps and app state
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }

        // Conflicts store for detected sync conflicts
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', {
            keyPath: 'id',
            autoIncrement: true,
          });
          conflictsStore.createIndex('table_name', 'table_name', { unique: false });
          conflictsStore.createIndex('item_id', 'item_id', { unique: false });
          conflictsStore.createIndex('status', 'status', { unique: false });
          conflictsStore.createIndex('detected_at', 'detected_at', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized before operations
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.init();
    }
    return this.db;
  }

  // ==================== POSTS CRUD OPERATIONS ====================

  /**
   * Create or update a post in local cache
   */
  async upsertPost(postData) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.POSTS], 'readwrite');
    const store = transaction.objectStore(STORES.POSTS);

    const postToStore = {
      ...postData,
      cached_at: new Date().toISOString(),
      is_dirty: false, // Track if local changes need sync
    };

    return new Promise((resolve, reject) => {
      const request = store.put(postToStore);
      request.onsuccess = () => resolve(postToStore);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a post by ID from local cache
   */
  async getPost(postId) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.POSTS], 'readonly');
    const store = transaction.objectStore(STORES.POSTS);

    return new Promise((resolve, reject) => {
      const request = store.get(postId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all posts for a specific pile from local cache
   */
  async getPostsByPile(pileId) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.POSTS], 'readonly');
    const store = transaction.objectStore(STORES.POSTS);
    const index = store.index('pile_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(pileId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a post from local cache
   */
  async deletePost(postId) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.POSTS], 'readwrite');
    const store = transaction.objectStore(STORES.POSTS);

    return new Promise((resolve, reject) => {
      const request = store.delete(postId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== PILES CRUD OPERATIONS ====================

  /**
   * Create or update a pile in local cache
   */
  async upsertPile(pileData) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.PILES], 'readwrite');
    const store = transaction.objectStore(STORES.PILES);

    const pileToStore = {
      ...pileData,
      cached_at: new Date().toISOString(),
      is_dirty: false,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(pileToStore);
      request.onsuccess = () => resolve(pileToStore);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a pile by ID from local cache
   */
  async getPile(pileId) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.PILES], 'readonly');
    const store = transaction.objectStore(STORES.PILES);

    return new Promise((resolve, reject) => {
      const request = store.get(pileId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all piles for a user from local cache
   */
  async getPilesByUser(userId) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.PILES], 'readonly');
    const store = transaction.objectStore(STORES.PILES);
    const index = store.index('user_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a pile from local cache
   */
  async deletePile(pileId) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.PILES, STORES.POSTS], 'readwrite');
    const pilesStore = transaction.objectStore(STORES.PILES);
    const postsStore = transaction.objectStore(STORES.POSTS);

    return new Promise((resolve, reject) => {
      // First delete the pile
      const deletePileRequest = pilesStore.delete(pileId);
      
      deletePileRequest.onsuccess = () => {
        // Then delete all posts in this pile
        const postsIndex = postsStore.index('pile_id');
        const getPostsRequest = postsIndex.getAll(pileId);
        
        getPostsRequest.onsuccess = () => {
          const posts = getPostsRequest.result;
          let deleteCount = 0;
          
          if (posts.length === 0) {
            resolve(true);
            return;
          }
          
          posts.forEach(post => {
            const deletePostRequest = postsStore.delete(post.id);
            deletePostRequest.onsuccess = () => {
              deleteCount++;
              if (deleteCount === posts.length) {
                resolve(true);
              }
            };
            deletePostRequest.onerror = () => reject(deletePostRequest.error);
          });
        };
        
        getPostsRequest.onerror = () => reject(getPostsRequest.error);
      };
      
      deletePileRequest.onerror = () => reject(deletePileRequest.error);
    });
  }

  // ==================== USER PROFILES CRUD OPERATIONS ====================

  /**
   * Create or update a user profile in local cache
   */
  async upsertUserProfile(profileData) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.USER_PROFILES], 'readwrite');
    const store = transaction.objectStore(STORES.USER_PROFILES);

    const profileToStore = {
      ...profileData,
      cached_at: new Date().toISOString(),
      is_dirty: false,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(profileToStore);
      request.onsuccess = () => resolve(profileToStore);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a user profile by ID from local cache
   */
  async getUserProfile(userId) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.USER_PROFILES], 'readonly');
    const store = transaction.objectStore(STORES.USER_PROFILES);

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== METADATA OPERATIONS ====================

  /**
   * Set metadata value
   */
  async setMetadata(key, value) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.METADATA);

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, updated_at: new Date().toISOString() });
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get metadata value
   */
  async getMetadata(key) {
    const db = await this.ensureInitialized();
    const transaction = db.transaction([STORES.METADATA], 'readonly');
    const store = transaction.objectStore(STORES.METADATA);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== CONFLICTS OPERATIONS ====================

  /**
   * Add a detected conflict record
   */
  async addConflict(conflict) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(['conflicts'], 'readwrite');
    const store = tx.objectStore('conflicts');
    const record = {
      status: 'pending',
      detected_at: new Date().toISOString(),
      ...conflict,
    };
    return new Promise((resolve, reject) => {
      const req = store.add(record);
      req.onsuccess = () => resolve({ ...record, id: req.result });
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * List conflicts (optionally by status)
   */
  async getConflicts(status = null) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(['conflicts'], 'readonly');
    const store = tx.objectStore('conflicts');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        resolve(status ? all.filter((c) => c.status === status) : all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Resolve a conflict by applying chosen data and marking record
   */
  async resolveConflictRecord(conflictId, resolution, resolvedData = null) {
    const db = await this.ensureInitialized();
    const tx = db.transaction(['conflicts'], 'readwrite');
    const store = tx.objectStore('conflicts');
    return new Promise((resolve, reject) => {
      const getReq = store.get(conflictId);
      getReq.onsuccess = async () => {
        const rec = getReq.result;
        if (!rec) return reject(new Error('Conflict not found'));
        rec.status = 'resolved';
        rec.resolution = resolution;
        rec.resolved_at = new Date().toISOString();
        rec.resolved_data = resolvedData;
        const putReq = store.put(rec);
        putReq.onsuccess = () => resolve(rec);
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Clear all data from local cache
   */
  async clearCache() {
    const db = await this.ensureInitialized();
    const storeNames = Object.values(STORES);
    const transaction = db.transaction(storeNames, 'readwrite');

    const clearPromises = storeNames.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(clearPromises);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    const db = await this.ensureInitialized();
    const stats = {};

    for (const storeName of Object.values(STORES)) {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      stats[storeName] = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return stats;
  }

  /**
   * Close the database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Create and export a singleton instance
export const localCache = new LocalCache();
export default localCache;
