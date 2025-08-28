# Offline-First Refactor Progress

This document tracks the progress of converting Pile to a strictly offline-first architecture with optional per-pile sync to Supabase.

## Overview

**Objective**: Make Pile strictly offline-first where every pile is a local folder with Markdown posts, remove "cloud pile" flows, and add an opt-in per-pile sync to Supabase with a new sync engine in the Electron main process.

## Phase Progress

### ✅ Phase 1 — Unify Editor/UI (COMPLETED)
**Goal**: Remove cloud editor and ensure "New Post" and existing posts use the same Editor and styles.

**Tasks Completed**:
- [x] Delete cloud-only components and contexts
  - [x] Remove folder `src/renderer/pages/Pile/CloudEditor/`
  - [x] Remove file `src/renderer/context/CloudPostsContext.js`
  - [x] Remove file `src/renderer/hooks/useCloudPost.js`
  - [x] Remove file `src/renderer/pages/Pile/Posts/CloudPostRow.jsx`
- [x] Remove cloud routes and UI
  - [x] Remove `/pile/cloud/:pileId` route from `src/renderer/App.jsx`
  - [x] Remove "Create a cloud pile" button from `src/renderer/pages/Home/index.tsx`
  - [x] Remove cloud badges and conditional UI elements
- [x] Make "New Post" always use the local Editor
  - [x] Update `src/renderer/pages/Pile/NewPost/index.jsx` to remove cloud conditionals
- [x] Verify ProseMirror styles are applied (confirmed in local editor)
- [x] Update related components
  - [x] Fix `src/renderer/pages/Pile/Posts/VirtualList.jsx`
  - [x] Fix `src/renderer/pages/Pile/Layout.jsx` 
  - [x] Fix `src/renderer/context/IndexContext.js`

**Validation**: ✅ App compiles and runs, unified editor experience, no cloud-specific UI

---

### ✅ Phase 2 — Sync Engine Scaffolding in Main + IPC surface (COMPLETED)
**Goal**: Add a skeleton sync engine in main with IPC endpoints; renderer consumes status only.

**Tasks Completed**:
- [x] Create new main modules under `src/main/sync/`:
  - [x] `state.ts`: In-memory and JSON-backed state for per-pile checkpoints
  - [x] `queue.ts`: Persistent queue with retry/backoff
  - [x] `fileWatcher.ts`: Chokidar watchers for file changes (stubbed, ready for Phase 4)
  - [x] `pull.ts`: Stub for pulling from Supabase
  - [x] `push.ts`: Stub for pushing to Supabase  
  - [x] `attachments.ts`: Stubs for future attachment handling
  - [x] `conflict.ts`: Stubs for conflict detection
- [x] Add new handler file `src/main/handlers/sync.ts`:
  - [x] `sync:link-pile` IPC handler
  - [x] `sync:unlink-pile` IPC handler
  - [x] `sync:run` IPC handler
  - [x] `sync:status` IPC handler
  - [x] `sync:list-conflicts` IPC handler
  - [x] `sync:resolve` IPC handler
  - [x] `sync:migrate-cloud-pile` IPC handler
- [x] Wire handlers from `src/main/ipc.ts`
- [x] Update `src/main/preload.ts` to expose sync IPC APIs
- [x] Add renderer sync status component
  - [x] Create `src/renderer/components/Sync/StatusPill.jsx`
  - [x] Create `src/renderer/components/Sync/StatusPill.module.scss`

**Validation**: ✅ App compiles; IPC endpoints return stubbed data; status pill component ready

---

### ✅ Phase 3 — Implement Pull (remote → local) (COMPLETED)
**Goal**: Implement incremental pull logic (read from Supabase in main, write local files, update checkpoint, refresh index).

**Tasks Completed**:
- [x] Implement `pull.ts`:
  - [x] Checkpoint loading from `.pile/sync.json`
  - [x] Query Supabase posts with incremental sync using (updated_at, id) tiebreak
  - [x] Handle deleted posts (move to `.pile/trash/` directory)
  - [x] Write/update local `.md` files with frontmatter metadata
  - [x] Placeholder for HTML to MD conversion (ready for implementation)
  - [x] Trigger index refresh using existing `pileIndex.load()` utility
  - [x] Update checkpoints with last processed (updated_at, id)
- [x] IPC `sync:run` already calls `pullPile` (verified from Phase 2)
- [x] Supabase access remains in main only via existing `lib/supabase.ts`

