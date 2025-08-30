# Project Checkpoint: Summarize/Outline Feature and Sync

## Summary
- Added Summarize/Outline for threads with AI (Gemini) JSON output.
- Summary renders as a separate block above the thread; thread can be toggled.
- Cloud sync enabled for summary via `posts.meta` JSONB (Option A).
- Improved UX (spinner/toasts/errors), alignment, light/dark colors.
- Removed tag feature per latest direction.

## Current Behavior
- Button: "Summarize" creates a summary, saves to frontmatter, sets `isSummarized=true`.
- Summary block (prepend):
  - Shows label "Summary", title, italic paragraph, optional mood/confidence, and a divider.
  - Only a paragraph is shown (no bullet points).
- When summarized: conversation (editor + replies) is hidden by default.
  - Actions show: Resummarize (if stale), View/Hide Conversation, Unpin Summary, Think Deeper, Delete Thread.
  - View/Hide toggles conversation visibility below the summary block.
- Unpin Summary: sets `isSummarized=false`; summary stays stored.
- New replies or edits mark summary stale without removing it (Resummarize CTA appears).

## Data Model (frontmatter)
- `isSummarized: boolean`
- `summaryStale: boolean`
- `summary: { title, summary, mood, confidence, keyPoints? (unused), createdAt, model }`

## Prompting (Gemini JSON)
- Renderer builds a single-paragraph summary prompt (English):
  - First-person, no meta, no user/assistant mentions.
  - Summary must be 1–3 sentences with concrete context (people, places, books, tasks).
  - `keyThemes` must be an empty array (ignored by UI).
- IPC handlers and JSON parsing already exist; we reuse `gemini:generate-json`.

## UI Details
- Actions: spinner and toasts for Summarize/Resummarize; disabled state when running.
- Alignment: summary block (label/title/paragraph/meta) aligned with thread content gutter.
- Colors: summary uses `var(--primary)` so it works in both light/dark.
- Header overlay fix: `.header { pointer-events: none }` with interactive children re-enabled.
- Actions bar wraps on small widths; z-index elevated to keep buttons clickable.

## Cloud Sync (Option A)
- Migration applied: `alter table public.posts add column if not exists meta jsonb;`
- Push: includes `{ isSummarized, summaryStale, summary }` into `posts.meta` when syncing.
- Pull: merges `posts.meta` back into frontmatter locally so summary follows to other devices.
- Immediate sync after Summarize/Unpin to push quickly when linked.

## Files Touched (high-level)
- Renderer:
  - `src/renderer/pages/Pile/Posts/Post/index.jsx` — main integration, actions, toggles, immediate sync.
  - `src/renderer/pages/Pile/Posts/Post/OutlineView.jsx|.module.scss` — summary block, styles, alignment.
  - `src/renderer/hooks/usePost.js` — marking summary stale on edit/new reply.
  - `src/renderer/utils/fileOperations.js` — added default fields.
  - Removed tag-related components per latest request.
- Main:
  - `src/main/ai/gemini.ts` — template limits adjusted.
  - `src/main/utils/jsonParser.ts` — safer lengths and more items (legacy; now `keyThemes` unused).
  - `src/main/sync/push.ts` — posts.meta probe and payload inclusion.
  - `src/main/sync/pull.ts` — posts.meta merged back to frontmatter.
  - Migration applied via MCP (see above SQL).

## Known Notes
- If a pile isn’t linked to cloud, summary remains local (still functional).
- If `posts.meta` didn’t exist in a different environment, summaries won’t sync there until migration is applied.
- HMR can sometimes cause React hook warnings; restart `npm start` to clear.

## Next Steps (optional)
- Add a small cloud status indicator near Summary label (Local vs Synced).
- Add a Settings toggle for terminal-like global font (`:root.terminalFont`).
- Add a divider/spacing tune if you want a more pronounced separation.

