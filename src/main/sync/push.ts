import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { supabase } from '../lib/supabase';
import crypto from 'crypto';
import { syncQueue, SyncOperation } from './queue';
import { syncStateManager } from './state';

export interface PushResult {
  success: boolean;
  error?: string;
  pushedCount?: number;
  failedCount?: number;
}

interface PostData {
  id: string;
  pile_id: string;
  title?: string;
  content?: string;
  content_md?: string;
  etag?: string;
  created_at?: string;
  updated_at?: string;
}

// Cache of posts table column support to avoid repeated probing
let postsColumnProbe: { probed: boolean; hasContentMd: boolean; hasUserId: boolean; hasEtag: boolean; hasName: boolean; hasMeta: boolean } = {
  probed: false,
  hasContentMd: false,
  hasUserId: false,
  hasEtag: false,
  hasName: false,
  hasMeta: false,
};

async function probePostsColumns(): Promise<typeof postsColumnProbe> {
  if (postsColumnProbe.probed) return postsColumnProbe;
  // Check columns one by one using lightweight selects
  let hasContentMd = false;
  let hasUserId = false;
  let hasEtag = false;
  let hasName = false;
  let hasMeta = false;
  try {
    const { error } = await supabase.from('posts').select('content_md').limit(0);
    hasContentMd = !error;
  } catch {
    hasContentMd = false;
  }
  try {
    const { error } = await supabase.from('posts').select('user_id').limit(0);
    hasUserId = !error;
  } catch {
    hasUserId = false;
  }
  try {
    const { error } = await supabase.from('posts').select('etag').limit(0);
    hasEtag = !error;
  } catch {
    hasEtag = false;
  }
  try {
    const { error } = await supabase.from('posts').select('name').limit(0);
    hasName = !error;
  } catch {
    hasName = false;
  }
  try {
    const { error } = await supabase.from('posts').select('meta').limit(0);
    hasMeta = !error;
  } catch {
    hasMeta = false;
  }
  postsColumnProbe = { probed: true, hasContentMd, hasUserId, hasEtag, hasName, hasMeta };
  return postsColumnProbe;
}

/**
 * Process queued operations and push them to Supabase
 */
