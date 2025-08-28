import { promises as fs } from 'fs';
import path from 'path';

export interface SyncCheckpoint {
  lastPulledAt?: string;
  lastPulledId?: string;
  lastPushedAt?: string;
  lastPushedEtag?: string;
  remotePileId?: string;
}

export interface PileSyncState {
  pilePath: string;
  linked: boolean;
  remotePileId?: string;
  checkpoint: SyncCheckpoint;
  lastError?: string;
  queueLength: number;
  conflictsCount: number;
}

class SyncStateManager {
  private stateCache = new Map<string, PileSyncState>();

  /**
   * Get the sync state file path for a pile
   */
  private getSyncStatePath(pilePath: string): string {
    return path.join(pilePath, '.pile', 'sync.json');
  }

  /**
   * Ensure the .pile directory exists
   */
  private async ensurePileDirectory(pilePath: string): Promise<void> {
    const pileDir = path.join(pilePath, '.pile');
    try {
      await fs.mkdir(pileDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create .pile directory:', error);
    }
  }

  /**
   * Load sync state for a pile from disk
   */
  async loadState(pilePath: string): Promise<PileSyncState> {
    const cacheKey = pilePath;
    
    // Return cached state if available
    if (this.stateCache.has(cacheKey)) {
      return this.stateCache.get(cacheKey)!;
    }

    const syncStatePath = this.getSyncStatePath(pilePath);
    
    try {
      const data = await fs.readFile(syncStatePath, 'utf8');
      const checkpoint: SyncCheckpoint = JSON.parse(data);
      
      const state: PileSyncState = {
        pilePath,
        linked: Boolean(checkpoint.remotePileId),
        remotePileId: checkpoint.remotePileId,
        checkpoint,
        queueLength: 0, // Will be populated by queue manager
        conflictsCount: 0, // Will be populated by conflict manager
      };

      this.stateCache.set(cacheKey, state);
      return state;
    } catch (error) {
      // State file doesn't exist or is invalid, return default state
      const defaultState: PileSyncState = {
        pilePath,
        linked: false,
        checkpoint: {},
        queueLength: 0,
        conflictsCount: 0,
      };

      this.stateCache.set(cacheKey, defaultState);
      return defaultState;
    }
  }

  /**
   * Save sync state for a pile to disk
   */
  async saveState(pilePath: string, state: Partial<PileSyncState>): Promise<void> {
    await this.ensurePileDirectory(pilePath);
    
    const currentState = await this.loadState(pilePath);
    const updatedState = { ...currentState, ...state };
    
    this.stateCache.set(pilePath, updatedState);
    
    const syncStatePath = this.getSyncStatePath(pilePath);
    const checkpoint = updatedState.checkpoint;
    
    try {
      await fs.writeFile(syncStatePath, JSON.stringify(checkpoint, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save sync state:', error);
      throw error;
    }
  }

  /**
   * Update checkpoint data for a pile
   */
  async updateCheckpoint(pilePath: string, checkpoint: Partial<SyncCheckpoint>): Promise<void> {
    const currentState = await this.loadState(pilePath);
    const updatedCheckpoint = { ...currentState.checkpoint, ...checkpoint };
    
    await this.saveState(pilePath, {
      checkpoint: updatedCheckpoint,
      linked: Boolean(updatedCheckpoint.remotePileId),
      remotePileId: updatedCheckpoint.remotePileId,
    });
  }

  /**
   * Link a pile to a remote pile ID
   */
  async linkPile(pilePath: string, remotePileId: string): Promise<void> {
    await this.updateCheckpoint(pilePath, { remotePileId });
  }

  /**
   * Unlink a pile from remote sync
   */
  async unlinkPile(pilePath: string): Promise<void> {
    await this.saveState(pilePath, {
      linked: false,
      remotePileId: undefined,
      checkpoint: {},
    });
    
    // Remove from cache
    this.stateCache.delete(pilePath);
  }

  /**
   * Get all linked piles
   */
  async getLinkedPiles(): Promise<PileSyncState[]> {
    // For now, return empty array - this would need to be implemented
    // by scanning for piles with sync state files
    return [];
  }

  /**
   * Clear cached state for a pile
   */
  clearCache(pilePath: string): void {
    this.stateCache.delete(pilePath);
  }
}

// Export singleton instance
export const syncStateManager = new SyncStateManager();