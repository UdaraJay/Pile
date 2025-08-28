import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToPostChanges, 
  subscribeToPresence,
  broadcastCursorPosition,
  subscribeToCursorUpdates,
  unsubscribeFromChannel 
} from '../lib/supabase';

export const useRealtimePost = (pileId, onPostUpdate) => {
  const { user, isAuthenticated } = useAuth();
  const [presenceState, setPresenceState] = useState({});
  const [cursorPositions, setCursorPositions] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  
  const postsChannelRef = useRef(null);
  const presenceChannelRef = useRef(null);

  // Handle real-time post changes
  const handlePostChange = useCallback((payload) => {
    console.log('Real-time post change:', payload);
    
    switch (payload.eventType) {
      case 'INSERT':
        onPostUpdate?.({
          type: 'created',
          post: payload.new
        });
        break;
      case 'UPDATE':
        onPostUpdate?.({
          type: 'updated',
          post: payload.new,
          oldPost: payload.old
        });
        break;
      case 'DELETE':
        onPostUpdate?.({
          type: 'deleted',
          post: payload.old
        });
        break;
      default:
        console.warn('Unknown post change event:', payload.eventType);
    }
  }, [onPostUpdate]);

  // Handle presence state changes
  const presenceCallbacks = {
    onPresenceSync: useCallback((state) => {
      console.log('Presence sync:', state);
      setPresenceState(state);
    }, []),
    
    onPresenceJoin: useCallback((key, newPresences) => {
      console.log('User joined:', key, newPresences);
    }, []),
    
    onPresenceLeave: useCallback((key, leftPresences) => {
      console.log('User left:', key, leftPresences);
    }, [])
  };

  // Handle cursor position broadcasts
  const handleCursorMove = useCallback((payload) => {
    const { user_id, position, selection } = payload.payload;
    
    if (user_id !== user?.id) {
      setCursorPositions(prev => ({
        ...prev,
        [user_id]: {
          position,
          selection,
          timestamp: Date.now()
        }
      }));
    }
  }, [user?.id]);

  // Broadcast cursor position
  const broadcastCursor = useCallback((position, selection) => {
    if (pileId && user?.id && isConnected) {
      broadcastCursorPosition(pileId, {
        user_id: user.id,
        position,
        selection,
        timestamp: Date.now()
      });
    }
  }, [pileId, user?.id, isConnected]);

  // Set up real-time subscriptions when pile changes
  useEffect(() => {
    if (!pileId || !isAuthenticated || !user?.id) {
      return;
    }

    console.log(`Setting up real-time subscriptions for pile: ${pileId}`);

    // Subscribe to post changes
    postsChannelRef.current = subscribeToPostChanges(pileId, {
      onPostChange: handlePostChange
    });

    // Subscribe to presence and cursor updates
    presenceChannelRef.current = subscribeToPresence(pileId, user.id, presenceCallbacks);
    
    // Set up cursor position listening
    subscribeToCursorUpdates(pileId, handleCursorMove);

    setIsConnected(true);

    return () => {
      console.log(`Cleaning up real-time subscriptions for pile: ${pileId}`);
      
      // Clean up subscriptions
      if (postsChannelRef.current) {
        unsubscribeFromChannel(`posts_${pileId}`);
        postsChannelRef.current = null;
      }
      
      if (presenceChannelRef.current) {
        unsubscribeFromChannel(`presence_${pileId}`);
        presenceChannelRef.current = null;
      }
      
      setIsConnected(false);
      setPresenceState({});
      setCursorPositions({});
    };
  }, [pileId, isAuthenticated, user?.id, handlePostChange, handleCursorMove]);

  // Clean up old cursor positions (remove stale ones after 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursorPositions(prev => {
        const filtered = Object.entries(prev).reduce((acc, [userId, data]) => {
          if (now - data.timestamp < 10000) { // Keep positions less than 10s old
            acc[userId] = data;
          }
          return acc;
        }, {});
        
        return Object.keys(filtered).length !== Object.keys(prev).length ? filtered : prev;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Get list of currently active users
  const getActiveUsers = useCallback(() => {
    return Object.entries(presenceState).flatMap(([key, presences]) =>
      presences.map(presence => ({
        userId: presence.user_id,
        onlineAt: presence.online_at,
        pileId: presence.pile_id
      }))
    );
  }, [presenceState]);

  return {
    // Connection state
    isConnected,
    
    // Presence data
    presenceState,
    activeUsers: getActiveUsers(),
    
    // Cursor positions from other users
    cursorPositions,
    
    // Functions to broadcast cursor position
    broadcastCursor,
  };
};

export default useRealtimePost;