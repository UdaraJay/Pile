import chokidar from 'chokidar';
import path from 'path';
import { promises as fs } from 'fs';
import { syncQueue, SyncOperationType } from './queue';
import { syncStateManager } from './state';

interface WatchedPile {
  pilePath: string;
  watcher: chokidar.FSWatcher;
  debounceTimers: Map<string, NodeJS.Timeout>;
}

class FileWatcher {
  private watchedPiles = new Map<string, WatchedPile>();
  private readonly debounceDelayMs = 1000;
  // Debounced push timers per pile
  private pushTimers = new Map<string, NodeJS.Timeout>();
  // Concurrency guard for initial scan
  private initialScanInProgress = new Set<string>();

  /**
   * Start watching a pile for file changes
   */
  async startWatching(pilePath: string): Promise<void> {
    if (this.watchedPiles.has(pilePath)) {
      console.log(`Already watching pile: ${pilePath}`);
      return;
    }

    // Check if pile is linked before starting watch
    const state = await syncStateManager.loadState(pilePath);
    if (!state.linked) {
      console.log(`Pile not linked, skipping watch: ${pilePath}`);
      return;
    }

    const attachmentsPath = path.join(pilePath, 'attachments');
    const postsPath = path.join(pilePath, '**/*.md');
    // Ensure attachments directory exists (posts can live anywhere by date)
    try {
      await fs.mkdir(attachmentsPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create attachments directory: ${error}`);
      // Non-fatal
    }

    console.log(`Starting file watching for: ${postsPath}, ${attachmentsPath}`);
    
    const watcher = chokidar.watch([
      postsPath,
      path.join(attachmentsPath, '**/*'),
    ], {
      // We'll enqueue existing files ourselves on ready to avoid duplicates
      ignoreInitial: true,
      persistent: true,
      ignored: [
        '**/.pile/**', // Ignore .pile directory
        '**/node_modules/**',
        '**/.git/**',
      ],
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    const watchedPile: WatchedPile = {
      pilePath,
      watcher,
      debounceTimers: new Map(),
    };

    watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath, watchedPile))
      .on('change', (filePath) => this.handleFileChange('change', filePath, watchedPile))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath, watchedPile))
      .on('ready', async () => {
        console.log(`Watcher ready for ${pilePath}, scanning existing markdown files`);
        try {
          await this.enqueueExistingPosts(pilePath);
          console.log(`[WATCH] Initial enqueue complete for ${pilePath}`);
        } catch (e) {
          console.error(`[WATCH] Initial enqueue failed for ${pilePath}:`, e);
        }
        // Schedule initial push after enqueue
        this.schedulePush(pilePath);
      })
      .on('error', (error) => console.error(`Watcher error for ${pilePath}:`, error));

    this.watchedPiles.set(pilePath, watchedPile);
    console.log(`Started watching pile: ${pilePath}`);
  }

  /**
   * Stop watching a pile
   */
  async stopWatching(pilePath: string): Promise<void> {
    const watchedPile = this.watchedPiles.get(pilePath);
    if (!watchedPile) return;

    // Clear any pending debounce timers
    for (const timer of watchedPile.debounceTimers.values()) {
      clearTimeout(timer);
    }

    await watchedPile.watcher.close();
    this.watchedPiles.delete(pilePath);
    console.log(`Stopped watching pile: ${pilePath}`);
  }

  /**
   * Handle file system events with debouncing
   */
  private handleFileChange(
    event: 'add' | 'change' | 'unlink',
    filePath: string,
    watchedPile: WatchedPile
  ): void {
    const { pilePath, debounceTimers } = watchedPile;
    
    // Log file system events for visibility
    try {
      const rel = path.relative(pilePath, filePath).replace(/\\/g, '/');
      console.log(`[WATCH] ${event.toUpperCase()} ${rel}`);
    } catch {}

    // Clear existing timer for this file
    const existingTimer = debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.processFileChange(event, filePath, pilePath);
      debounceTimers.delete(filePath);
    }, this.debounceDelayMs);

    debounceTimers.set(filePath, timer);
  }

  /**
   * Process the actual file change after debouncing
   */
  private async processFileChange(
    event: 'add' | 'change' | 'unlink',
    filePath: string,
    pilePath: string
  ): Promise<void> {
    try {
      const relativePath = path.relative(pilePath, filePath).replace(/\\/g, '/');
      const isAttachment = relativePath.startsWith('attachments/');
      const isInPileMeta = relativePath.startsWith('.pile/');
      const isMarkdown = relativePath.endsWith('.md');
      const isPost = isMarkdown && !isAttachment && !isInPileMeta;

      if (isPost) {
        await this.handlePostChange(event, filePath, pilePath);
      } else if (isAttachment) {
        await this.handleAttachmentChange(event, filePath, pilePath);
      }
    } catch (error) {
      console.error(`Failed to process file change: ${error}`);
    }
  }

  /**
   * Handle changes to post files
   */
  private async handlePostChange(
    event: 'add' | 'change' | 'unlink',
    filePath: string,
    pilePath: string
  ): Promise<void> {
    // Compute relative path and post id from the filename
    const relativePath = path.relative(pilePath, filePath).replace(/\\/g, '/');
    const postId = this.extractPostIdFromPath(filePath);
    
    if (event === 'unlink') {
      // Enqueue tombstone operation
      await syncQueue.enqueue({
        type: 'tombstonePost',
        pilePath,
        postId,
        filePath: relativePath,
      });
    } else {
      // Read file content and compute etag
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const etag = this.computeEtag(content);

        await syncQueue.enqueue({
          type: 'upsertPost',
          pilePath,
          postId,
          filePath: relativePath,
          data: { content },
          etag,
        });
      } catch (error) {
        console.error(`Failed to read post file: ${error}`);
      }
    }

    // Schedule an automatic push for this pile
    this.schedulePush(pilePath);
  }

  /**
   * Handle changes to attachment files
   */
  private async handleAttachmentChange(
    event: 'add' | 'change' | 'unlink',
    filePath: string,
    pilePath: string
  ): Promise<void> {
    // Use relative path for queue to ensure correct path join later
    const relativePath = path.relative(pilePath, filePath).replace(/\\/g, '/');
    const attachmentInfo = this.parseAttachmentPath(relativePath);
    if (!attachmentInfo) return;

    if (event === 'unlink') {
      await syncQueue.enqueue({
        type: 'deleteAttachment',
        pilePath,
        postId: attachmentInfo.postId,
        filePath: relativePath,
        data: { hash: attachmentInfo.hash, filename: attachmentInfo.filename },
      });
    } else {
      // For now, just stub the attachment upload
      await syncQueue.enqueue({
        type: 'upsertAttachment',
        pilePath,
        postId: attachmentInfo.postId,
        filePath: relativePath,
        data: {
          hash: attachmentInfo.hash,
          filename: attachmentInfo.filename,
          path: filePath,
        },
      });
    }

    // Schedule an automatic push for this pile
    this.schedulePush(pilePath);
  }

  /**
   * Extract post ID from file path
   */
  private extractPostIdFromPath(filePath: string): string {
    const filename = path.basename(filePath);
    return filename.replace(/\.md$/i, '');
  }

  /**
   * Parse attachment file path to extract post ID, hash, and filename
   */
  private parseAttachmentPath(filePath: string): { postId: string; hash: string; filename: string } | null {
    // Expected format: attachments/<post-id>/<hash>-<filename>
    const parts = filePath.split('/');
    if (parts.length < 3) return null;

    const postId = parts[parts.length - 2];
    const fileWithHash = parts[parts.length - 1];
    
    const dashIndex = fileWithHash.indexOf('-');
    if (dashIndex === -1) return null;

    const hash = fileWithHash.substring(0, dashIndex);
    const filename = fileWithHash.substring(dashIndex + 1);

    return { postId, hash, filename };
  }

  /**
   * Compute SHA-256 etag for content
   */
  private computeEtag(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Get list of watched pile paths
   */
  getWatchedPiles(): string[] {
    return Array.from(this.watchedPiles.keys());
  }

  /**
   * Debounced push trigger for a pile. Ensures user doesn’t have to manually push.
   */
  private schedulePush(pilePath: string): void {
    const existing = this.pushTimers.get(pilePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        const { pushPile } = await import('./push');
        console.log(`[WATCH] Auto-push scheduled for ${pilePath}`);
        await pushPile(pilePath);
      } catch (err) {
        console.error(`[WATCH] Auto-push failed for ${pilePath}:`, err);
      }
    }, 500);

    this.pushTimers.set(pilePath, timer);
  }

  /**
   * Stop watching all piles
   */
  async stopAll(): Promise<void> {
    const promises = Array.from(this.watchedPiles.keys()).map(pilePath => 
      this.stopWatching(pilePath)
    );
    await Promise.all(promises);
  }

  /**
   * Enqueue existing markdown posts under a pile (excluding .pile and attachments)
   */
  private async enqueueExistingPosts(pilePath: string): Promise<void> {
    if (this.initialScanInProgress.has(pilePath)) return;
    this.initialScanInProgress.add(pilePath);
    try {
      const files = await this.recursiveListMarkdown(pilePath);
      if (files.length === 0) return;
      console.log(`[WATCH] Found ${files.length} existing markdown files`);
      for (const absPath of files) {
        try {
          const relativePath = path.relative(pilePath, absPath).replace(/\\/g, '/');
          const content = await fs.readFile(absPath, 'utf8');
          const etag = this.computeEtag(content);
          const postId = this.extractPostIdFromPath(absPath);
          await syncQueue.enqueue({
            type: 'upsertPost',
            pilePath,
            postId,
            filePath: relativePath,
            data: { content },
            etag,
          });
        } catch (e) {
          console.warn(`[WATCH] Failed to enqueue ${absPath}:`, e);
        }
      }
    } finally {
      this.initialScanInProgress.delete(pilePath);
    }
  }

  /**
   * Recursively list markdown files, excluding .pile and attachments folders
   */
  private async recursiveListMarkdown(dir: string): Promise<string[]> {
    const out: string[] = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === '.pile' || entry.name === 'attachments' || entry.name === 'node_modules' || entry.name === '.git') {
            continue;
          }
          const sub = await this.recursiveListMarkdown(full);
          out.push(...sub);
        } else if (entry.isFile()) {
          if (full.endsWith('.md')) {
            out.push(full);
          }
        }
      }
    } catch (e) {
      console.error(`[WATCH] Failed to list ${dir}:`, e);
    }
    return out;
  }
}

// Export singleton instance
export const fileWatcher = new FileWatcher();
