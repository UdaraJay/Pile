# Sync UI Integration Progress

This document tracks the phases to wire the existing main-process sync engine into the renderer UI.

## Overview

Objective: Expose per‑pile Supabase sync controls and status in the renderer (Settings, Layout, Conflicts), using the already implemented IPC and preload APIs under `window.electron.sync`.

APIs available in preload:
- `linkPile(pilePath, remotePileId?)`
- `unlinkPile(pilePath)`
- `runSync(pilePath, mode?: 'pull' | 'push' | 'both')`
- `getStatus(pilePath?)`
- `listConflicts(pilePath)` / `resolveConflict(pilePath, postId, 'local'|'remote'|'merged', mergedContent?)`
- `migrateCloudPile(remotePileId, destFolder)`
- Attachments + conflict helpers (advanced): `getConflict`, `getConflictArtifact`, `uploadAttachment`, `listAttachments`, `getAttachmentSignedUrl`, `downloadAttachment`

Note: The method name is `runSync` (not `run`).

## Phase Progress

### ✅ Phase 1 — Settings: Pile‑level Sync Controls (COMPLETED)
Goal: Add a `PileSync` section to Pile Settings to enable/disable sync, run sync, and show status.

Tasks:
- [x] Create `src/renderer/pages/Pile/Settings/PileSync/index.jsx` + `index.module.scss`
- [x] Show current status via `getStatus(pilePath)` (fields: `linked`, `queueLen`, `conflictsCount`, `lastPullAt`, `lastPushAt`, `lastError`)
- [x] If unlinked: button “Enable Cloud Sync” → `linkPile(pilePath)` then refresh status
- [x] If linked: show “Sync Now” → `runSync(pilePath)` and “Disable Sync” → `unlinkPile(pilePath)`
- [x] Render last sync time and pending/uptodate/conflict indicators
- [x] Basic error messaging for failed actions
  - [x] Surface underlying IPC `error` field when available
  - [x] Avoid generic auth hint unless error indicates auth

Validation:
- Status loads correctly for linked/unlinked piles (manual check pending)
- Sync actions succeed and update UI state (manual check pending)

---

### ✅ Phase 2 — Layout: Compact Status Pill (COMPLETED)
Goal: Add a small status pill in Pile Layout that reflects queue/conflicts and refreshes periodically.

Tasks:
- [x] Create `src/renderer/components/Sync/StatusPill.jsx` + `StatusPill.module.scss`
- [x] Mount in `src/renderer/pages/Pile/Layout.jsx` with `pilePath`
- [x] Poll `getStatus(pilePath)` every 30s; icons: `⏳` when `queueLen>0`, `⚠️` when `conflictsCount>0`, otherwise `✅`
- [x] Tooltip with last sync time and counts
  - [x] Use `@radix-ui/react-icons` (ClockIcon, ExclamationTriangleIcon, CheckCircledIcon)

Validation:
- Pill updates over time and matches status fields (manual check pending)

---

### ✅ Phase 3 — Conflicts: Review & Resolve UI (COMPLETED)
Goal: Provide a conflict list and resolution flow in Settings.

Tasks:
- [x] Add “Conflicts” panel to `PileSync` (visible when `conflictsCount>0`)
- [x] List conflicts via `listConflicts(pilePath)` with post ids and timestamps
- [x] Detail modal: fetch artifacts via `getConflictArtifact(pilePath, conflictId, 'local'|'remote')`
- [x] Actions: resolve with `resolveConflict(pilePath, postId, 'local'|'remote'|'merged', mergedContent?)`
- [x] After resolve, refresh status and list
  - [x] Side-by-side diff with inline word highlights for changed lines
  - [x] Scroll-synced panes, line numbers, and colored add/remove context

Validation:
- Can resolve conflicts and see counts decrease; resolved content persists (manual check pending)

---

### ✅ Phase 4 — Autosync & Resilience (COMPLETED)
Goal: Light background sync and failure visibility.

Tasks:
- [x] In Settings, optional “Auto‑sync every 5 min” toggle (default off, persisted via `window.electron.store`)
- [x] On interval: iterate `getStatus()` for all piles, call `runSync(p.pilePath)` when `linked && queueLen>0`
- [x] Surface `lastError` in the UI with retry button
- [x] Transient toast on auto-sync failure (noise‑reduced: errors only)
  - [x] Add "Force Rescan" in Settings to restart watcher and enqueue existing files

Validation:
- Autosync triggers only for linked piles with a non‑empty queue (manual check pending)
- Errors visible and recoverable via manual retry (manual check pending)

---

### ✅ Phase 5 — Migration Entry Point (COMPLETED)
Goal: Help users pull down an existing remote pile and enable sync.

Tasks:
- [x] In Home, add “Import Cloud Pile” dialog (fields: `remote_pile_id`, `destination folder`, `pile name`)
- [x] Create pile folder and add to config via `createPile(name, basePath)`
- [x] Call `migrateCloudPile(remoteId, destFolder)` and show basic progress/errors
- [x] Navigate to the imported pile on success (sync already linked by migration)

Validation:
- Existing cloud piles import successfully; status shows linked and initial sync (manual check pending)

---

### ✅ Phase 6 — Tests (BASIC COMPLETE)
Goal: Cover key UI logic with Jest + Testing Library.

Tasks:
- [x] Mock `window.electron.sync` and `window.electron.store` in tests
- [x] Tests for Settings `PileSync`: link flow and state refresh
- [x] Test for Status Pill: renders pending count when `queueLen>0`
- [x] Test for Conflicts: invoking `resolveConflict('local')`

Files:
- [x] `src/__tests__/sync-ui.test.jsx`

Notes:
- Broader suite has pre‑existing failures unrelated to sync UI; run targeted: `npm test -- src/__tests__/sync-ui.test.jsx`.
- Consider adding `@testing-library/jest-dom` setup if needed by other tests.

---

## Notes & Prerequisites
- Ensure the user is authenticated before enabling sync; otherwise `linkPile`/`runSync` will fail.
- Use renderer path alias `renderer/...` and SCSS modules per repo conventions.
- Keep Supabase access in main; renderer only calls the preload‑exposed methods.
- Consider adding a `run` alias in preload later for parity with older docs; current API is `runSync`.
- Initial bootstrap: when linking, the watcher now emits "add" for existing files (ignoreInitial=false), so posts are enqueued for push on first "Sync Now".
