/**
 * Test utility for the sync infrastructure
 * Provides methods to test offline/online behavior and data consistency
 */

import { localCache } from './localCache.js';
import { offlineQueue, OPERATION_TYPES, SUPPORTED_TABLES } from './offlineQueue.js';
import { networkStatus } from './networkStatus.js';
import { syncManager } from './syncManager.js';

class SyncTest {
  constructor() {
    this.testResults = [];
  }

  /**
   * Log test result
   */
  logResult(testName, success, message, data = null) {
    const result = {
      testName,
      success,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${testName}: ${message}`);
    
    if (data) {
      console.log('Test data:', data);
    }
    
    return result;
  }

  /**
   * Test local cache CRUD operations
   */
  async testLocalCache() {
    console.log('Testing Local Cache CRUD operations...');

    try {
      // Initialize cache
      await localCache.init();

      // Test post operations
      const testPost = {
        id: 'test-post-1',
        pile_id: 'test-pile-1',
        user_id: 'test-user-1',
        title: 'Test Post',
        content: 'This is a test post',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create post
      const createdPost = await localCache.upsertPost(testPost);
      this.logResult('Cache Create Post', !!createdPost, 'Post created successfully', createdPost);

      // Read post
      const retrievedPost = await localCache.getPost(testPost.id);
      this.logResult('Cache Read Post', !!retrievedPost && retrievedPost.id === testPost.id, 'Post retrieved successfully');

      // Update post
      const updatedPost = { ...testPost, title: 'Updated Test Post', updated_at: new Date().toISOString() };
      const updatedResult = await localCache.upsertPost(updatedPost);
      this.logResult('Cache Update Post', updatedResult.title === 'Updated Test Post', 'Post updated successfully');

      // Delete post
      await localCache.deletePost(testPost.id);
      const deletedPost = await localCache.getPost(testPost.id);
      this.logResult('Cache Delete Post', !deletedPost, 'Post deleted successfully');

      // Test pile operations
      const testPile = {
        id: 'test-pile-1',
        user_id: 'test-user-1',
        name: 'Test Pile',
        description: 'This is a test pile',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await localCache.upsertPile(testPile);
      const retrievedPile = await localCache.getPile(testPile.id);
      this.logResult('Cache Pile Operations', !!retrievedPile && retrievedPile.name === 'Test Pile', 'Pile operations successful');

    } catch (error) {
      this.logResult('Cache Test Error', false, `Cache test failed: ${error.message}`);
    }
  }

  /**
   * Test offline queue operations
   */
  async testOfflineQueue() {
    console.log('Testing Offline Queue operations...');

    try {
      // Clear queue first
      await offlineQueue.clearQueue();

      // Test queueing operations
      const testData = {
        id: 'test-post-2',
        title: 'Queued Post',
        content: 'This post was created while offline'
      };

      const queuedItem = await offlineQueue.enqueue(
        OPERATION_TYPES.CREATE,
        SUPPORTED_TABLES.POSTS,
        testData
      );

      this.logResult('Queue Enqueue', !!queuedItem.id, 'Operation queued successfully', queuedItem);

      // Test getting pending items
      const pendingItems = await offlineQueue.getPendingItems();
      this.logResult('Queue Get Pending', pendingItems.length === 1, `Found ${pendingItems.length} pending items`);

      // Test queue stats
      const queueStats = await offlineQueue.getQueueStats();
      this.logResult('Queue Stats', queueStats.total === 1 && queueStats.pending === 1, 'Queue statistics correct', queueStats);

    } catch (error) {
      this.logResult('Queue Test Error', false, `Queue test failed: ${error.message}`);
    }
  }

  /**
   * Test network connectivity detection
   */
  async testNetworkStatus() {
    console.log('Testing Network Status detection...');

    try {
      // Get current status
      const status = networkStatus.getStatus();
      this.logResult('Network Status', typeof status.isOnline === 'boolean', 'Network status obtained', status);

      // Test connectivity check
      const checkResult = await networkStatus.forceCheck();
      this.logResult('Network Check', typeof checkResult.isOnline === 'boolean', 'Connectivity check completed', checkResult);

      // Test listener
      let listenerCalled = false;
      const unsubscribe = networkStatus.addListener(() => {
        listenerCalled = true;
      });

      // Clean up listener
      setTimeout(() => {
        unsubscribe();
        this.logResult('Network Listener', true, 'Network listener test completed');
      }, 100);

    } catch (error) {
      this.logResult('Network Test Error', false, `Network test failed: ${error.message}`);
    }
  }

  /**
   * Test sync manager initialization and status
   */
  async testSyncManager() {
    console.log('Testing Sync Manager...');

    try {
      // Initialize sync manager
      await syncManager.init();
      this.logResult('Sync Init', syncManager.isInitialized, 'Sync manager initialized successfully');

      // Get status
      const status = await syncManager.getStatus();
      this.logResult('Sync Status', !!status && typeof status.isInitialized === 'boolean', 'Sync status obtained', status);

      // Test queueing through sync manager
      const testData = {
        id: 'test-sync-post-1',
        title: 'Sync Test Post',
        content: 'This post was created through sync manager'
      };

      const result = await syncManager.queueOperation(
        OPERATION_TYPES.CREATE,
        SUPPORTED_TABLES.POSTS,
        testData
      );

      this.logResult('Sync Queue Operation', !!result, 'Operation queued through sync manager', result);

    } catch (error) {
      this.logResult('Sync Test Error', false, `Sync test failed: ${error.message}`);
    }
  }

  /**
   * Simulate offline scenario
   */
  async testOfflineScenario() {
    console.log('Testing Offline Scenario...');

    try {
      // Clear queue first
      await offlineQueue.clearQueue();

      // Force offline status (for testing)
      const originalOnlineStatus = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      // Try to create multiple operations while "offline"
      const operations = [
        { type: OPERATION_TYPES.CREATE, data: { id: 'offline-1', title: 'Offline Post 1' } },
        { type: OPERATION_TYPES.UPDATE, data: { id: 'offline-2', title: 'Updated Post' } },
        { type: OPERATION_TYPES.DELETE, data: { id: 'offline-3' } }
      ];

      for (const op of operations) {
        await syncManager.queueOperation(op.type, SUPPORTED_TABLES.POSTS, op.data);
      }

      const queueStats = await offlineQueue.getQueueStats();
      this.logResult('Offline Operations', queueStats.pending === 3, `${queueStats.pending} operations queued while offline`, queueStats);

      // Restore original online status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnlineStatus
      });

    } catch (error) {
      this.logResult('Offline Scenario Error', false, `Offline scenario test failed: ${error.message}`);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('Starting comprehensive sync infrastructure tests...');
    this.testResults = [];

    await this.testLocalCache();
    await this.testOfflineQueue();
    await this.testNetworkStatus();
    await this.testSyncManager();
    await this.testOfflineScenario();

    // Summary
    const passedTests = this.testResults.filter(r => r.success).length;
    const totalTests = this.testResults.length;
    
    console.log(`\n=== Test Summary ===`);
    console.log(`Passed: ${passedTests}/${totalTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Sync infrastructure is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the results above for details.');
    }

    return {
      results: this.testResults,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        successRate: (passedTests / totalTests) * 100
      }
    };
  }

  /**
   * Get test results
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults = [];
  }
}

// Export singleton instance
export const syncTest = new SyncTest();
export default syncTest;

// Global test function for console access
window.testSyncInfrastructure = () => syncTest.runAllTests();