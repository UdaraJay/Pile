import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { syncStateManager } from './state';

export interface ConflictInfo {
  id: string; // Unique conflict ID
  postId: string;
  localPath: string;
  remotePath: string;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
  localContent?: string;
  remoteContent?: string;
  localEtag?: string;
  remoteEtag?: string;
  conflictType: 'content' | 'metadata' | 'both';
  detectedAt: string;
  status: 'active' | 'resolved';
}

export interface ConflictArtifacts {
  conflictId: string;
  postId: string;
  localVersion: string;  // Path to local version file
  remoteVersion: string; // Path to remote version file
  originalLocal?: string; // Path to original local before conflict
}

export interface ConflictResolution {
  postId: string;
  choice: 'local' | 'remote' | 'merged';
  mergedContent?: string;
  resolvedAt: string;
}

/**
 * Generate unique conflict ID
 */
function generateConflictId(): string {
  return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compute SHA-256 hash of content for comparison
 */
function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Get conflicts directory path
 */
function getConflictsDir(pilePath: string): string {
  return path.join(pilePath, '.pile', 'conflicts');
}

/**
 * Get conflicts registry file path
 */
function getConflictsRegistryPath(pilePath: string): string {
  return path.join(getConflictsDir(pilePath), 'registry.json');
}

/**
 * Load conflicts registry
 */
async function loadConflictsRegistry(pilePath: string): Promise<ConflictInfo[]> {
  try {
    const registryPath = getConflictsRegistryPath(pilePath);
    const data = await fs.readFile(registryPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Registry doesn't exist or is invalid, return empty array
    return [];
  }
}

/**
 * Save conflicts registry
 */
async function saveConflictsRegistry(pilePath: string, conflicts: ConflictInfo[]): Promise<void> {
  try {
    const conflictsDir = getConflictsDir(pilePath);
    await fs.mkdir(conflictsDir, { recursive: true });
    
    const registryPath = getConflictsRegistryPath(pilePath);
    await fs.writeFile(registryPath, JSON.stringify(conflicts, null, 2), 'utf8');
  } catch (error) {
    console.error(`Failed to save conflicts registry: ${error}`);
    throw error;
  }
}

/**
 * Store conflict artifacts (local and remote versions)
 */
async function storeConflictArtifacts(
  pilePath: string,
  conflictId: string,
  postId: string,
  localContent: string,
  remoteContent: string
): Promise<ConflictArtifacts> {
  const conflictsDir = getConflictsDir(pilePath);
  await fs.mkdir(conflictsDir, { recursive: true });

  const artifacts: ConflictArtifacts = {
    conflictId,
    postId,
    localVersion: path.join(conflictsDir, `${conflictId}-local.md`),
    remoteVersion: path.join(conflictsDir, `${conflictId}-remote.md`),
  };

  // Store local version
  await fs.writeFile(artifacts.localVersion, localContent, 'utf8');
  
  // Store remote version
  await fs.writeFile(artifacts.remoteVersion, remoteContent, 'utf8');

  return artifacts;
}

/**
 * Detect conflicts between local and remote versions of a post
 */
export async function detectConflicts(
  pilePath: string,
  postId: string,
  localContent: string,
  remoteContent: string,
  localUpdatedAt: string,
  remoteUpdatedAt: string,
  localEtag?: string,
  remoteEtag?: string
): Promise<ConflictInfo | null> {
  console.log(`[CONFLICT] Detecting conflicts for post: ${postId}`);
  
  try {
    // Load pile state to get last sync checkpoint
    const state = await syncStateManager.loadState(pilePath);
    const lastPulledAt = state.checkpoint.lastPulledAt;
    
    if (!lastPulledAt) {
      // First sync, no conflicts possible
      console.log(`[CONFLICT] First sync, no conflicts for post: ${postId}`);
      return null;
    }

    // Check if both local and remote have changes since last sync
    const localChangedSinceSync = new Date(localUpdatedAt) > new Date(lastPulledAt);
    const remoteChangedSinceSync = new Date(remoteUpdatedAt) > new Date(lastPulledAt);
    
    console.log(`[CONFLICT] Post ${postId}: local changed=${localChangedSinceSync}, remote changed=${remoteChangedSinceSync}`);
    
    if (!localChangedSinceSync || !remoteChangedSinceSync) {
      // No conflict if only one side changed
      return null;
    }

    // Both sides changed, check if content actually differs
    const localHash = localEtag || computeContentHash(localContent);
    const remoteHash = remoteEtag || computeContentHash(remoteContent);
    
    if (localHash === remoteHash) {
      // Same content, no conflict despite different timestamps
      console.log(`[CONFLICT] Content hashes match, no conflict for post: ${postId}`);
      return null;
    }

    console.log(`[CONFLICT] Conflict detected for post: ${postId}`);

    // Check if conflict already exists
    const conflicts = await loadConflictsRegistry(pilePath);
    const existingConflict = conflicts.find(c => c.postId === postId && c.status === 'active');
    
    if (existingConflict) {
      // Update existing conflict with latest content
      existingConflict.localContent = localContent;
      existingConflict.remoteContent = remoteContent;
      existingConflict.localUpdatedAt = localUpdatedAt;
      existingConflict.remoteUpdatedAt = remoteUpdatedAt;
      existingConflict.localEtag = localEtag;
      existingConflict.remoteEtag = remoteEtag;
      
      await saveConflictsRegistry(pilePath, conflicts);
      
      // Update conflict artifacts
      await storeConflictArtifacts(pilePath, existingConflict.id, postId, localContent, remoteContent);
      
      console.log(`[CONFLICT] Updated existing conflict: ${existingConflict.id}`);
      return existingConflict;
    }

    // Create new conflict
    const conflictId = generateConflictId();
    const conflict: ConflictInfo = {
      id: conflictId,
      postId,
      localPath: path.join(pilePath, 'posts', `${postId}.md`),
      remotePath: `remote://${postId}`,
      localUpdatedAt,
      remoteUpdatedAt,
      localContent,
      remoteContent,
      localEtag,
      remoteEtag,
      conflictType: 'content',
      detectedAt: new Date().toISOString(),
      status: 'active',
    };

    // Store conflict artifacts
    await storeConflictArtifacts(pilePath, conflictId, postId, localContent, remoteContent);

    // Add to registry
    conflicts.push(conflict);
    await saveConflictsRegistry(pilePath, conflicts);

    console.log(`[CONFLICT] Created new conflict: ${conflictId} for post: ${postId}`);
    return conflict;

  } catch (error) {
    console.error(`[CONFLICT] Failed to detect conflicts: ${error}`);
    return null;
  }
}

/**
 * List all unresolved conflicts for a pile
 */
export async function listConflicts(pilePath: string): Promise<ConflictInfo[]> {
  console.log(`[CONFLICT] Listing conflicts for pile: ${pilePath}`);
  
  try {
    const conflicts = await loadConflictsRegistry(pilePath);
    
    // Filter out resolved conflicts and return only active ones
    const activeConflicts = conflicts.filter(c => c.status === 'active');
    
    console.log(`[CONFLICT] Found ${activeConflicts.length} active conflicts`);
    return activeConflicts;
  } catch (error) {
    console.error(`[CONFLICT] Failed to list conflicts: ${error}`);
    return [];
  }
}

/**
 * Resolve a conflict with the user's choice
 */
export async function resolveConflict(
  pilePath: string,
  postId: string,
  resolution: ConflictResolution
): Promise<boolean> {
  console.log(`[CONFLICT] Resolving conflict for post: ${postId}, choice: ${resolution.choice}`);
  
  try {
    // Load conflicts registry
    const conflicts = await loadConflictsRegistry(pilePath);
    const conflict = conflicts.find(c => c.postId === postId && c.status === 'active');
    
    if (!conflict) {
      console.error(`[CONFLICT] No active conflict found for post: ${postId}`);
      return false;
    }

    let resolvedContent: string;
    
    // Determine the resolved content based on user choice
    switch (resolution.choice) {
      case 'local':
        resolvedContent = conflict.localContent || '';
        console.log(`[CONFLICT] Using local version for post: ${postId}`);
        break;
      case 'remote':
        resolvedContent = conflict.remoteContent || '';
        console.log(`[CONFLICT] Using remote version for post: ${postId}`);
        break;
      case 'merged':
        resolvedContent = resolution.mergedContent || conflict.localContent || '';
        console.log(`[CONFLICT] Using merged version for post: ${postId}`);
        break;
      default:
        throw new Error(`Invalid resolution choice: ${resolution.choice}`);
    }

    // Update the local file with resolved content
    const localFilePath = path.join(pilePath, 'posts', `${postId}.md`);
    await fs.writeFile(localFilePath, resolvedContent, 'utf8');
    
    console.log(`[CONFLICT] Updated local file: ${localFilePath}`);

    // Mark conflict as resolved
    conflict.status = 'resolved';
    conflict.localContent = undefined; // Clear content to save space
    conflict.remoteContent = undefined;
    
    await saveConflictsRegistry(pilePath, conflicts);

    // Clean up conflict artifacts
    await cleanupConflictArtifacts(pilePath, conflict.id);

    // If using remote or merged content, enqueue push operation to sync the resolution
    if (resolution.choice === 'remote' || resolution.choice === 'merged') {
      const { syncQueue } = await import('./queue');
      await syncQueue.enqueue({
        type: 'upsertPost',
        pilePath,
        postId,
        filePath: path.relative(pilePath, localFilePath),
        data: { content: resolvedContent },
        etag: computeContentHash(resolvedContent),
      });
      console.log(`[CONFLICT] Enqueued push operation for resolved post: ${postId}`);
    }

    console.log(`[CONFLICT] Successfully resolved conflict: ${conflict.id}`);
    return true;

  } catch (error) {
    console.error(`[CONFLICT] Failed to resolve conflict: ${error}`);
    return false;
  }
}

/**
 * Clean up conflict artifacts after resolution
 */
async function cleanupConflictArtifacts(pilePath: string, conflictId: string): Promise<void> {
  try {
    const conflictsDir = getConflictsDir(pilePath);
    const localVersionPath = path.join(conflictsDir, `${conflictId}-local.md`);
    const remoteVersionPath = path.join(conflictsDir, `${conflictId}-remote.md`);

    // Remove artifact files
    try {
      await fs.unlink(localVersionPath);
    } catch {
      // File might not exist, ignore
    }

    try {
      await fs.unlink(remoteVersionPath);
    } catch {
      // File might not exist, ignore
    }

    console.log(`[CONFLICT] Cleaned up artifacts for conflict: ${conflictId}`);
  } catch (error) {
    console.error(`[CONFLICT] Failed to cleanup artifacts: ${error}`);
    // Don't throw, cleanup failure shouldn't fail resolution
  }
}

/**
 * Get count of unresolved conflicts for a pile
 */
export async function getConflictCount(pilePath: string): Promise<number> {
  try {
    const conflicts = await listConflicts(pilePath);
    return conflicts.length;
  } catch (error) {
    console.error(`[CONFLICT] Failed to get conflict count: ${error}`);
    return 0;
  }
}

/**
 * Get detailed conflict information by conflict ID
 */
export async function getConflictById(pilePath: string, conflictId: string): Promise<ConflictInfo | null> {
  try {
    const conflicts = await loadConflictsRegistry(pilePath);
    return conflicts.find(c => c.id === conflictId) || null;
  } catch (error) {
    console.error(`[CONFLICT] Failed to get conflict by ID: ${error}`);
    return null;
  }
}

/**
 * Read conflict artifact content
 */
export async function getConflictArtifact(
  pilePath: string, 
  conflictId: string, 
  version: 'local' | 'remote'
): Promise<string | null> {
  try {
    const conflictsDir = getConflictsDir(pilePath);
    const artifactPath = path.join(conflictsDir, `${conflictId}-${version}.md`);
    
    return await fs.readFile(artifactPath, 'utf8');
  } catch (error) {
    console.error(`[CONFLICT] Failed to read conflict artifact: ${error}`);
    return null;
  }
}