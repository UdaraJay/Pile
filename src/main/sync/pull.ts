import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '../lib/supabase';
import matter from 'gray-matter';
import { syncStateManager } from './state';

export interface PullResult {
  success: boolean;
  error?: string;
  pulledCount?: number;
  conflictsCount?: number;
}

interface SupabasePost {
  id: string;
  pile_id: string;
  title?: string;
  content?: string;
  content_md?: string;
  etag?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  meta?: any;
}

/**
 * Pull remote changes for a pile and write them to local files
 */
export async function pullPile(pilePath: string): Promise<PullResult> {
  console.log(`[PULL] Starting pull for pile: ${pilePath}`);
  
  try {
    // Load current state
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

    console.log(`[PULL] Pulling from remote pile ID: ${state.remotePileId}`);

    // Load checkpoint to determine what to pull
    const checkpoint = state.checkpoint;
    let query = supabase
      .from('posts')
      .select('*')
      .eq('pile_id', state.remotePileId)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true });

    // If we have a checkpoint, only pull posts updated since then
    if (checkpoint.lastPulledAt && checkpoint.lastPulledId) {
      query = query.or(`updated_at.gt.${checkpoint.lastPulledAt},and(updated_at.eq.${checkpoint.lastPulledAt},id.gt.${checkpoint.lastPulledId})`);
    }

    // Limit to reasonable batch size
    const batchSize = 100;
    query = query.limit(batchSize);

    console.log(`[PULL] Querying posts updated since: ${checkpoint.lastPulledAt || 'beginning'}`);

    const { data: posts, error } = await query;

    if (error) {
      console.error('[PULL] Supabase query error:', error);
      return {
        success: false,
        error: `Failed to fetch posts: ${error.message}`,
      };
    }

    if (!posts || posts.length === 0) {
      console.log('[PULL] No new posts to pull');
      return {
        success: true,
        pulledCount: 0,
        conflictsCount: 0,
      };
    }

    console.log(`[PULL] Found ${posts.length} posts to process`);

    // Ensure posts directory exists
    const postsDir = path.join(pilePath, 'posts');
    await fs.mkdir(postsDir, { recursive: true });

    let processedCount = 0;
    let conflictsCount = 0;
    let lastProcessedAt = '';
    let lastProcessedId = '';

    // Process each post
    for (const post of posts as SupabasePost[]) {
      try {
        if (post.deleted_at) {
          // Handle deleted post
          await handleDeletedPost(pilePath, post);
        } else {
          // Handle regular post (create/update)
          const hasConflict = await handleRegularPost(pilePath, post);
          if (hasConflict) {
            conflictsCount++;
          }
        }
        
        processedCount++;
        lastProcessedAt = post.updated_at;
        lastProcessedId = post.id;
        
        console.log(`[PULL] Processed post ${post.id} (${processedCount}/${posts.length})`);
      } catch (error) {
        console.error(`[PULL] Failed to process post ${post.id}:`, error);
        // Continue processing other posts rather than failing entirely
      }
    }

    // Update checkpoint with last processed post
    if (processedCount > 0) {
      await syncStateManager.updateCheckpoint(pilePath, {
        lastPulledAt: lastProcessedAt,
        lastPulledId: lastProcessedId,
      });

      // Trigger index refresh for changed files
      await triggerIndexRefresh(pilePath);
    }

    // Pull attachments for posts that were updated
    await pullAttachments(pilePath, state.remotePileId, posts as SupabasePost[]);

    console.log(`[PULL] Completed pull: processed ${processedCount} posts, ${conflictsCount} conflicts`);

    return {
      success: true,
      pulledCount: processedCount,
      conflictsCount,
    };

  } catch (error) {
    console.error(`[PULL] Pull failed for ${pilePath}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle a deleted post by removing or tombstoning the local file
 */
async function handleDeletedPost(pilePath: string, post: SupabasePost): Promise<void> {
  const postFilePath = path.join(pilePath, 'posts', `${post.id}.md`);
  
  try {
    // Check if file exists locally
    const exists = await fs.access(postFilePath).then(() => true).catch(() => false);
    
    if (exists) {
      // Move to trash directory instead of deleting
      const trashDir = path.join(pilePath, '.pile', 'trash');
      await fs.mkdir(trashDir, { recursive: true });
      
      const trashPath = path.join(trashDir, `${post.id}-${Date.now()}.md`);
      await fs.rename(postFilePath, trashPath);
      
      console.log(`[PULL] Moved deleted post ${post.id} to trash`);
    }
  } catch (error) {
    console.error(`[PULL] Failed to handle deleted post ${post.id}:`, error);
    throw error;
  }
}

/**
 * Handle a regular post by writing/updating the local markdown file
 */
async function handleRegularPost(pilePath: string, post: SupabasePost): Promise<boolean> {
  const postFilePath = path.join(pilePath, 'posts', `${post.id}.md`);
  let hasConflict = false;
  
  try {
    // Check if file exists locally and has changes
    const existsLocally = await fs.access(postFilePath).then(() => true).catch(() => false);
    
    if (existsLocally) {
      console.log(`[PULL] Checking for conflicts in existing post ${post.id}`);
      
      // Read local file and check for conflicts
      const localFileContent = await fs.readFile(postFilePath, 'utf8');
      const { data: localFrontmatter, content: localContent } = matter(localFileContent);
      const localUpdatedAt = localFrontmatter.updated_at || localFrontmatter.createdAt || new Date().toISOString();
      
      // Import conflict detection
      const { detectConflicts } = await import('./conflict');
      
      // Convert remote content to markdown if needed
      let remoteMarkdownContent = post.content_md || post.content || '';
      if (!post.content_md && post.content) {
        remoteMarkdownContent = post.content;
      }
      
      // Detect conflict
      const conflict = await detectConflicts(
        pilePath,
        post.id,
        localContent,
        remoteMarkdownContent,
        localUpdatedAt,
        post.updated_at,
        localFrontmatter.etag,
        post.etag
      );
      
      if (conflict) {
        console.log(`[PULL] Conflict detected for post ${post.id}, using Last Write Wins strategy`);
        hasConflict = true;
        
        // Use LWW: choose the version with the latest timestamp
        const localTime = new Date(localUpdatedAt);
        const remoteTime = new Date(post.updated_at);
        
        if (remoteTime <= localTime) {
          console.log(`[PULL] Local version is newer, keeping local version for post ${post.id}`);
          return hasConflict; // Keep local version, don't update
        }
        
        console.log(`[PULL] Remote version is newer, updating with remote version for post ${post.id}`);
        // Continue with remote version update below
      } else {
        console.log(`[PULL] No conflict, updating existing post ${post.id}`);
      }
    } else {
      console.log(`[PULL] Creating new post ${post.id}`);
    }

    // Convert content to markdown if needed
    let markdownContent = post.content_md || post.content || '';
    
    if (!post.content_md && post.content) {
      // TODO: Add HTML to Markdown conversion here when turndown is available
      // For now, just use the content as-is
      markdownContent = post.content;
      console.log(`[PULL] Warning: Post ${post.id} has HTML content but no markdown version`);
    }

    // Create frontmatter for the post
    const frontmatter: any = {
      id: post.id,
      pile_id: post.pile_id,
      title: post.title || '',
      created_at: post.created_at,
      updated_at: post.updated_at,
      etag: post.etag || '',
    };

    // Merge meta back into frontmatter for local persistence
    if (post.meta && typeof post.meta === 'object') {
      if (typeof post.meta.isSummarized === 'boolean') {
        frontmatter.isSummarized = post.meta.isSummarized;
      }
      if (typeof post.meta.summaryStale === 'boolean') {
        frontmatter.summaryStale = post.meta.summaryStale;
      }
      if (post.meta.summary && typeof post.meta.summary === 'object') {
        frontmatter.summary = post.meta.summary;
      }
    }

    // Format the markdown file with frontmatter
    const frontmatterYaml = Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');
    
    const fileContent = `---\n${frontmatterYaml}\n---\n\n${markdownContent}`;

    // Write the file
    await fs.writeFile(postFilePath, fileContent, 'utf8');

    return hasConflict;

  } catch (error) {
    console.error(`[PULL] Failed to handle regular post ${post.id}:`, error);
    throw error;
  }
}

/**
 * Trigger index refresh for the pile to update search and timeline
 */
async function triggerIndexRefresh(pilePath: string): Promise<void> {
  try {
    console.log(`[PULL] Triggering index refresh for: ${pilePath}`);
    
    // Import the pileIndex utility directly to refresh the index
    // This is more efficient than going through IPC
    const pileIndex = require('../utils/pileIndex');
    
    // Reload the index for this pile to pick up the new/updated files
    await pileIndex.load(pilePath);
    
    console.log(`[PULL] Index refresh completed for: ${pilePath}`);
    
  } catch (error) {
    console.error(`[PULL] Failed to trigger index refresh:`, error);
    // Don't throw here as index refresh failure shouldn't fail the entire pull
  }
}

/**
 * Pull attachments for updated posts
 */
async function pullAttachments(pilePath: string, remotePileId: string, posts: SupabasePost[]): Promise<void> {
  if (posts.length === 0) return;

  console.log(`[PULL] Pulling attachments for ${posts.length} posts`);

  try {
    // Get all post IDs that were updated (non-deleted)
    const postIds = posts
      .filter(post => !post.deleted_at)
      .map(post => post.id);

    if (postIds.length === 0) return;

    // Query all attachments for these posts
    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .in('post_id', postIds)
      .eq('pile_id', remotePileId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`[PULL] Failed to query attachments:`, error);
      return;
    }

    if (!attachments || attachments.length === 0) {
      console.log(`[PULL] No attachments found for posts`);
      return;
    }

    console.log(`[PULL] Found ${attachments.length} attachments to sync`);

    // Import attachment functions
    const { downloadAttachment } = await import('./attachments');

    // Download each attachment with limited concurrency
    const concurrency = 3;
    const batches = [];
    
    for (let i = 0; i < attachments.length; i += concurrency) {
      batches.push(attachments.slice(i, i + concurrency));
    }

    let downloadedCount = 0;
    let skippedCount = 0;

    for (const batch of batches) {
      const promises = batch.map(async (attachment) => {
        try {
          const result = await downloadAttachment(
            pilePath,
            attachment.post_id,
            attachment.storage_path
          );

          if (result.success) {
            downloadedCount++;
            console.log(`[PULL] Downloaded attachment: ${attachment.filename}`);
          } else {
            console.error(`[PULL] Failed to download attachment ${attachment.filename}: ${result.error}`);
          }
        } catch (error) {
          console.error(`[PULL] Error downloading attachment ${attachment.filename}:`, error);
        }
      });

      await Promise.all(promises);
    }

    console.log(`[PULL] Attachment sync completed: ${downloadedCount} downloaded, ${skippedCount} skipped`);

  } catch (error) {
    console.error(`[PULL] Failed to pull attachments:`, error);
    // Don't throw here as attachment sync failure shouldn't fail the entire pull
  }
}
