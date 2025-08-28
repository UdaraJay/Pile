Feature: Threads as Todos (Tag-Based)

- Treat a thread as a Todo via tags.
- Show a “Todo” or “Done” badge on threads based on tags.
- Add a “Mark done / Undo done” action in thread actions.
- Optional: “Todos” filter to show open Todos only.

Rules

- Todo tag: todo
- Done tag: done
- Open Todo: has todo and not done
- Done: has done (regardless of todo)

UI Requirements

- Badge on thread header:
    - “Todo” for open todos; “Done” for completed
    - Style to match existing pill/tag styles (same radius, font-size, spacing)
    - Colors:
    - Todo: background `var(--bg-tertiary)`, text `var(--secondary)`
    - Done: background `var(--base-green)`, text `var(--active-text)`
- Quick action button in thread actions:
    - If open todo: “Mark done” → add done
    - If done: “Undo done” → remove done
    - Use existing icon set (e.g., CheckIcon for done, RefreshIcon or SlashIcon for undo)
- Optional “Todos” filter (nav area):
    - Show only open todos (has todo and not done)
    - Show count badge of open todos in current pile

Scope Constraints

- Do not use Tiptap task list extensions.
- No schema changes. Use the existing tag system (add/remove todo/done).
- Maintain current theme variables and styling patterns; no new global colors.

Where to Integrate

- Cloud threads: src/renderer/pages/Pile/CloudEditor/index.jsx (has addTag, removeTag, post.data.tags)
- Thread list item UI: src/renderer/pages/Pile/Posts/... (where thread title/metadata is rendered)
- Optional filter: src/renderer/pages/Pile/Layout.jsx (nav area) + PileLayout.module.scss

Implementation Outline

- Add tag helpers:
    - File: src/renderer/utils/todoTags.ts
    - Exports:
    - `TODO_TAG = 'todo'`, `DONE_TAG = 'done'`
    - `isOpenTodo(tags: string[]): boolean`
    - `isDone(tags: string[]): boolean`
    - `markDone(addTag)`, `undoDone(removeTag)`, `toggleDone(addTag, removeTag, tags)`
- Status badge:
    - Files: src/renderer/components/StatusBadge/index.jsx, StatusBadge.module.scss
    - Props: kind: 'todo' | 'done', children
    - Reuse pill styling from existing tags (border-radius, padding, font-size)
    - Colors from theme variables above
- CloudEditor integration:
    - Compute isOpenTodo / isDone from post.data.tags
    - Render status badge next to thread title/metadata
    - Add action button in the actions group:
    - If open todo → “Mark done” → `markDone(addTag)`
    - If done → “Undo done” → `undoDone(removeTag)`
- List item integration:
    - In thread preview/list item, render the same badge in metadata row
- Optional “Todos” filter:
    - Add a pill/button in nav (near search)
    - Maintain local state (or context) to filter visible threads with predicate: tags.includes('todo')
&& !tags.includes('done')
    - Show open todo count in current pile

Files To Touch

- Add: src/renderer/utils/todoTags.ts
- Add: src/renderer/components/StatusBadge/index.jsx
- Add: src/renderer/components/StatusBadge/StatusBadge.module.scss
- Update: src/renderer/pages/Pile/CloudEditor/index.jsx (badge + action)
- Update: src/renderer/pages/Pile/Posts/... (badge in list UI)
- Optional: src/renderer/pages/Pile/Layout.jsx, PileLayout.module.scss (filter pill)

Acceptance Criteria

- A thread with todo shows “Todo” badge; with done shows “Done” badge.
- “Mark done” adds done; “Undo done” removes done. UI updates immediately.
- Badges and buttons match existing styles (pill shape, spacing, colors via variables).
- Optional “Todos” filter shows only open todos and displays an accurate count.
- Works in both light and dark themes without visual regressions.