**Implementation Details**:
- Batch processing with 100 posts limit per pull
- Incremental sync using checkpoint-based queries
- Last Write Wins (LWW) strategy for conflicts (Phase 6 will add manual resolution)
- Robust error handling with per-post error isolation
- Proper frontmatter formatting with all required metadata

**Validation**: ✅ App compiles; pull logic implemented; ready to sync remote → local files and update index

---

### ✅ Phase 4 — Implement Push (local → remote) (COMPLETED)
**Goal**: Watch local files, enqueue changes, and upsert to Supabase.

**Tasks Completed**:
- [x] Install chokidar dependency for file watching
- [x] Implement `fileWatcher.ts`:
  - [x] Watch pile paths with chokidar (posts/**/*.md and attachments/**)
  - [x] Debounce/coalesce file events with 500ms delay
  - [x] Enqueue create/update/delete operations via sync queue
  - [x] Parse markdown files and extract frontmatter metadata
  - [x] Handle post ID extraction and etag computation
- [x] Implement `push.ts`:
  - [x] Dequeue operations with concurrency control (batches of 4)
  - [x] Upsert to Supabase posts table with proper data mapping
  - [x] Handle retry with exponential backoff via queue system
  - [x] Update last pushed checkpoints
  - [x] Process upsertPost and tombstonePost operations
  - [x] Stub attachment operations (ready for Phase 5)
- [x] IPC `sync:run` already calls `pushPile` (verified from Phase 2)
- [x] Queue status already exposed in `sync:status` (verified from Phase 2)

**Implementation Details**:
- File watching with chokidar includes proper ignored patterns and write finish detection
- Push processing handles file deletion since enqueue (converts to tombstone)
- Concurrency-limited processing prevents overwhelming Supabase
- Comprehensive error handling with per-operation isolation
- Post upserts include title, content_md, etag, and timestamps
- Soft delete implementation using deleted_at timestamp

**Validation**: ✅ App compiles; file watching active; push queue processes operations; ready for local → remote sync

---

### ✅ Phase 5 — Attachments (COMPLETED)
**Goal**: Implement attachment replication with hashing/dedupe.

**Tasks Completed**:
- [x] Implement complete `attachments.ts` module:
  - [x] Local naming: `attachments/<post-id>/<hash>-<filename>`
  - [x] Remote path: `user_id/piles/<pile-id>/<post-id>/<hash>-<filename>`
  - [x] SHA-256 hashing for content deduplication
  - [x] MIME type detection and metadata management
  - [x] Push: upload if hash not found, upsert metadata to database
  - [x] Pull: download missing/changed attachments with integrity verification
  - [x] Local-only attachment scanning for unlinked piles
- [x] Integrate attachment operations into push/pull sync:
  - [x] Update push.ts to handle upsertAttachment and deleteAttachment operations
  - [x] Update pull.ts to automatically sync attachments after post updates
  - [x] Batch processing with concurrency limits (3 concurrent downloads, 4 uploads)
- [x] Add comprehensive IPC API for attachment management:
  - [x] `sync:upload-attachment` for manual uploads
  - [x] `sync:list-attachments` for listing post attachments
  - [x] `sync:get-attachment-url` for signed URL previews
  - [x] `sync:download-attachment` for manual downloads
- [x] File watcher integration for automatic attachment sync
- [x] Robust error handling and fallback mechanisms

**Implementation Details**:
- Content-based deduplication using SHA-256 hashes prevents duplicate uploads
- Automatic local file organization in `attachments/<post-id>/` directories
- Supabase Storage integration with proper bucket management and RLS
- Signed URL generation for secure preview access without full downloads
- Local file integrity verification on download with hash checking
- Support for both linked (sync-enabled) and local-only piles
- Comprehensive MIME type detection for 15+ common file formats
- Batch processing prevents overwhelming storage and network resources

**Validation**: ✅ App compiles; attachment upload/download/sync implemented; deduplication working; preview URLs functional

---

### ✅ Phase 6 — Conflicts (COMPLETED)
**Goal**: LWW by default; detect divergent edits and surface manual resolution UI.

**Tasks Completed**:
- [x] Implement comprehensive `conflict.ts` module:
  - [x] Detect when both local and remote changed since last sync checkpoint
  - [x] Compare content hashes/etags for actual differences detection
  - [x] Record conflict artifacts in `.pile/conflicts/` directory
  - [x] Generate unique conflict IDs and maintain conflict registry
  - [x] Store local and remote versions as separate files for comparison
  - [x] Support conflict status tracking (active/resolved)
- [x] Integrate conflict detection into pull sync:
  - [x] Update pull.ts to detect conflicts during post processing
  - [x] Implement Last Write Wins (LWW) strategy as default behavior
  - [x] Preserve conflict information for manual resolution
- [x] Implement complete conflict resolution IPC API:
  - [x] `sync:list-conflicts` - List all active conflicts for a pile
  - [x] `sync:resolve` - Resolve conflicts with user choice (local/remote/merged)
  - [x] `sync:get-conflict` - Get detailed conflict information
  - [x] `sync:get-conflict-artifact` - Retrieve local/remote version content
- [x] Update sync status to include real-time conflict counts
- [x] Automatic cleanup of resolved conflict artifacts
- [x] Queue push operations for resolved conflicts when needed

**Implementation Details**:
- Conflict detection only triggers when both local and remote changed since last sync
- Content hash comparison prevents false conflicts from timestamp differences
- Conflict artifacts stored as `{conflictId}-local.md` and `{conflictId}-remote.md`
- JSON registry tracks all conflict metadata in `.pile/conflicts/registry.json`
- LWW strategy compares timestamps automatically, conflicts logged for manual review
- Resolution updates local files and optionally enqueues push operations
- Comprehensive error handling ensures sync continues even with conflict failures
- Memory-efficient storage clears content after resolution to save space

**Validation**: ✅ App compiles; conflict detection active; LWW implemented; manual resolution API ready

---

### ✅ Phase 7 — Migration & Cleanup  
**Goal**: Eliminate cloud-only code and localize existing remote piles.

**Tasks**:
- [x] Implement `sync:migrate-cloud-pile`:
  - [x] Create local folder structure
  - [x] Download all remote posts as `.md` files  
  - [x] Download all attachments
  - [x] Initialize sync checkpoints
- [x] Remove remaining renderer sync infrastructure:
  - [x] `src/renderer/context/SyncContext.js`
  - [x] `src/renderer/context/SyncInfraContext.js`
  - [x] `src/renderer/lib/syncManager.js`
  - [x] `src/renderer/lib/offlineQueue.js`
  - [x] `src/renderer/lib/localCache.js`
  - [x] `src/renderer/lib/networkStatus.js`
- [x] Remove old sync UI components:
  - [x] `ErrorBanner`, `MigrationWizard`, `SyncStatus` components
  - [x] Updated Settings and Layout to remove cloud sync UI
  - [x] Fixed all webpack build errors
- [x] Remove any remaining cloud pile references
- [x] Update documentation
- [x] Final testing and validation

**Validation**: ✅ All cloud-only code removed; migration tool implemented; main + renderer builds pass

**Phase 7 Summary:**
Successfully completed the migration and cleanup phase:
1. **Migration Tool**: Implemented `handleMigrateCloudPile` in main process with full functionality
2. **Infrastructure Cleanup**: Removed all old sync contexts, managers, and components
3. **UI Cleanup**: Removed cloud-specific UI components and settings
4. **Build Validation**: Fixed all webpack errors; both main and renderer compile successfully
5. **Architecture**: Now fully offline-first with optional per-pile sync managed by main process

---

## IPC Contract (Main ↔ Renderer)

- `sync:link-pile (pilePath) → { linked: true, remote_pile_id }`
- `sync:unlink-pile (pilePath) → { linked: false }`
- `sync:run (pilePath, mode?: 'pull'|'push'|'both') → { started: true }`
- `sync:status (pilePath?) → { piles: [{ pilePath, linked, queueLen, lastPullAt, lastPushAt, conflictsCount, lastError? }] }`
- `sync:list-conflicts (pilePath) → [{ postId, localPath, remotePath, updatedAtLocal, updatedAtRemote }]`
- `sync:resolve (postId, choice: 'local'|'remote'|'merged', mergedPath?) → { ok: true }`
- `sync:migrate-cloud-pile (remotePileId, destFolder) → { localPileId, count }`

## Supabase Schema Requirements

- `posts`: add `content_md text`, `etag text`, `deleted_at timestamptz`
- `piles`: add `deleted_at timestamptz`  
- `attachments`: add `content_hash text`, `deleted_at timestamptz`
- Proper indexes on `(user_id, updated_at desc, id)` with partial indexes on `deleted_at`
- RLS enforced by `auth.uid()` for all tables and storage

## Notes

- Keep commits small and focused per phase
- Run `npm run lint` and `npm start` after each phase
- Minimize churn; avoid bundling everything at once
- All Supabase access remains in main process only
- Use LWW (Last Write Wins) for conflict resolution by default