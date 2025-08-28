import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { syncStateManager } from './state';

export interface AttachmentInfo {
  id: string;
  postId: string;
  pileId: string;
  hash: string;
  filename: string;
  localPath: string;
  remotePath: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface AttachmentMetadata {
  id: string;
  post_id: string;
  pile_id: string;
  filename: string;
  content_hash: string;
  size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UploadResult {
  success: boolean;
  error?: string;
  remotePath?: string;
  signedUrl?: string;
}

export interface DownloadResult {
  success: boolean;
  error?: string;
  localPath?: string;
}

/**
 * Compute SHA-256 hash of file content
 */
export async function computeFileHash(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Get MIME type from file extension (basic implementation)
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Generate local attachment path
 * Format: attachments/<post-id>/<hash>-<filename>
 */
export function generateLocalPath(pilePath: string, postId: string, hash: string, filename: string): string {
  return path.join(pilePath, 'attachments', postId, `${hash}-${filename}`);
}

/**
 * Generate remote storage path
 * Format: user_id/piles/<pile-id>/<post-id>/<hash>-<filename>
 */
export async function generateRemotePath(pileId: string, postId: string, hash: string, filename: string): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user) {
    throw new Error('Not authenticated');
  }
  const userId = session.session.user.id;
  return `${userId}/piles/${pileId}/${postId}/${hash}-${filename}`;
}

/**
 * Parse attachment path to extract components
 */
export function parseAttachmentPath(attachmentPath: string): { postId: string; hash: string; filename: string } | null {
  // Expected format: attachments/<post-id>/<hash>-<filename>
  const parts = attachmentPath.split('/');
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
 * Upload an attachment to Supabase storage with deduplication
 */
export async function uploadAttachment(
  pilePath: string,
  postId: string,
  localFilePath: string
): Promise<UploadResult> {
  console.log(`[ATTACHMENT] Uploading: ${localFilePath}`);
  
  try {
    // Get pile state to find remote pile ID
    const state = await syncStateManager.loadState(pilePath);
    if (!state.linked || !state.remotePileId) {
      throw new Error('Pile is not linked to a remote pile');
    }

    // Compute file hash and metadata
    const hash = await computeFileHash(localFilePath);
    const filename = path.basename(localFilePath);
    const stats = await fs.stat(localFilePath);
    const mimeType = getMimeType(filename);

    console.log(`[ATTACHMENT] File hash: ${hash}, size: ${stats.size}`);

    // Check if this hash already exists for this post (deduplication)
    const { data: existingAttachment, error: queryError } = await supabase
      .from('attachments')
      .select('*')
      .eq('post_id', postId)
      .eq('pile_id', state.remotePileId)
      .eq('content_hash', hash)
      .eq('filename', filename)
      .is('deleted_at', null)
      .single();

    if (queryError && queryError.code !== 'PGRST116') {
      throw new Error(`Failed to check existing attachment: ${queryError.message}`);
    }

    let remotePath: string;
    let attachmentId: string;

    if (existingAttachment) {
      // Attachment already exists, reuse it
      console.log(`[ATTACHMENT] Found existing attachment: ${existingAttachment.id}`);
      remotePath = existingAttachment.storage_path;
      attachmentId = existingAttachment.id;
    } else {
      // Generate new attachment ID and paths
      attachmentId = crypto.randomUUID();
      remotePath = await generateRemotePath(state.remotePileId, postId, hash, filename);

      console.log(`[ATTACHMENT] Uploading to: ${remotePath}`);

      // Upload file to Supabase Storage
      const fileBuffer = await fs.readFile(localFilePath);
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(remotePath, fileBuffer, {
          contentType: mimeType,
          upsert: true, // Allow overwrite if file exists
        });

      if (uploadError) {
        throw new Error(`Failed to upload to storage: ${uploadError.message}`);
      }

      // Insert attachment metadata into database
      const attachmentMetadata: Omit<AttachmentMetadata, 'created_at' | 'updated_at'> = {
        id: attachmentId,
        post_id: postId,
        pile_id: state.remotePileId,
        filename,
        content_hash: hash,
        size: stats.size,
        mime_type: mimeType,
        storage_path: remotePath,
      };

      const { error: insertError } = await supabase
        .from('attachments')
        .insert(attachmentMetadata);

      if (insertError) {
        // Clean up uploaded file if metadata insertion fails
        await supabase.storage.from('attachments').remove([remotePath]);
        throw new Error(`Failed to insert attachment metadata: ${insertError.message}`);
      }

      console.log(`[ATTACHMENT] Successfully uploaded new attachment: ${attachmentId}`);
    }

    // Create local attachment directory and copy file to attachment path
    const localAttachmentPath = generateLocalPath(pilePath, postId, hash, filename);
    const localAttachmentDir = path.dirname(localAttachmentPath);
    
    await fs.mkdir(localAttachmentDir, { recursive: true });
    
    // Copy to attachment path if not already there
    if (path.resolve(localFilePath) !== path.resolve(localAttachmentPath)) {
      await fs.copyFile(localFilePath, localAttachmentPath);
    }

    // Generate signed URL for immediate access
    const { data: signedUrlData } = await supabase.storage
      .from('attachments')
      .createSignedUrl(remotePath, 3600); // 1 hour expiry

    return {
      success: true,
      remotePath,
      signedUrl: signedUrlData?.signedUrl,
    };

  } catch (error) {
    console.error(`[ATTACHMENT] Failed to upload: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download an attachment from Supabase storage
 */
export async function downloadAttachment(
  pilePath: string,
  postId: string,
  remotePath: string,
  expectedHash?: string
): Promise<DownloadResult> {
  console.log(`[ATTACHMENT] Downloading: ${remotePath}`);
  
  try {
    // Get attachment metadata from database
    const { data: attachment, error: queryError } = await supabase
      .from('attachments')
      .select('*')
      .eq('post_id', postId)
      .eq('storage_path', remotePath)
      .is('deleted_at', null)
      .single();

    if (queryError || !attachment) {
      throw new Error(`Attachment not found in database: ${queryError?.message || 'Not found'}`);
    }

    // Generate local path
    const localPath = generateLocalPath(pilePath, postId, attachment.content_hash, attachment.filename);
    const localDir = path.dirname(localPath);

    // Create directory if it doesn't exist
    await fs.mkdir(localDir, { recursive: true });

    // Check if file already exists locally and has correct hash
    let needsDownload = true;
    try {
      const existingHash = await computeFileHash(localPath);
      if (existingHash === attachment.content_hash) {
        console.log(`[ATTACHMENT] File already exists locally with correct hash: ${localPath}`);
        needsDownload = false;
      }
    } catch {
      // File doesn't exist or couldn't be read, need to download
    }

    if (needsDownload) {
      console.log(`[ATTACHMENT] Downloading to: ${localPath}`);

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('attachments')
        .download(remotePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download from storage: ${downloadError?.message || 'No data'}`);
      }

      // Convert Blob to Buffer and write to local file
      const fileBuffer = Buffer.from(await fileData.arrayBuffer());
      await fs.writeFile(localPath, fileBuffer);

      // Verify integrity by checking hash
      const downloadedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      if (downloadedHash !== attachment.content_hash) {
        // Delete corrupted file
        await fs.unlink(localPath).catch(() => {});
        throw new Error(`Hash mismatch: expected ${attachment.content_hash}, got ${downloadedHash}`);
      }

      console.log(`[ATTACHMENT] Successfully downloaded and verified: ${attachment.filename}`);
    }

    return {
      success: true,
      localPath,
    };

  } catch (error) {
    console.error(`[ATTACHMENT] Failed to download: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download attachment by hash and filename (alternative interface)
 */
export async function downloadAttachmentByHash(
  pilePath: string,
  postId: string,
  hash: string,
  filename: string
): Promise<DownloadResult> {
  try {
    // Get pile state to find remote pile ID
    const state = await syncStateManager.loadState(pilePath);
    if (!state.linked || !state.remotePileId) {
      throw new Error('Pile is not linked to a remote pile');
    }

    // Generate expected remote path
    const remotePath = await generateRemotePath(state.remotePileId, postId, hash, filename);
    return await downloadAttachment(pilePath, postId, remotePath, hash);

  } catch (error) {
    console.error(`[ATTACHMENT] Failed to download by hash: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get signed URL for attachment preview without downloading
 */
export async function getAttachmentSignedUrl(
  postId: string,
  hash: string,
  filename?: string,
  expiresIn: number = 3600
): Promise<string | null> {
  console.log(`[ATTACHMENT] Getting signed URL for: ${postId}/${hash}`);
  
  try {
    // Find attachment in database
    let attachment: AttachmentMetadata;
    
    if (filename) {
      // Query with filename for better matching
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('post_id', postId)
        .eq('content_hash', hash)
        .eq('filename', filename)
        .is('deleted_at', null)
        .single();
      
      if (error || !data) {
        throw new Error(`Attachment not found: ${error?.message || 'Not found'}`);
      }
      attachment = data;
    } else {
      // Query by hash only
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('post_id', postId)
        .eq('content_hash', hash)
        .is('deleted_at', null)
        .single();
      
      if (error || !data) {
        throw new Error(`Attachment not found: ${error?.message || 'Not found'}`);
      }
      attachment = data;
    }

    // Generate signed URL from Supabase Storage
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('attachments')
      .createSignedUrl(attachment.storage_path, expiresIn);

    if (urlError || !signedUrlData) {
      throw new Error(`Failed to create signed URL: ${urlError?.message || 'No data'}`);
    }

    console.log(`[ATTACHMENT] Generated signed URL for: ${attachment.filename}`);
    return signedUrlData.signedUrl;

  } catch (error) {
    console.error(`[ATTACHMENT] Failed to get signed URL: ${error}`);
    return null;
  }
}

/**
 * Get signed URL by attachment storage path (direct)
 */
export async function getAttachmentSignedUrlByPath(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data: signedUrlData, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, expiresIn);

    if (error || !signedUrlData) {
      throw new Error(`Failed to create signed URL: ${error?.message || 'No data'}`);
    }

    return signedUrlData.signedUrl;
  } catch (error) {
    console.error(`[ATTACHMENT] Failed to get signed URL by path: ${error}`);
    return null;
  }
}

/**
 * List all attachments for a post
 */
export async function listPostAttachments(
  pilePath: string,
  postId: string
): Promise<AttachmentInfo[]> {
  console.log(`[ATTACHMENT] Listing attachments for post: ${postId}`);
  
  try {
    // Get pile state to find remote pile ID
    const state = await syncStateManager.loadState(pilePath);
    if (!state.linked || !state.remotePileId) {
      // For unlinked piles, scan local attachment directory
      return await listLocalAttachments(pilePath, postId);
    }

    // Query attachments from database
    const { data: attachments, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('post_id', postId)
      .eq('pile_id', state.remotePileId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to query attachments: ${error.message}`);
    }

    if (!attachments || attachments.length === 0) {
      return [];
    }

    // Convert database records to AttachmentInfo
    const attachmentInfos: AttachmentInfo[] = attachments.map((attachment: AttachmentMetadata) => ({
      id: attachment.id,
      postId: attachment.post_id,
      pileId: attachment.pile_id,
      hash: attachment.content_hash,
      filename: attachment.filename,
      localPath: generateLocalPath(pilePath, attachment.post_id, attachment.content_hash, attachment.filename),
      remotePath: attachment.storage_path,
      size: attachment.size,
      mimeType: attachment.mime_type,
      createdAt: attachment.created_at,
      updatedAt: attachment.updated_at,
      deletedAt: attachment.deleted_at,
    }));

    console.log(`[ATTACHMENT] Found ${attachmentInfos.length} attachments for post ${postId}`);
    return attachmentInfos;

  } catch (error) {
    console.error(`[ATTACHMENT] Failed to list attachments: ${error}`);
    return [];
  }
}

/**
 * List local attachments by scanning the filesystem (for unlinked piles)
 */
export async function listLocalAttachments(
  pilePath: string,
  postId: string
): Promise<AttachmentInfo[]> {
  try {
    const attachmentsDir = path.join(pilePath, 'attachments', postId);
    
    // Check if directory exists
    try {
      await fs.access(attachmentsDir);
    } catch {
      return []; // Directory doesn't exist, no attachments
    }

    const files = await fs.readdir(attachmentsDir);
    const attachments: AttachmentInfo[] = [];

    for (const file of files) {
      const filePath = path.join(attachmentsDir, file);
      
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) continue;

        // Parse filename to extract hash
        const parsed = parseAttachmentPath(path.join('attachments', postId, file));
        if (!parsed) continue;

        const mimeType = getMimeType(parsed.filename);

        attachments.push({
          id: `local-${parsed.hash}`, // Generate local ID
          postId,
          pileId: 'local',
          hash: parsed.hash,
          filename: parsed.filename,
          localPath: filePath,
          remotePath: '', // No remote path for local-only attachments
          size: stats.size,
          mimeType,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
        });
      } catch (error) {
        console.error(`[ATTACHMENT] Error processing file ${file}: ${error}`);
        continue;
      }
    }

    return attachments;
  } catch (error) {
    console.error(`[ATTACHMENT] Failed to list local attachments: ${error}`);
    return [];
  }
}

/**
 * Delete an attachment (soft delete in database, remove from storage)
 */
export async function deleteAttachment(
  pilePath: string,
  postId: string,
  attachmentId: string
): Promise<boolean> {
  console.log(`[ATTACHMENT] Deleting attachment: ${attachmentId}`);
  
  try {
    // Get pile state to find remote pile ID
    const state = await syncStateManager.loadState(pilePath);
    if (!state.linked || !state.remotePileId) {
      throw new Error('Pile is not linked to a remote pile');
    }

    // Get attachment metadata
    const { data: attachment, error: queryError } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('post_id', postId)
      .eq('pile_id', state.remotePileId)
      .is('deleted_at', null)
      .single();

    if (queryError || !attachment) {
      throw new Error(`Attachment not found: ${queryError?.message || 'Not found'}`);
    }

    // Soft delete in database
    const { error: updateError } = await supabase
      .from('attachments')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', attachmentId);

    if (updateError) {
      throw new Error(`Failed to delete attachment: ${updateError.message}`);
    }

    // Remove from storage (optional, can be done in cleanup job)
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([attachment.storage_path]);

    if (storageError) {
      console.warn(`[ATTACHMENT] Failed to remove from storage: ${storageError.message}`);
      // Don't fail the operation if storage removal fails
    }

    // Remove local file
    const localPath = generateLocalPath(pilePath, postId, attachment.content_hash, attachment.filename);
    try {
      await fs.unlink(localPath);
    } catch {
      // File might not exist locally, that's ok
    }

    console.log(`[ATTACHMENT] Successfully deleted attachment: ${attachmentId}`);
    return true;

  } catch (error) {
    console.error(`[ATTACHMENT] Failed to delete attachment: ${error}`);
    return false;
  }
}