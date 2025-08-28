# Repository Guidelines

## Project Structure & Module Organization
- `src/main/`: Electron main process (app boot, menu, IPC, filesystem helpers).
- `src/renderer/`: React UI (pages, components, hooks, context, styles).
- `src/renderer/pages/Pile/`: Core features (Posts, Editor, CloudEditor, Search, Settings).
- `src/__tests__/`: Jest tests for renderer logic and hooks.
- `assets/`: Icons, entitlements, packaging resources. `.erb/`: build configs.

## Build, Test, and Development Commands
- `npm start`: Run the app in development (webpack dev server + Electron).
- `npm test`: Run Jest test suite in JSDOM.
- `npm run lint` / `npm run lint:fix`: Lint and auto‑fix issues.
- `npm run build`: Production bundles for main and renderer.
- `npm run package`: Create local installers (no publish).
- `npm run release`: Build and publish via electron‑builder.

## Coding Style & Naming Conventions
- Languages: TypeScript + modern JS, React function components with hooks.
- Formatting: Prettier (single quotes). Linting: ESLint (Airbnb/ERB rules).
- Styles: SCSS Modules per component (e.g., `Component.module.scss`).
- Naming: Components/contexts/hooks in PascalCase/CamelCase (e.g., `CloudEditor/index.jsx`, `usePost.js`).
- Imports: Use `renderer/...` alias for renderer paths (see Jest config).

## Testing Guidelines
- Frameworks: Jest + Testing Library (`@testing-library/react`, JSDOM).
- Location: `src/__tests__/` mirroring source layout.
- Naming: `*.test.(js|jsx|ts|tsx)`. Prefer user‑visible assertions and minimal mocks.
- Run: `npm test` (use `--watch` during development).

## Commit & Pull Request Guidelines
- Commits: Small, focused, descriptive. Conventional Commits encouraged (e.g., `feat:`, `fix:`, `refactor:`, `test:`).
- Branches: Short, task‑scoped names (e.g., `feat/editor-shortcuts`).
- PRs: Clear description, steps to test, screenshots/GIFs for UI, linked issues.
- CI hygiene: Ensure `npm test` and `npm run lint` pass before requesting review.

## Security & Configuration Tips
- Secrets: Store API keys in `.env` (never commit). The app integrates Supabase and optional AI providers; keep keys scoped and rotated.
- Electron: Test `npm run package` for macOS/Windows to verify native/runtime changes.
- Filesystem: Main process utilities should avoid writing outside app data dirs.

## Architecture Notes
- UI: React 19, Framer Motion for animation, Tiptap editor, SCSS Modules.
- Desktop: Electron 33 with electron‑builder for packaging.
- Data/Search: Local filesystem posts with indexing utilities; optional cloud via Supabase.
