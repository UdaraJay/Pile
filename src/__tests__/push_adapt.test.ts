import '@testing-library/jest-dom';

// Mock Supabase in main process to simulate missing columns
jest.mock('../main/lib/supabase', () => {
  const mockSelect = (cols: string) => ({
    limit: () => {
      // Simulate errors for non-existent columns
      if (cols.includes('content_md') || cols.includes('user_id') || cols.includes('etag')) {
        return Promise.resolve({ data: null, error: { message: 'column does not exist' } });
      }
      return Promise.resolve({ data: null, error: null });
    },
  });
  return {
    supabase: {
      from: () => ({ select: mockSelect }),
      auth: {
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'user-1' } } } }),
      },
    },
  };
});

describe('push payload adapts to schema without content_md and etag', () => {
  it('excludes content_md, user_id, etag when columns are missing and writes markdown to content', async () => {
    const { buildPostUpsertPayload } = await import('../main/sync/push');
    const payload = await buildPostUpsertPayload(
      { title: 'Hello' },
      '# Markdown',
      'pile-123',
      'post-abc',
      'sha123'
    );

    expect(payload).toMatchObject({
      id: 'post-abc',
      pile_id: 'pile-123',
      title: 'Hello',
      content: '# Markdown',
    });
    expect(payload).not.toHaveProperty('content_md');
    expect(payload).not.toHaveProperty('etag');
    expect(payload).not.toHaveProperty('user_id');
  });
});

