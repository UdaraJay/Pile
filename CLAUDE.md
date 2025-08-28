# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Development Commands

### Installation & Setup
```bash
npm install --legacy-peer-deps  # Install dependencies (required for React 19 compatibility)
```

### Development Workflow
```bash
npm start              # Start development server with hot reload
npm run prestart       # Build main process for development
npm run start:main     # Start main process with file watching
npm run start:renderer # Start renderer process dev server
```

### Build & Package
```bash
npm run build         # Production build (main + renderer)
npm run build:main    # Build main process only
npm run build:renderer # Build renderer process only
npm run package       # Create distributable packages for mac/win
npm run release       # Build and publish to GitHub releases
```

### Code Quality
```bash
npm run lint          # Run ESLint on all files
npm run lint:fix      # Run ESLint with auto-fix
npm test              # Run Jest tests
```

### Debugging
```bash
npm run build:dll     # Build development DLL for faster rebuilds
npm run rebuild       # Rebuild native dependencies
```

## Architecture Overview

**PileBintang** is an Electron-based journaling app with AI integration built on a two-process architecture:

### Core Structure
- **Main Process** (`src/main/`): Node.js backend handling file operations, IPC, and system integration
- **Renderer Process** (`src/renderer/`): React frontend with TypeScript/JavaScript for UI
- **IPC Communication**: Secure Inter-Process Communication via `contextBridge`

### Key Directories
```
src/
├── main/                    # Electron main process
│   ├── main.ts             # Application entry point
│   ├── preload.ts          # Security bridge (contextBridge APIs)
│   ├── ipc.ts              # IPC handler registration
│   ├── handlers/           # Feature-specific IPC handlers
│   │   ├── file.ts         # File operations & pile management
│   │   ├── keys.ts         # API key management (encrypted)
│   │   ├── store.ts        # electron-store integration
│   │   └── ...             # tags, highlights, links, indexing
│   └── utils/              # Main process utilities
└── renderer/               # React frontend
    ├── App.jsx             # Root component with routing
    ├── pages/              # Main application views
    │   ├── Home/           # Pile selection interface
    │   ├── Pile/           # Main journaling interface
    │   └── CreatePile/     # Pile creation wizard
    ├── context/            # React Context providers
    │   ├── PilesContext.js # Core pile management state
    │   ├── AIContext.js    # AI integration (Gemini/Ollama)
    │   └── ...             # Other feature contexts
    └── hooks/              # Custom React hooks
```

### State Management
Uses React Context API with feature-specific contexts:
- **PilesContext**: Pile management, themes, file operations
- **AIContext**: AI model integration, API key handling, completions
- **ToastsContext**: Notification system
- **TagsContext**, **HighlightsContext**, etc.

### Data Storage
- **File Structure**: `Pile Directory/YYYY/MMM/YYMMDD-HHMMSS.md`
- **Format**: Markdown files with gray-matter frontmatter
- **Settings**: electron-store for persistent application settings
- **API Keys**: Encrypted storage via electron-store

## Key Components

### TipTap Editor Integration
- Rich text editing with markdown serialization
- Real-time AI response streaming integration
- Drag-and-drop file upload support
- Custom extensions for submit behavior

### AI Integration
- Dual provider support: Gemini 2.5 Pro + Ollama (local)
- Secure API key management with encryption
- Context-aware completions using journal history
- Streaming responses with token-by-token rendering

### IPC Security Model
- `contextBridge` isolates main/renderer processes
- Whitelisted APIs only - no direct Node.js access in renderer
- All file operations routed through secure IPC handlers

## Platform-Specific Features

### macOS
- Custom titlebar with traffic light positioning
- Vibrancy effects and transparent window backgrounds
- Native window behaviors and dock integration

### Windows/Linux  
- Custom window frame handling
- Cross-platform file system compatibility
- AppImage distribution for Linux

## Development Notes

### Dependencies
- Uses `--legacy-peer-deps` for React 19 compatibility
- Main dependencies: Electron 33.2.0, React 19, TipTap, @google/generative-ai
- Build system: Webpack with TypeScript compilation

### Testing
- Jest with jsdom environment for React components
- Testing Library for component testing
- Test files in `src/__tests__/` directory

### Build System
- Electron React Boilerplate (ERB) with custom webpack configs
- Hot reload for both main and renderer processes
- Production builds create platform-specific packages

### File Operations
All file operations go through IPC handlers in `src/main/handlers/file.ts`:
- Use `window.electron.file.*` APIs from renderer
- File paths are generated with timestamp-based organization
- Frontmatter metadata handled via gray-matter library

When working with this codebase:
1. File operations must use IPC - never direct filesystem access from renderer
2. Follow existing Context patterns for state management
3. TipTap editor customizations go in `src/renderer/pages/Pile/Editor/`
4. New IPC handlers should be added to `src/main/handlers/` and registered in `ipc.ts`

## Repository Guidelines (Contributor Quick Reference)

For the full guide, see AGENTS.md.

### Project Structure & Module Organization
- `src/main/`: Electron main process (boot, menu, IPC, filesystem).
- `src/renderer/`: React UI (pages, components, hooks, context, styles).
- `src/renderer/pages/Pile/`: Core features (Posts, Editor, CloudEditor, Search, Settings).
- `src/__tests__/`: Jest tests. `assets/`: icons/packaging. `.erb/`: build configs.

### Build, Test, and Development Commands
- `npm start`: Dev server + Electron.
- `npm test`: Jest (JSDOM).
- `npm run lint` / `npm run lint:fix`: Lint and auto‑fix.
- `npm run build`: Production bundles.
- `npm run package`: Local installers.
- `npm run release`: Build and publish.

### Coding Style & Naming
- TypeScript + modern JS; React function components with hooks.
- Prettier (single quotes), ESLint (Airbnb/ERB rules).
- SCSS Modules per component (e.g., `Component.module.scss`).
- Naming: PascalCase/CamelCase (e.g., `CloudEditor/index.jsx`, `usePost.js`).

### Testing Guidelines
- Jest + Testing Library; tests in `src/__tests__/` mirroring sources.
- Naming: `*.test.(js|jsx|ts|tsx)`; focus on user‑visible behavior.
- Run: `npm test` (use `--watch` locally).

### Commit & PR Guidelines
- Commits: small, descriptive; Conventional Commits encouraged (`feat:`, `fix:`, `refactor:`).
- Branches: short, task‑scoped (e.g., `feat/editor-shortcuts`).
- PRs: clear description, steps to test, UI screenshots/GIFs, linked issues; ensure lint/tests pass.

### Security & Configuration
- Keep secrets in `.env` (never commit). Supabase and optional AI keys should be scoped.
- Validate native/runtime changes with `npm run package` for macOS/Windows.
- Main process should avoid writing outside app data directories.