export async function pushPile(pilePath: string): Promise<PushResult> {
  console.log(`[PUSH] Starting push for pile: ${pilePath}`);
  
  try {
    const state = await syncStateManager.loadState(pilePath);
    
    if (!state.linked || !state.remotePileId) {
      return {
        success: false,
        error: 'Pile is not linked to a remote pile',
      };
    }

    // Check authentication
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      return {
        success: false,
        error: 'Not authenticated with Supabase',
      };
    }

    console.log(`[PUSH] Pushing to remote pile ID: ${state.remotePileId}`);

    // Ensure the remote pile exists (some older links may have stale IDs)
    try {
      const { data: pileRow, error: pileFetchErr } = await supabase
        .from('piles')
        .select('id')
        .eq('id', state.remotePileId)
        .single();
      if (pileFetchErr || !pileRow) {
        console.warn('[PUSH] Remote pile not found; attempting to (re)create');
        const pileName = path.basename(pilePath);
        const userId = session.session.user.id;
        const { data: created, error: pileCreateErr } = await supabase
          .from('piles')
          .insert({
            id: state.remotePileId, // preserve existing ID if policy allows
            user_id: userId,
            name: pileName,
            description: '',
            is_private: true,
            settings: { theme: 'light', sync_enabled: true },
          })
          .select('id')
          .single();
        if (pileCreateErr) {
          console.error('[PUSH] Failed to (re)create remote pile:', pileCreateErr);
        } else {
          console.log('[PUSH] Recreated remote pile:', created?.id);
        }
      }
    } catch (e) {
      console.warn('[PUSH] Remote pile existence check failed:', (e as Error)?.message);
    }

    // Take operations from queue for this pile
    let operations = await syncQueue.take(100);
    let pileOperations = operations.filter(op => op.pilePath === pilePath);
    
    if (pileOperations.length === 0) {
      console.log('[PUSH] No operations found; performing initial scan to enqueue existing posts');
      await enqueueExistingPostsForPush(pilePath);
      // Take again after enqueue
      operations = await syncQueue.take(100);
      pileOperations = operations.filter(op => op.pilePath === pilePath);
      if (pileOperations.length === 0) {
        console.log('[PUSH] Still no operations after initial scan');
        return {
          success: true,
          pushedCount: 0,
          failedCount: 0,
        };
      }
      console.log(`[PUSH] Initial scan enqueued ${pileOperations.length} operations`);
    }

    console.log(`[PUSH] Processing ${pileOperations.length} operations`);

    let pushedCount = 0;
    let failedCount = 0;

    // Process operations with limited concurrency
    const concurrency = 4;
    const batches = [];
    
    for (let i = 0; i < pileOperations.length; i += concurrency) {
      batches.push(pileOperations.slice(i, i + concurrency));
    }

    for (const batch of batches) {
      const promises = batch.map(async (operation) => {
        try {
          await processOperation(operation, state.remotePileId!);
          await syncQueue.ack(operation.id);
          pushedCount++;
          console.log(`[PUSH] Successfully processed operation ${operation.id} (${operation.type})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[PUSH] Failed to process operation ${operation.id}:`, errorMessage);
          await syncQueue.nack(operation.id, errorMessage);
          // Surface last error for UI status
          try {
            await syncStateManager.saveState(pilePath, { lastError: errorMessage } as any);
          } catch {}
          failedCount++;
        }
      });

      await Promise.all(promises);
    }

    // Update checkpoint with successful push time
    if (pushedCount > 0) {
      await syncStateManager.updateCheckpoint(pilePath, {
        lastPushedAt: new Date().toISOString(),
      });
    }

    console.log(`[PUSH] Completed push: ${pushedCount} succeeded, ${failedCount} failed`);

    return {
      success: true,
      pushedCount,
      failedCount,
    };

  } catch (error) {
    console.error(`[PUSH] Push failed for ${pilePath}:`, error);
    // Record last error for status UI (best-effort)
    try {
      await syncStateManager.saveState(pilePath, {
        lastError: (error as Error)?.message || 'Unknown error',
      } as any);
    } catch {}
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a single sync operation
 */
async function processOperation(operation: SyncOperation, remotePileId: string): Promise<void> {
  switch (operation.type) {
    case 'upsertPost':
      await processUpsertPost(operation, remotePileId);
      break;
    case 'tombstonePost':
      await processTombstonePost(operation, remotePileId);
      break;
    case 'upsertAttachment':
      await processUpsertAttachment(operation, remotePileId);
      break;
    case 'deleteAttachment':
      await processDeleteAttachment(operation, remotePileId);
      break;
    default:
      throw new Error(`Unknown operation type: ${(operation as any).type}`);
  }
}

/**
 * Process post upsert operation
 */
export async function buildPostUpsertPayload(frontmatter: any, content: string, remotePileId: string, fallbackId: string, etag?: string): Promise<Record<string, any>> {
  // Base payload
  const base: any = {
    id: (frontmatter as any)?.id || fallbackId,
    pile_id: remotePileId,
    title: frontmatter?.title || '',
    created_at: frontmatter?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const probe = await probePostsColumns();
  if (probe.hasContentMd) {
    base.content_md = content;
    base.content = '';
  } else {
    base.content = content;
  }
  if (probe.hasEtag && etag) {
    base.etag = etag;
  }
  if (probe.hasName) {
    // Map to 'name' when the table defines it as NOT NULL; prefer title or fallback id
    base.name = frontmatter?.title || fallbackId;
  }
  if (probe.hasUserId) {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (userId) base.user_id = userId;
    } catch {}
  }
  // Include summary metadata when supported by schema
  if (probe.hasMeta) {
    try {
      const meta: any = {};
      if (typeof frontmatter?.isSummarized === 'boolean') meta.isSummarized = frontmatter.isSummarized;
      if (typeof frontmatter?.summaryStale === 'boolean') meta.summaryStale = frontmatter.summaryStale;
      if (frontmatter?.summary && typeof frontmatter.summary === 'object') meta.summary = frontmatter.summary;
      if (Object.keys(meta).length > 0) {
        base.meta = meta;
      }
    } catch {}
  }
  return base;
}

async function processUpsertPost(operation: SyncOperation, remotePileId: string): Promise<void> {
  if (!operation.filePath || !operation.postId) {
    throw new Error('Missing filePath or postId for upsert operation');
  }

  // Read the current file content
  const fullPath = path.join(operation.pilePath, operation.filePath);
  let fileContent: string;
  
  try {
    fileContent = await fs.readFile(fullPath, 'utf8');
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // File was deleted since operation was queued - convert to tombstone
      await processTombstonePost(operation, remotePileId);
      return;
    }
    throw error;
  }

  // Parse frontmatter and content
  let { data: frontmatter, content } = matter(fileContent);

  const isUuid = (val: string | undefined): boolean =>
    !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

  // Generate a UUID if the current ID is not a valid UUID
  const ensureValidId = (frontmatter: any, fallbackId: string): { id: string; needsUpdate: boolean } => {
    const currentId = frontmatter?.id || fallbackId;
    if (isUuid(currentId)) {
      return { id: currentId, needsUpdate: false };
    }
    // Generate a new UUID and mark that we need to update the file
    const newId = crypto.randomUUID();
    return { id: newId, needsUpdate: true };
  };

  // Ensure we have a valid UUID for the post ID
  const { id: validId, needsUpdate } = ensureValidId(frontmatter, operation.postId!);
  
  // Update frontmatter and file if we generated a new UUID
  if (needsUpdate) {
    console.log(`[PUSH] Generated new UUID ${validId} for post (was: ${frontmatter?.id || operation.postId})`);
    frontmatter = { ...frontmatter, id: validId };
    const updatedContent = matter.stringify(content, frontmatter);
    try {
      await fs.writeFile(fullPath, updatedContent, 'utf8');
    } catch (writeErr) {
      console.error('[PUSH] Failed to update file with new UUID:', writeErr);
      // Continue with sync attempt using generated UUID
    }
  }

  // Prepare post data for Supabase using adaptive builder
  const postData: any = await buildPostUpsertPayload(frontmatter, content, remotePileId, validId, operation.etag);

  // Upsert to Supabase posts table
  // Check if row exists to enable optimistic update
  const postId = validId;
  let { data: existingRows, error: fetchErr } = await supabase
    .from('posts')
    .select('id, updated_at, etag')
    .eq('id', postId)
    .eq('pile_id', remotePileId)
    .limit(1);

  if (fetchErr) {
    throw new Error(`Failed to query existing post: ${fetchErr.message}`);
  }

  let error: any = null;

  if (existingRows && existingRows.length > 0) {
    const existing = existingRows[0] as any;
    const probe = await probePostsColumns();
    let updateQuery = supabase
      .from('posts')
      .update(postData)
      .eq('id', postId)
      .eq('pile_id', remotePileId);

    // Optimistic guard by etag or updated_at when available
    if (probe.hasEtag && frontmatter?.etag) {
      updateQuery = updateQuery.eq('etag', frontmatter.etag);
    } else if (frontmatter?.updated_at) {
      updateQuery = updateQuery.eq('updated_at', frontmatter.updated_at);
    }

    const { error: updErr, data: updData } = await updateQuery.select('id');
    if (updErr) {
      error = updErr;
    } else if (!updData || updData.length === 0) {
      // Guard failed; Last-Write-Wins: compare timestamps
      try {
        const localTime = frontmatter?.updated_at ? new Date(frontmatter.updated_at) : null;
        const remoteTime = existing?.updated_at ? new Date(existing.updated_at) : null;
        if (remoteTime && localTime && remoteTime > localTime) {
          // Remote newer; skip push
          console.log(`[PUSH] Skipping update for ${postId} (remote newer)`);
        } else {
          // Apply unconditional update
          const { error: forceErr } = await supabase
            .from('posts')
            .update(postData)
            .eq('id', postId)
            .eq('pile_id', remotePileId);
          if (forceErr) error = forceErr;
        }
      } catch (e) {
        error = e;
      }
    }
  } else {
    // Insert new
    const { error: insErr } = await supabase
      .from('posts')
      .insert(postData);
    if (insErr) error = insErr;
  }

  // Enhanced error handling with specific UUID error recovery
  if (error) {
    if (/invalid input syntax for type uuid/i.test(error.message)) {
      // This should now be rare since we pre-validate UUIDs, but handle as fallback
      console.error('[PUSH] UUID validation error occurred despite pre-validation:', error.message);
      console.error('[PUSH] PostId used:', postId);
      throw new Error(`UUID validation failed for post ID "${postId}": ${error.message}`);
    } else if (/violates unique constraint/i.test(error.message)) {
      // Handle duplicate key errors gracefully
      console.warn('[PUSH] Duplicate post detected, attempting update with force:', postId);
      try {
        const { error: forceUpdateError } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', postId)
          .eq('pile_id', remotePileId);
        if (!forceUpdateError) {
          error = null; // Success
        }
      } catch (retryError) {
        console.error('[PUSH] Force update also failed:', retryError);
      }
    }
  }

  if (error) {
    throw new Error(`Failed to upsert post: ${error.message}`);
  }
}

