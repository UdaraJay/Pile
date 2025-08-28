import { app } from 'electron';
import { promises as fs } from 'fs';
import path from 'path';

export type SyncOperationType = 'upsertPost' | 'tombstonePost' | 'upsertAttachment' | 'deleteAttachment';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  pilePath: string;
  postId?: string;
  filePath?: string;
  data?: any;
  etag?: string;
  createdAt: string;
  retryCount: number;
  nextRetryAt?: string;
  lastError?: string;
}

export interface QueueStats {
  totalOperations: number;
  pendingOperations: number;
  failedOperations: number;
  lastProcessedAt?: string;
}

class SyncQueue {
  private queuePath: string;
  private queue: SyncOperation[] = [];
  private isLoaded = false;
  private readonly maxRetries = 5;
  private readonly baseRetryDelayMs = 1000;

  constructor() {
    this.queuePath = path.join(app.getPath('userData'), 'sync-queue.json');
  }

  /**
   * Load the queue from persistent storage
   */
  private async loadQueue(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const data = await fs.readFile(this.queuePath, 'utf8');
      this.queue = JSON.parse(data);
      this.isLoaded = true;
    } catch (error) {
      // Queue file doesn't exist or is invalid, start with empty queue
      this.queue = [];
      this.isLoaded = true;
    }
  }

  /**
   * Save the queue to persistent storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await fs.writeFile(this.queuePath, JSON.stringify(this.queue, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Generate unique ID for operations
   */
  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate next retry time with exponential backoff and jitter
   */
  private calculateNextRetryTime(retryCount: number): string {
    const baseDelay = this.baseRetryDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
    const delay = baseDelay + jitter;
    const nextRetry = new Date(Date.now() + delay);
    return nextRetry.toISOString();
  }

  /**
   * Enqueue a sync operation
   */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount'>): Promise<void> {
    await this.loadQueue();

    const syncOperation: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.queue.push(syncOperation);
    await this.saveQueue();
  }

  /**
   * Take operations ready for processing (up to N operations)
   */
  async take(maxOperations = 100): Promise<SyncOperation[]> {
    await this.loadQueue();

    const now = new Date();
    const readyOperations = this.queue
      .filter(op => {
        // Skip if waiting for retry
        if (op.nextRetryAt && new Date(op.nextRetryAt) > now) {
          return false;
        }
        // Skip if exceeded max retries
        if (op.retryCount >= this.maxRetries) {
          return false;
        }
        return true;
      })
      .slice(0, maxOperations);

    return readyOperations;
  }

  /**
   * Acknowledge successful processing of an operation
   */
  async ack(operationId: string): Promise<void> {
    await this.loadQueue();

    this.queue = this.queue.filter(op => op.id !== operationId);
    await this.saveQueue();
  }

  /**
   * Mark an operation as failed and schedule retry
   */
  async nack(operationId: string, error: string): Promise<void> {
    await this.loadQueue();

    const operation = this.queue.find(op => op.id === operationId);
    if (!operation) return;

    operation.retryCount += 1;
    operation.lastError = error;

    if (operation.retryCount < this.maxRetries) {
      operation.nextRetryAt = this.calculateNextRetryTime(operation.retryCount);
    }

    await this.saveQueue();
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    await this.loadQueue();

    const now = new Date();
    const pending = this.queue.filter(op => {
      return op.retryCount < this.maxRetries && 
             (!op.nextRetryAt || new Date(op.nextRetryAt) <= now);
    }).length;

    const failed = this.queue.filter(op => op.retryCount >= this.maxRetries).length;

    return {
      totalOperations: this.queue.length,
      pendingOperations: pending,
      failedOperations: failed,
    };
  }

  /**
   * Get queue length for a specific pile
   */
  async getQueueLengthForPile(pilePath: string): Promise<number> {
    await this.loadQueue();
    return this.queue.filter(op => op.pilePath === pilePath).length;
  }

  /**
   * Clear failed operations
   */
  async clearFailed(): Promise<void> {
    await this.loadQueue();
    this.queue = this.queue.filter(op => op.retryCount < this.maxRetries);
    await this.saveQueue();
  }

  /**
   * Clear all operations for a pile
   */
  async clearForPile(pilePath: string): Promise<void> {
    await this.loadQueue();
    this.queue = this.queue.filter(op => op.pilePath !== pilePath);
    await this.saveQueue();
  }
}

// Export singleton instance
export const syncQueue = new SyncQueue();