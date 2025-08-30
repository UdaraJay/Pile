import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { syncStateManager, PileSyncState } from '../sync/state';
import { syncQueue } from '../sync/queue';
import { fileWatcher } from '../sync/fileWatcher';
import { pullPile } from '../sync/pull';
import { pushPile } from '../sync/push';
import { listConflicts, resolveConflict } from '../sync/conflict';

export interface SyncStatus {
  piles: Array<{
    pilePath: string;
    linked: boolean;
    queueLen: number;
    lastPullAt?: string;
    lastPushAt?: string;
    conflictsCount: number;
    lastError?: string;
    remotePileId?: string;
  }>;
}

export interface LinkPileResult {
  linked: boolean;
  remotePileId?: string;
  error?: string;
}

export interface UnlinkPileResult {
  linked: boolean;
  error?: string;
}

export interface RunSyncResult {
  started: boolean;
  error?: string;
}

export interface ConflictListResult {
  conflicts: Array<{
    id: string;
    postId: string;
    localPath: string;
    remotePath: string;
    updatedAtLocal: string;
    updatedAtRemote: string;
  }>;
}

export interface ConflictResolveResult {
  ok: boolean;
  error?: string;
}

export interface MigrateCloudPileResult {
  localPileId: string;
  count: number;
  error?: string;
}

export interface AttachmentUploadResult {
  success: boolean;
  error?: string;
  remotePath?: string;
  signedUrl?: string;
}

export interface AttachmentListResult {
  attachments: Array<{
    id: string;
    postId: string;
    hash: string;
    filename: string;
    localPath: string;
    remotePath: string;
    size: number;
    mimeType: string;
    createdAt: string;
  }>;
}

export interface SignedUrlResult {
  signedUrl?: string;
  error?: string;
}

/**
 * Link a local pile to a remote Supabase pile for syncing
 */