/**
 * Fallback: Enqueue upsert operations for all local markdown posts
 */
async function enqueueExistingPostsForPush(pilePath: string): Promise<void> {
  try {
    const files = await recursiveListMarkdown(pilePath);
    if (files.length === 0) return;
    console.log(`[PUSH] Enqueueing ${files.length} existing posts for push`);
    
    for (const absPath of files) {
      try {
        const relativePath = path.relative(pilePath, absPath).replace(/\\/g, '/');
        const content = await fs.readFile(absPath, 'utf8');
        const etag = computeEtag(content);
        const postId = path.basename(absPath).replace(/\.md$/i, '');
        
        // Log the type of ID we're enqueueing for debugging
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId);
        console.log(`[PUSH] Enqueueing: ${postId} (UUID: ${isUuid}) from ${relativePath}`);
        
        await syncQueue.enqueue({
          type: 'upsertPost',
          pilePath,
          postId,
          filePath: relativePath,
          data: { content },
          etag,
        });
      } catch (e) {
        console.warn('[PUSH] Failed to enqueue existing post:', absPath, (e as Error)?.message);
        // Continue with other files even if one fails
      }
    }
  } catch (e) {
    console.error('[PUSH] Failed initial scan:', (e as Error)?.message);
  }
}

function computeEtag(content: string): string {
  return crypto.createHash('sha1').update(content).digest('hex');
}

