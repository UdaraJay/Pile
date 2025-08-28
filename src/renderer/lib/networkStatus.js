/**
 * Network Connectivity Detection and Management
 * Provides robust connectivity detection beyond simple navigator.onLine
 */

class NetworkStatus {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.checkInterval = null;
    this.checkIntervalMs = 30000; // Check every 30 seconds
    this.lastCheckTime = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    
    this.setupListeners();
    this.startPeriodicCheck();
  }

  /**
   * Setup basic browser connectivity event listeners
   */
  setupListeners() {
    window.addEventListener('online', () => {
      console.log('Browser reports online');
      this.handleConnectivityChange(true);
    });

    window.addEventListener('offline', () => {
      console.log('Browser reports offline');
      this.handleConnectivityChange(false);
    });

    // Listen for page visibility changes to check connectivity when app becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkConnectivity();
      }
    });

    // Listen for focus events to check connectivity
    window.addEventListener('focus', () => {
      this.checkConnectivity();
    });
  }

  /**
   * Add a listener for connectivity changes
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Remove a specific listener
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of connectivity changes
   */
  notifyListeners(isOnline, previousStatus) {
    this.listeners.forEach(listener => {
      try {
        listener({
          isOnline,
          previousStatus,
          timestamp: new Date().toISOString(),
          source: 'networkStatus'
        });
      } catch (error) {
        console.error('Error in connectivity listener:', error);
      }
    });
  }

  /**
   * Handle connectivity state changes
   */
  handleConnectivityChange(newOnlineStatus) {
    const previousStatus = this.isOnline;
    
    if (newOnlineStatus !== previousStatus) {
      this.isOnline = newOnlineStatus;
      this.lastCheckTime = new Date().toISOString();
      
      // Reset consecutive failures on successful connection
      if (newOnlineStatus) {
        this.consecutiveFailures = 0;
      }
      
      console.log(`Connectivity changed: ${previousStatus ? 'online' : 'offline'} -> ${newOnlineStatus ? 'online' : 'offline'}`);
      this.notifyListeners(newOnlineStatus, previousStatus);
    }
  }

  /**
   * Perform actual connectivity check using multiple methods
   */
  async checkConnectivity() {
    const checkStartTime = Date.now();
    
    try {
      // Method 1: Try to reach Supabase endpoint
      const supabaseCheck = await this.checkSupabaseConnectivity();
      
      if (supabaseCheck.success) {
        this.handleConnectivityChange(true);
        return {
          isOnline: true,
          method: 'supabase',
          latency: Date.now() - checkStartTime,
          timestamp: new Date().toISOString()
        };
      }

      // Method 2: Try to reach a reliable external service
      const externalCheck = await this.checkExternalConnectivity();
      
      if (externalCheck.success) {
        this.handleConnectivityChange(true);
        return {
          isOnline: true,
          method: 'external',
          latency: Date.now() - checkStartTime,
          timestamp: new Date().toISOString()
        };
      }

      // Method 3: Use navigator.onLine as fallback
      const navigatorOnline = navigator.onLine;
      this.consecutiveFailures++;
      
      // Only consider offline if we have multiple consecutive failures
      const shouldBeOffline = this.consecutiveFailures >= this.maxConsecutiveFailures;
      
      this.handleConnectivityChange(navigatorOnline && !shouldBeOffline);
      
      return {
        isOnline: navigatorOnline && !shouldBeOffline,
        method: 'navigator',
        consecutiveFailures: this.consecutiveFailures,
        latency: Date.now() - checkStartTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Connectivity check failed:', error);
      this.consecutiveFailures++;
      
      const shouldBeOffline = this.consecutiveFailures >= this.maxConsecutiveFailures;
      this.handleConnectivityChange(!shouldBeOffline && navigator.onLine);
      
      return {
        isOnline: !shouldBeOffline && navigator.onLine,
        method: 'error',
        error: error.message,
        consecutiveFailures: this.consecutiveFailures,
        latency: Date.now() - checkStartTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check connectivity specifically to Supabase
   */
  async checkSupabaseConnectivity() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://cikhrockryhbgeefhhec.supabase.co/rest/v1/', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);
      
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check connectivity to external reliable services
   */
  async checkExternalConnectivity() {
    const testUrls = [
      'https://httpbin.org/status/200',
      'https://jsonplaceholder.typicode.com/posts/1',
      'https://api.github.com'
    ];

    for (const url of testUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return {
            success: true,
            url: url,
            status: response.status
          };
        }
      } catch (error) {
        // Continue to next URL
        continue;
      }
    }

    return {
      success: false,
      error: 'All external connectivity checks failed'
    };
  }

  /**
   * Start periodic connectivity checking
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, this.checkIntervalMs);

    console.log(`Started periodic connectivity check every ${this.checkIntervalMs}ms`);
  }

  /**
   * Stop periodic connectivity checking
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('Stopped periodic connectivity check');
    }
  }

  /**
   * Get current connectivity status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      lastCheckTime: this.lastCheckTime,
      consecutiveFailures: this.consecutiveFailures,
      checkIntervalMs: this.checkIntervalMs
    };
  }

  /**
   * Force an immediate connectivity check
   */
  async forceCheck() {
    console.log('Forcing connectivity check...');
    return await this.checkConnectivity();
  }

  /**
   * Update check interval
   */
  setCheckInterval(intervalMs) {
    if (intervalMs < 5000) {
      throw new Error('Check interval must be at least 5 seconds');
    }
    
    this.checkIntervalMs = intervalMs;
    this.startPeriodicCheck(); // Restart with new interval
  }

  /**
   * Cleanup - remove all listeners and stop periodic checking
   */
  cleanup() {
    this.stopPeriodicCheck();
    this.listeners = [];
    
    // Remove DOM event listeners
    window.removeEventListener('online', this.handleConnectivityChange);
    window.removeEventListener('offline', this.handleConnectivityChange);
    document.removeEventListener('visibilitychange', this.checkConnectivity);
    window.removeEventListener('focus', this.checkConnectivity);
  }

  /**
   * Get connectivity statistics
   */
  getStats() {
    return {
      currentStatus: this.isOnline,
      lastCheck: this.lastCheckTime,
      consecutiveFailures: this.consecutiveFailures,
      maxConsecutiveFailures: this.maxConsecutiveFailures,
      checkInterval: this.checkIntervalMs,
      listenersCount: this.listeners.length,
      periodicCheckActive: !!this.checkInterval
    };
  }
}

// Create and export singleton instance
export const networkStatus = new NetworkStatus();
export default networkStatus;