import { renderHook, act } from '@testing-library/react';
import { useRealtimePost } from '../../renderer/hooks/useRealtimePost';

// Mock the Supabase client and auth context
jest.mock('../../renderer/lib/supabase', () => ({
  subscribeToPostChanges: jest.fn(),
  subscribeToPresence: jest.fn(),
  broadcastCursorPosition: jest.fn(),
  subscribeToCursorUpdates: jest.fn(),
  unsubscribeFromChannel: jest.fn(),
}));

jest.mock('../../renderer/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    isAuthenticated: true,
  }),
}));

describe('useRealtimePost', () => {
  const mockOnPostUpdate = jest.fn();
  const mockPileId = 'test-pile-123';

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
  });

  test('should initialize with default state', () => {
    const { result } = renderHook(() => 
      useRealtimePost(mockPileId, mockOnPostUpdate)
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.presenceState).toEqual({});
    expect(result.current.cursorPositions).toEqual({});
    expect(result.current.activeUsers).toEqual([]);
    expect(typeof result.current.broadcastCursor).toBe('function');
  });

  test('should setup subscriptions when pileId is provided', () => {
    const { subscribeToPostChanges, subscribeToPresence } = require('../../renderer/lib/supabase');
    
    renderHook(() => useRealtimePost(mockPileId, mockOnPostUpdate));

    expect(subscribeToPostChanges).toHaveBeenCalledWith(
      mockPileId,
      expect.objectContaining({
        onPostChange: expect.any(Function),
      })
    );

    expect(subscribeToPresence).toHaveBeenCalledWith(
      mockPileId,
      'test-user-123',
      expect.objectContaining({
        onPresenceSync: expect.any(Function),
        onPresenceJoin: expect.any(Function),
        onPresenceLeave: expect.any(Function),
      })
    );
  });

  test('should not setup subscriptions when pileId is null', () => {
    const { subscribeToPostChanges, subscribeToPresence } = require('../../renderer/lib/supabase');
    
    renderHook(() => useRealtimePost(null, mockOnPostUpdate));

    expect(subscribeToPostChanges).not.toHaveBeenCalled();
    expect(subscribeToPresence).not.toHaveBeenCalled();
  });

  test('should handle post changes correctly', () => {
    const { subscribeToPostChanges } = require('../../renderer/lib/supabase');
    let postChangeCallback;

    subscribeToPostChanges.mockImplementation((pileId, callbacks) => {
      postChangeCallback = callbacks.onPostChange;
      return { unsubscribe: jest.fn() };
    });

    renderHook(() => useRealtimePost(mockPileId, mockOnPostUpdate));

    // Simulate a post creation event
    act(() => {
      postChangeCallback({
        eventType: 'INSERT',
        new: { id: '1', title: 'New Post', content: 'Content' }
      });
    });

    expect(mockOnPostUpdate).toHaveBeenCalledWith({
      type: 'created',
      post: { id: '1', title: 'New Post', content: 'Content' }
    });

    // Simulate a post update event
    act(() => {
      postChangeCallback({
        eventType: 'UPDATE',
        new: { id: '1', title: 'Updated Post', content: 'Updated Content' },
        old: { id: '1', title: 'Old Post', content: 'Old Content' }
      });
    });

    expect(mockOnPostUpdate).toHaveBeenCalledWith({
      type: 'updated',
      post: { id: '1', title: 'Updated Post', content: 'Updated Content' },
      oldPost: { id: '1', title: 'Old Post', content: 'Old Content' }
    });

    // Simulate a post deletion event
    act(() => {
      postChangeCallback({
        eventType: 'DELETE',
        old: { id: '1', title: 'Deleted Post', content: 'Deleted Content' }
      });
    });

    expect(mockOnPostUpdate).toHaveBeenCalledWith({
      type: 'deleted',
      post: { id: '1', title: 'Deleted Post', content: 'Deleted Content' }
    });
  });

  test('should handle presence state changes', () => {
    const { subscribeToPresence } = require('../../renderer/lib/supabase');
    let presenceCallbacks;

    subscribeToPresence.mockImplementation((pileId, userId, callbacks) => {
      presenceCallbacks = callbacks;
      return { unsubscribe: jest.fn() };
    });

    const { result } = renderHook(() => 
      useRealtimePost(mockPileId, mockOnPostUpdate)
    );

    // Simulate presence sync
    const mockPresenceState = {
      'user1': [{ user_id: 'user1', online_at: '2024-01-01T00:00:00Z' }],
      'user2': [{ user_id: 'user2', online_at: '2024-01-01T00:01:00Z' }]
    };

    act(() => {
      presenceCallbacks.onPresenceSync(mockPresenceState);
    });

    expect(result.current.presenceState).toEqual(mockPresenceState);
    expect(result.current.activeUsers).toHaveLength(2);
  });

  test('should broadcast cursor position', () => {
    const { broadcastCursorPosition } = require('../../renderer/lib/supabase');
    
    const { result } = renderHook(() => 
      useRealtimePost(mockPileId, mockOnPostUpdate)
    );

    // Mock connection state
    act(() => {
      result.current.isConnected = true;
    });

    const cursorData = { x: 100, y: 200 };
    const selectionData = { start: 0, end: 10 };

    act(() => {
      result.current.broadcastCursor(cursorData, selectionData);
    });

    expect(broadcastCursorPosition).toHaveBeenCalledWith(
      mockPileId,
      {
        user_id: 'test-user-123',
        position: cursorData,
        selection: selectionData,
        timestamp: expect.any(Number)
      }
    );
  });

  test('should clean up subscriptions on unmount', () => {
    const { unsubscribeFromChannel } = require('../../renderer/lib/supabase');
    const mockPostsChannel = { unsubscribe: jest.fn() };
    const mockPresenceChannel = { unsubscribe: jest.fn() };

    const { subscribeToPostChanges, subscribeToPresence } = require('../../renderer/lib/supabase');
    subscribeToPostChanges.mockReturnValue(mockPostsChannel);
    subscribeToPresence.mockReturnValue(mockPresenceChannel);

    const { unmount } = renderHook(() => 
      useRealtimePost(mockPileId, mockOnPostUpdate)
    );

    unmount();

    expect(unsubscribeFromChannel).toHaveBeenCalledWith(`posts_${mockPileId}`);
    expect(unsubscribeFromChannel).toHaveBeenCalledWith(`presence_${mockPileId}`);
  });

  test('should handle cursor position cleanup', (done) => {
    const { result } = renderHook(() => 
      useRealtimePost(mockPileId, mockOnPostUpdate)
    );

    // Add a stale cursor position
    act(() => {
      result.current.cursorPositions = {
        'other-user': {
          position: { x: 100, y: 100 },
          timestamp: Date.now() - 15000 // 15 seconds ago (stale)
        }
      };
    });

    // Wait for cleanup interval to run
    setTimeout(() => {
      expect(Object.keys(result.current.cursorPositions)).toHaveLength(0);
      done();
    }, 6000); // Wait 6 seconds for cleanup
  });
});