async function recursiveListMarkdown(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true } as any);
    for (const entry of entries as any[]) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.pile' || entry.name === 'attachments' || entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        const sub = await recursiveListMarkdown(full);
        out.push(...sub);
      } else if (entry.isFile && entry.isFile()) {
        if (full.endsWith('.md')) out.push(full);
      } else {
        // Fallback for Dirent-like objects without methods
        try {
          const stat = await fs.stat(full);
          if (stat.isDirectory()) {
            const sub = await recursiveListMarkdown(full);
            out.push(...sub);
          } else if (stat.isFile() && full.endsWith('.md')) {
            out.push(full);
          }
        } catch {}
      }
    }
  } catch (e) {
    // If withFileTypes not supported, fallback to basic listing
    try {
      const names = await fs.readdir(dir);
      for (const name of names) {
        const full = path.join(dir, name);
        try {
          const stat = await fs.stat(full);
          if (stat.isDirectory()) {
            if (name === '.pile' || name === 'attachments' || name === 'node_modules' || name === '.git') continue;
            const sub = await recursiveListMarkdown(full);
            out.push(...sub);
          } else if (stat.isFile() && full.endsWith('.md')) {
            out.push(full);
          }
        } catch {}
      }
    } catch {}
  }
  return out;
}

// Exported helper to allow other modules (e.g., app startup) to prime the queue
export async function primeQueueForPile(pilePath: string): Promise<void> {
  await enqueueExistingPostsForPush(pilePath);
}

/**
 * Process post tombstone operation (soft delete)
 */
async function processTombstonePost(operation: SyncOperation, remotePileId: string): Promise<void> {
  if (!operation.postId) {
    throw new Error('Missing postId for tombstone operation');
  }

  // Soft delete the post by setting deleted_at
  const { error } = await supabase
    .from('posts')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', operation.postId)
    .eq('pile_id', remotePileId);

  if (error) {
    throw new Error(`Failed to tombstone post: ${error.message}`);
  }
}

/**
 * Process attachment upsert operation
 */
async function processUpsertAttachment(operation: SyncOperation, remotePileId: string): Promise<void> {
  console.log(`[PUSH] Processing attachment upsert: ${operation.id}`);
  
  if (!operation.filePath || !operation.postId) {
    throw new Error('Missing filePath or postId for attachment upsert operation');
  }

  // Import attachment functions
  const { uploadAttachment } = await import('./attachments');

  // Get the full local path
  const fullPath = path.join(operation.pilePath, operation.filePath);
  
  // Check if file still exists
  try {
    await fs.access(fullPath);
  } catch (error) {
    console.warn(`[PUSH] Attachment file no longer exists, skipping: ${fullPath}`);
    return;
  }

  // Upload the attachment
  const result = await uploadAttachment(operation.pilePath, operation.postId, fullPath);
  
  if (!result.success) {
    throw new Error(`Failed to upload attachment: ${result.error}`);
  }

  console.log(`[PUSH] Successfully uploaded attachment: ${operation.postId}`);
}

/**
 * Process attachment delete operation
 */
async function processDeleteAttachment(operation: SyncOperation, remotePileId: string): Promise<void> {
  console.log(`[PUSH] Processing attachment delete: ${operation.id}`);
  
  if (!operation.postId || !operation.data?.hash || !operation.data?.filename) {
    throw new Error('Missing postId, hash, or filename for attachment delete operation');
  }

  const { hash, filename } = operation.data;

  // Find attachment in database to get ID
  const { data: attachment, error: queryError } = await supabase
    .from('attachments')
    .select('id')
    .eq('post_id', operation.postId)
    .eq('pile_id', remotePileId)
    .eq('content_hash', hash)
    .eq('filename', filename)
    .is('deleted_at', null)
    .single();

  if (queryError || !attachment) {
    console.warn(`[PUSH] Attachment not found for deletion: ${hash}/${filename}`);
    return; // Already deleted or never existed
  }

  // Import attachment functions
  const { deleteAttachment } = await import('./attachments');

  // Delete the attachment
  const success = await deleteAttachment(operation.pilePath, operation.postId, attachment.id);
  
  if (!success) {
    throw new Error(`Failed to delete attachment: ${attachment.id}`);
  }

  console.log(`[PUSH] Successfully deleted attachment: ${attachment.id}`);
}
