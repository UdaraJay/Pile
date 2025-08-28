import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock PilesContext to provide a stable local pile path
jest.mock('renderer/context/PilesContext', () => {
  return {
    usePilesContext: () => ({
      currentPile: { name: 'TestPile', path: '/tmp/pile' },
      getCurrentPilePath: () => '/tmp/pile',
      isAuthenticated: true,
    }),
  };
});

// Provide a minimal electron bridge on window
beforeEach(() => {
  global.window.electron = {
    sync: {
      getStatus: jest.fn(async (pilePath) => ({
        piles: [
          {
            pilePath,
            linked: false,
            queueLen: 0,
            conflictsCount: 0,
          },
        ],
      })),
      linkPile: jest.fn(async () => ({ linked: true })),
      unlinkPile: jest.fn(async () => ({ linked: false })),
      runSync: jest.fn(async () => ({ started: true })),
      listConflicts: jest.fn(async () => ({ conflicts: [] })),
      resolveConflict: jest.fn(async () => ({ ok: true })),
      getConflictArtifact: jest.fn(async () => ({ content: 'example' })),
    },
    store: {
      get: jest.fn(async () => false),
      set: jest.fn(async () => true),
    },
    ipc: { on: jest.fn(), removeAllListeners: jest.fn(), sendMessage: jest.fn() },
    joinPath: (...args) => args.join('/'),
    mkdir: jest.fn(async () => {}),
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('StatusPill', () => {
  it('renders queue count when pending items exist', async () => {
    const { default: StatusPill } = await import('renderer/components/Sync/StatusPill.jsx');
    // Override getStatus to return linked with queue
    window.electron.sync.getStatus.mockResolvedValueOnce({
      piles: [
        {
          pilePath: '/tmp/pile',
          linked: true,
          queueLen: 3,
          conflictsCount: 0,
          lastPullAt: new Date().toISOString(),
        },
      ],
    });

    render(<StatusPill />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
  });
});

describe('PileSync', () => {
  it('links a pile when clicking Enable Cloud Sync', async () => {
    const { default: PileSync } = await import('renderer/pages/Pile/Settings/PileSync/index.jsx');

    // First status: unlinked
    window.electron.sync.getStatus.mockResolvedValueOnce({
      piles: [
        { pilePath: '/tmp/pile', linked: false, queueLen: 0, conflictsCount: 0 },
      ],
    });
    // After link, status: linked
    window.electron.sync.getStatus.mockResolvedValueOnce({
      piles: [
        { pilePath: '/tmp/pile', linked: true, queueLen: 0, conflictsCount: 0 },
      ],
    });

    render(<PileSync />);

    const btn = await screen.findByRole('button', { name: /enable cloud sync/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(window.electron.sync.linkPile).toHaveBeenCalled();
    });
  });
});

describe('ConflictsPanel', () => {
  it('resolves using local when clicking Use Local', async () => {
    const { default: ConflictsPanel } = await import('renderer/pages/Pile/Settings/PileSync/Conflicts.jsx');

    window.electron.sync.listConflicts.mockResolvedValueOnce({
      conflicts: [
        {
          id: 'conf-1',
          postId: 'post-123',
          localPath: '/tmp/pile/posts/post-123.md',
          remotePath: 'remote://post-123',
          updatedAtLocal: new Date().toISOString(),
          updatedAtRemote: new Date().toISOString(),
        },
      ],
    });

    render(<ConflictsPanel />);

    const useLocal = await screen.findByRole('button', { name: /use local/i });
    fireEvent.click(useLocal);

    await waitFor(() => {
      expect(window.electron.sync.resolveConflict).toHaveBeenCalledWith(
        '/tmp/pile',
        'post-123',
        'local',
        undefined,
      );
    });
  });
});