async function handleLinkPile(
  event: IpcMainInvokeEvent,
  pilePath: string,
  remotePileId?: string
): Promise<LinkPileResult> {
  try {
    console.log(`Linking pile: ${pilePath} to remote: ${remotePileId || '(auto-create)'}`);

    let actualRemotePileId = remotePileId;

    // Create or reuse a remote pile if not provided
    if (!actualRemotePileId) {
      const path = await import('path');
      const { supabase } = await import('../lib/supabase');
      // Ensure authenticated
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        return { linked: false, error: 'Not authenticated with Supabase' };
      }
      const name = path.basename(pilePath);

      // Try to reuse an existing pile with the same name for this user
      try {
        const { data: existing, error: findErr } = await supabase
          .from('piles')
          .select('id')
          .eq('user_id', session.session.user.id)
          .eq('name', name)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!findErr && existing?.id) {
          actualRemotePileId = existing.id;
          console.log(`[SYNC] Reusing existing remote pile ${actualRemotePileId} for ${name}`);
        }
      } catch (e) {
        console.warn('[SYNC] Failed to check for existing pile, will attempt create:', (e as Error)?.message);
      }

      // Create if none found
      if (!actualRemotePileId) {
        const { data, error } = await supabase
          .from('piles')
          .insert({
            user_id: session.session.user.id,
            name,
            description: '',
            is_private: true,
            settings: { theme: 'light', sync_enabled: true },
          })
          .select('id')
          .single();
        if (error) {
          console.error('[SYNC] Failed to create remote pile:', error);
          return { linked: false, error: error.message };
        }
        actualRemotePileId = data.id;
        console.log(`[SYNC] Created remote pile ${actualRemotePileId} for ${name}`);
      }
    }

    // Link the pile locally
    await syncStateManager.linkPile(pilePath, actualRemotePileId!);

    // Start watching for file changes
    await fileWatcher.startWatching(pilePath);

    return {
      linked: true,
      remotePileId: actualRemotePileId!,
    };
  } catch (error) {
    console.error('Failed to link pile:', error);
    return {
      linked: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Unlink a pile from remote syncing
 */
async function handleUnlinkPile(
  event: IpcMainInvokeEvent,
  pilePath: string
): Promise<UnlinkPileResult> {
  try {
    console.log(`Unlinking pile: ${pilePath}`);
    
    // Stop watching file changes
    await fileWatcher.stopWatching(pilePath);
    
    // Clear any pending queue operations for this pile
    await syncQueue.clearForPile(pilePath);
    
    // Unlink the pile
    await syncStateManager.unlinkPile(pilePath);
    
    return {
      linked: false,
    };
  } catch (error) {
    console.error('Failed to unlink pile:', error);
    return {
      linked: true, // Still linked due to error
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run sync operation (pull, push, or both)
 */
async function handleRunSync(
  event: IpcMainInvokeEvent,
  pilePath: string,
  mode: 'pull' | 'push' | 'both' = 'both'
): Promise<RunSyncResult> {
  try {
    console.log(`Running sync for pile: ${pilePath}, mode: ${mode}`);
    
    const state = await syncStateManager.loadState(pilePath);
    if (!state.linked) {
      return {
        started: false,
        error: 'Pile is not linked to a remote pile',
      };
    }

    // Run sync operations asynchronously
    if (mode === 'pull' || mode === 'both') {
      pullPile(pilePath).catch(error => 
        console.error(`Pull failed for ${pilePath}:`, error)
      );
    }
    
    if (mode === 'push' || mode === 'both') {
      pushPile(pilePath).catch(error => 
        console.error(`Push failed for ${pilePath}:`, error)
      );
    }
    
    return {
      started: true,
    };
  } catch (error) {
    console.error('Failed to run sync:', error);
    return {
      started: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get sync status for one or all piles
 */
async function handleGetStatus(
  event: IpcMainInvokeEvent,
  pilePath?: string
): Promise<SyncStatus> {
  try {
    console.log(`Getting sync status for: ${pilePath || 'all piles'}`);
    
    if (pilePath) {
      // Get status for specific pile
      const state = await syncStateManager.loadState(pilePath);
      const queueLen = await syncQueue.getQueueLengthForPile(pilePath);
      
      // Get actual conflict count
      const { getConflictCount } = await import('../sync/conflict');
      const conflictsCount = await getConflictCount(pilePath);
      
      return {
        piles: [{
          pilePath: state.pilePath,
          linked: state.linked,
          queueLen,
          lastPullAt: state.checkpoint.lastPulledAt,
          lastPushAt: state.checkpoint.lastPushedAt,
          conflictsCount,
          lastError: state.lastError,
          remotePileId: state.remotePileId,
        }],
      };
    } else {
      // Get status for all watched piles
      const watchedPiles = fileWatcher.getWatchedPiles();
      const { getConflictCount } = await import('../sync/conflict');
      
      const pileStatuses = await Promise.all(
        watchedPiles.map(async (pilePath) => {
          const state = await syncStateManager.loadState(pilePath);
          const queueLen = await syncQueue.getQueueLengthForPile(pilePath);
          const conflictsCount = await getConflictCount(pilePath);
          
          return {
            pilePath: state.pilePath,
            linked: state.linked,
            queueLen,
            lastPullAt: state.checkpoint.lastPulledAt,
            lastPushAt: state.checkpoint.lastPushedAt,
            conflictsCount,
            lastError: state.lastError,
            remotePileId: state.remotePileId,
          };
        })
      );
      
      return {
        piles: pileStatuses,
      };
    }
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return {
      piles: [],
    };
  }
}

/**
 * List conflicts for a pile
 */
async function handleListConflicts(
  event: IpcMainInvokeEvent,
  pilePath: string
): Promise<ConflictListResult> {
  try {
    console.log(`Listing conflicts for pile: ${pilePath}`);
    
    const { listConflicts } = await import('../sync/conflict');
    const conflicts = await listConflicts(pilePath);
    
    return {
      conflicts: conflicts.map(conflict => ({
        id: conflict.id,
        postId: conflict.postId,
        localPath: conflict.localPath,
        remotePath: conflict.remotePath,
        updatedAtLocal: conflict.localUpdatedAt,
        updatedAtRemote: conflict.remoteUpdatedAt,
      })),
    };
  } catch (error) {
    console.error('Failed to list conflicts:', error);
    return {
      conflicts: [],
    };
  }
}

/**
 * Resolve a specific conflict
 */
async function handleResolveConflict(
  event: IpcMainInvokeEvent,
  pilePath: string,
  postId: string,
  choice: 'local' | 'remote' | 'merged',
  mergedContent?: string
): Promise<ConflictResolveResult> {
  try {
    console.log(`Resolving conflict for post: ${postId}, choice: ${choice}`);
    
    const { resolveConflict } = await import('../sync/conflict');
    const success = await resolveConflict(pilePath, postId, {
      postId,
      choice,
      mergedContent,
      resolvedAt: new Date().toISOString(),
    });
    
    return {
      ok: success,
    };
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Migrate a cloud pile to local storage
 */
async function handleMigrateCloudPile(
  event: IpcMainInvokeEvent,
  remotePileId: string,
  destFolder: string
): Promise<MigrateCloudPileResult> {
  try {
    console.log(`[MIGRATE] Starting migration of cloud pile: ${remotePileId} to: ${destFolder}`);
    
    // Check authentication
    const { supabase } = await import('../lib/supabase');
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      return {
        localPileId: destFolder,
        count: 0,
        error: 'Not authenticated with Supabase',
      };
    }

    // Import required modules
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const matter = await import('gray-matter');

    // 1. Create local folder structure
    console.log(`[MIGRATE] Creating local folder structure: ${destFolder}`);
    await fs.mkdir(destFolder, { recursive: true });
    await fs.mkdir(path.join(destFolder, 'posts'), { recursive: true });
    await fs.mkdir(path.join(destFolder, 'attachments'), { recursive: true });
    await fs.mkdir(path.join(destFolder, '.pile'), { recursive: true });

    // 2. Download all remote posts as .md files
    console.log(`[MIGRATE] Downloading posts from pile: ${remotePileId}`);
    
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('pile_id', remotePileId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`);
    }

    if (!posts || posts.length === 0) {
      console.log(`[MIGRATE] No posts found for pile: ${remotePileId}`);
    }

    let migratedCount = 0;
    let lastPostTime = '';
    let lastPostId = '';

    // Process each post
    for (const post of posts || []) {
      try {
        console.log(`[MIGRATE] Processing post: ${post.id}`);
        
        // Convert content to markdown if needed
        let markdownContent = post.content_md || post.content || '';
        if (!post.content_md && post.content) {
          // Use content as-is since we don't have HTML-to-MD conversion
          markdownContent = post.content;
          console.log(`[MIGRATE] Post ${post.id} has HTML content, using as-is`);
        }

        // Create frontmatter
        const frontmatter = {
          id: post.id,
          pile_id: post.pile_id,
          title: post.title || '',
          created_at: post.created_at,
          updated_at: post.updated_at,
          etag: post.etag || '',
        };

        // Format the markdown file with frontmatter
        const frontmatterYaml = Object.entries(frontmatter)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n');
        
        const fileContent = `---\n${frontmatterYaml}\n---\n\n${markdownContent}`;

        // Write the post file
        const postFilePath = path.join(destFolder, 'posts', `${post.id}.md`);
        await fs.writeFile(postFilePath, fileContent, 'utf8');

        migratedCount++;
        lastPostTime = post.updated_at;
        lastPostId = post.id;
        
      } catch (error) {
        console.error(`[MIGRATE] Failed to process post ${post.id}:`, error);
        // Continue with other posts
      }
    }

    // 3. Download all attachments
    console.log(`[MIGRATE] Downloading attachments for pile: ${remotePileId}`);
    
    const { data: attachments, error: attachmentsError } = await supabase
      .from('attachments')
      .select('*')
      .eq('pile_id', remotePileId)
      .is('deleted_at', null);

    if (attachmentsError) {
      console.error(`[MIGRATE] Failed to fetch attachments:`, attachmentsError);
    } else if (attachments && attachments.length > 0) {
      console.log(`[MIGRATE] Found ${attachments.length} attachments to download`);
      
      // Import attachment functions
      const { downloadAttachment, generateLocalPath } = await import('../sync/attachments');
      
      for (const attachment of attachments) {
        try {
          console.log(`[MIGRATE] Downloading attachment: ${attachment.filename}`);
          
          const result = await downloadAttachment(
            destFolder,
            attachment.post_id,
            attachment.storage_path
          );
          
          if (!result.success) {
            console.error(`[MIGRATE] Failed to download attachment ${attachment.filename}: ${result.error}`);
          }
        } catch (error) {
          console.error(`[MIGRATE] Error downloading attachment ${attachment.filename}:`, error);
        }
      }
    }

    // 4. Initialize sync checkpoints
    console.log(`[MIGRATE] Initializing sync checkpoints`);
    
    const { syncStateManager } = await import('../sync/state');
    
    // Link the pile and set initial checkpoints
    await syncStateManager.linkPile(destFolder, remotePileId);
    
    if (migratedCount > 0 && lastPostTime && lastPostId) {
      await syncStateManager.updateCheckpoint(destFolder, {
        lastPulledAt: lastPostTime,
        lastPulledId: lastPostId,
        lastPushedAt: lastPostTime,
      });
    }

    // Initialize the local index
    console.log(`[MIGRATE] Initializing local search index`);
    try {
      const pileIndex = require('../utils/pileIndex');
      await pileIndex.load(destFolder);
      console.log(`[MIGRATE] Search index initialized for migrated pile`);
    } catch (error) {
      console.error(`[MIGRATE] Failed to initialize search index:`, error);
      // Don't fail migration for index issues
    }

    console.log(`[MIGRATE] Migration completed: ${migratedCount} posts migrated`);

    return {
      localPileId: destFolder,
      count: migratedCount,
    };

  } catch (error) {
    console.error(`[MIGRATE] Migration failed:`, error);
    return {
      localPileId: destFolder,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload an attachment for a post
 */
async function handleUploadAttachment(
  event: IpcMainInvokeEvent,
  pilePath: string,
  postId: string,
  filePath: string
): Promise<AttachmentUploadResult> {
  try {
    console.log(`Uploading attachment: ${filePath} for post ${postId}`);
    
    const { uploadAttachment } = await import('../sync/attachments');
    const result = await uploadAttachment(pilePath, postId, filePath);
    
    return result;
  } catch (error) {
    console.error('Failed to upload attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List attachments for a post
 */
async function handleListAttachments(
  event: IpcMainInvokeEvent,
  pilePath: string,
  postId: string
): Promise<AttachmentListResult> {
  try {
    console.log(`Listing attachments for post: ${postId}`);
    
    const { listPostAttachments } = await import('../sync/attachments');
    const attachments = await listPostAttachments(pilePath, postId);
    
    return {
      attachments: attachments.map(att => ({
        id: att.id,
        postId: att.postId,
        hash: att.hash,
        filename: att.filename,
        localPath: att.localPath,
        remotePath: att.remotePath,
        size: att.size,
        mimeType: att.mimeType,
        createdAt: att.createdAt,
      })),
    };
  } catch (error) {
    console.error('Failed to list attachments:', error);
    return {
      attachments: [],
    };
  }
}

/**
 * Get signed URL for attachment preview
 */
async function handleGetAttachmentSignedUrl(
  event: IpcMainInvokeEvent,
  postId: string,
  hash: string,
  filename?: string,
  expiresIn?: number
): Promise<SignedUrlResult> {
  try {
    console.log(`Getting signed URL for: ${postId}/${hash}`);
    
    const { getAttachmentSignedUrl } = await import('../sync/attachments');
    const signedUrl = await getAttachmentSignedUrl(postId, hash, filename, expiresIn);
    
    if (signedUrl) {
      return { signedUrl };
    } else {
      return { error: 'Failed to generate signed URL' };
    }
  } catch (error) {
    console.error('Failed to get signed URL:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download attachment by hash and filename
 */
async function handleDownloadAttachment(
  event: IpcMainInvokeEvent,
  pilePath: string,
  postId: string,
  hash: string,
  filename: string
): Promise<{ success: boolean; localPath?: string; error?: string }> {
  try {
    console.log(`Downloading attachment: ${hash}/${filename}`);
    
    const { downloadAttachmentByHash } = await import('../sync/attachments');
    const result = await downloadAttachmentByHash(pilePath, postId, hash, filename);
    
    return result;
  } catch (error) {
    console.error('Failed to download attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get detailed conflict information
 */
async function handleGetConflict(
  event: IpcMainInvokeEvent,
  pilePath: string,
  conflictId: string
): Promise<{ conflict?: any; error?: string }> {
  try {
    console.log(`Getting conflict details: ${conflictId}`);
    
    const { getConflictById } = await import('../sync/conflict');
    const conflict = await getConflictById(pilePath, conflictId);
    
    if (conflict) {
      return { conflict };
    } else {
      return { error: 'Conflict not found' };
    }
  } catch (error) {
    console.error('Failed to get conflict:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get conflict artifact content
 */
async function handleGetConflictArtifact(
  event: IpcMainInvokeEvent,
  pilePath: string,
  conflictId: string,
  version: 'local' | 'remote'
): Promise<{ content?: string; error?: string }> {
  try {
    console.log(`Getting conflict artifact: ${conflictId}/${version}`);
    
    const { getConflictArtifact } = await import('../sync/conflict');
    const content = await getConflictArtifact(pilePath, conflictId, version);
    
    if (content !== null) {
      return { content };
    } else {
      return { error: 'Artifact not found' };
    }
  } catch (error) {
    console.error('Failed to get conflict artifact:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Register all sync-related IPC handlers
ipcMain.handle('sync:link-pile', handleLinkPile);
ipcMain.handle('sync:unlink-pile', handleUnlinkPile);
ipcMain.handle('sync:run', handleRunSync);
ipcMain.handle('sync:status', handleGetStatus);
ipcMain.handle('sync:list-conflicts', handleListConflicts);
ipcMain.handle('sync:resolve', handleResolveConflict);
ipcMain.handle('sync:migrate-cloud-pile', handleMigrateCloudPile);

// Register attachment-related IPC handlers
ipcMain.handle('sync:upload-attachment', handleUploadAttachment);
ipcMain.handle('sync:list-attachments', handleListAttachments);
ipcMain.handle('sync:get-attachment-url', handleGetAttachmentSignedUrl);
ipcMain.handle('sync:download-attachment', handleDownloadAttachment);

// Register conflict-related IPC handlers  
ipcMain.handle('sync:get-conflict', handleGetConflict);
ipcMain.handle('sync:get-conflict-artifact', handleGetConflictArtifact);

/**
 * Force rescan: restart watcher with initial scan to enqueue existing files
 */
ipcMain.handle('sync:rescan', async (_evt, pilePath: string) => {
  try {
    console.log(`[SYNC] Force rescan for pile: ${pilePath}`);
    await fileWatcher.stopWatching(pilePath);
    await fileWatcher.startWatching(pilePath);
    return { ok: true };
  } catch (error) {
    console.error('[SYNC] Rescan failed:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Clear queued sync operations for a pile
 */
ipcMain.handle('sync:clear-queue', async (_evt, pilePath: string) => {
  try {
    await syncQueue.clearForPile(pilePath);
    return { ok: true };
  } catch (error) {
    console.error('[SYNC] Clear queue failed:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Trigger immediate sync for a pile (for high-priority operations like AI responses)
 */
ipcMain.handle('sync:immediate-sync', async (_evt, pilePath: string) => {
  try {
    console.log(`[SYNC] Triggering immediate sync for pile: ${pilePath}`);
    fileWatcher.triggerImmediateSync(pilePath);
    return { ok: true };
  } catch (error) {
    console.error('[SYNC] Immediate sync trigger failed:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Migrate timestamp-based filenames to UUID-based filenames
 */
ipcMain.handle('sync:migrate-to-uuid', async (_evt, pilePath: string) => {
  try {
    console.log(`[SYNC] Starting UUID migration for pile: ${pilePath}`);
    
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const matter = await import('gray-matter');
    const crypto = await import('crypto');
    
    // Helper function to check if a string is a UUID
    const isUuid = (val: string): boolean =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
    
    // Recursively find all markdown files
    const findMarkdownFiles = async (dir: string): Promise<string[]> => {
      const files: string[] = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', '.pile', 'attachments'].includes(entry.name)) {
            files.push(...await findMarkdownFiles(fullPath));
          }
        } else if (entry.isFile() && fullPath.endsWith('.md')) {
          files.push(fullPath);
        }
      }
      return files;
    };
    
    const files = await findMarkdownFiles(pilePath);
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const filePath of files) {
      try {
        const filename = path.basename(filePath, '.md');
        
        // Skip if already UUID-based
        if (isUuid(filename)) {
          skippedCount++;
          continue;
        }
        
        // Read and parse the file
        const content = await fs.readFile(filePath, 'utf8');
        const { data: frontmatter, content: markdownContent } = matter(content);
        
        // Check if frontmatter already has a UUID
        if (frontmatter.id && isUuid(frontmatter.id)) {
          // File has UUID in frontmatter but wrong filename, just rename
          const newFilename = `${frontmatter.id}.md`;
          const newFilePath = path.join(path.dirname(filePath), newFilename);
          
          if (await fs.access(newFilePath).then(() => false).catch(() => true)) {
            await fs.rename(filePath, newFilePath);
            console.log(`[MIGRATE] Renamed ${filename}.md to ${newFilename}`);
            migratedCount++;
          } else {
            console.warn(`[MIGRATE] Target file ${newFilename} already exists, skipping ${filename}.md`);
          }
        } else {
          // Generate new UUID and update both frontmatter and filename
          const newId = crypto.randomUUID();
          const updatedFrontmatter = { ...frontmatter, id: newId };
          const updatedContent = matter.stringify(markdownContent, updatedFrontmatter);
          
          const newFilename = `${newId}.md`;
          const newFilePath = path.join(path.dirname(filePath), newFilename);
          
          if (await fs.access(newFilePath).then(() => false).catch(() => true)) {
            await fs.writeFile(newFilePath, updatedContent, 'utf8');
            await fs.unlink(filePath);
            console.log(`[MIGRATE] Migrated ${filename}.md to ${newFilename} with UUID ${newId}`);
            migratedCount++;
          } else {
            console.warn(`[MIGRATE] Target file ${newFilename} already exists, skipping ${filename}.md`);
          }
        }
      } catch (error) {
        console.error(`[MIGRATE] Failed to migrate ${filePath}:`, error);
      }
    }
    
    console.log(`[SYNC] UUID migration completed: ${migratedCount} files migrated, ${skippedCount} files already had UUIDs`);
    
    return { 
      ok: true, 
      migrated: migratedCount, 
      skipped: skippedCount,
      total: files.length 
    };
  } catch (error) {
    console.error('[SYNC] UUID migration failed:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

console.log('Sync IPC handlers registered');
