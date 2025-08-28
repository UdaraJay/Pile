import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import { usePilesContext } from './PilesContext';
import { supabase } from '../lib/supabase';
import { useRealtimePost } from '../hooks/useRealtimePost';

const CloudPostsContext = createContext({});

export const useCloudPostsContext = () => {
  const context = useContext(CloudPostsContext);
  if (!context) {
    throw new Error(
      'useCloudPostsContext must be used within a CloudPostsProvider',
    );
  }
  return context;
};

export function CloudPostsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { currentPile } = usePilesContext();

  const [cloudPosts, setCloudPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Real-time post synchronization handler
  const handleRealtimePostUpdate = useCallback((update) => {
    console.log('Processing realtime post update:', update);
    
    switch (update.type) {
      case 'created':
        // Transform new post and add to local state
        const newPost = {
          ...update.post,
          path: `cloud://${update.post.id}`,
          hash: update.post.id,
          isCloudPost: true,
          created: update.post.created_at,
          lastModified: update.post.updated_at,
          metadata: update.post.metadata || {},
        };
        
        setCloudPosts(prev => {
          // Avoid duplicates
          const exists = prev.some(post => post.id === newPost.id);
          return exists ? prev : [newPost, ...prev];
        });
        break;
        
      case 'updated':
        // Update existing post in local state
        setCloudPosts(prev => 
          prev.map(post => 
            post.id === update.post.id
              ? {
                  ...update.post,
                  path: `cloud://${update.post.id}`,
                  hash: update.post.id,
                  isCloudPost: true,
                  created: update.post.created_at,
                  lastModified: update.post.updated_at,
                  metadata: update.post.metadata || {},
                }
              : post
          )
        );
        break;
        
      case 'deleted':
        // Remove deleted post from local state
        setCloudPosts(prev => 
          prev.filter(post => post.id !== update.post.id)
        );
        break;
        
      default:
        console.warn('Unknown realtime update type:', update.type);
    }
  }, []);

  // Set up real-time subscriptions for current pile
  const realtimeData = useRealtimePost(
    currentPile?.isCloudPile ? currentPile.id : null,
    handleRealtimePostUpdate
  );

  // Load posts when pile changes
  useEffect(() => {
    if (isAuthenticated && currentPile?.isCloudPile) {
      loadCloudPosts();
    } else {
      setCloudPosts([]);
    }
  }, [isAuthenticated, currentPile]);

  const loadCloudPosts = useCallback(async () => {
    if (!isAuthenticated || !currentPile?.isCloudPile) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('pile_id', currentPile.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform cloud posts to match local post structure
      const transformedPosts = data.map((post) => ({
        ...post,
        // Add fields that match the local post structure
        path: `cloud://${post.id}`,
        hash: post.id,
        isCloudPost: true,
        // Convert to format expected by the UI
        title: post.title,
        content: post.content,
        created: post.created_at,
        lastModified: post.updated_at,
        metadata: post.metadata || {},
      }));

      setCloudPosts(transformedPosts);
    } catch (err) {
      console.error('Error loading cloud posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentPile]);

  const createCloudPost = useCallback(
    async (title, content, metadata = {}) => {
      if (!isAuthenticated || !currentPile?.isCloudPile) {
        throw new Error(
          'Cannot create cloud post: not authenticated or not a cloud pile',
        );
      }

      try {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            pile_id: currentPile.id,
            title: title || extractTitle(content),
            content,
            metadata: {
              ...metadata,
              createdBy: 'pilebintang',
              version: '1.0.0',
            },
          })
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        const transformedPost = {
          ...data,
          path: `cloud://${data.id}`,
          hash: data.id,
          isCloudPost: true,
          created: data.created_at,
          lastModified: data.updated_at,
          metadata: data.metadata || {},
        };

        setCloudPosts((prev) => [transformedPost, ...prev]);
        return transformedPost;
      } catch (err) {
        console.error('Error creating cloud post:', err);
        throw err;
      }
    },
    [user, currentPile, isAuthenticated],
  );

  const updateCloudPost = useCallback(
    async (postId, updates) => {
      if (!isAuthenticated || !currentPile?.isCloudPile) {
        throw new Error(
          'Cannot update cloud post: not authenticated or not a cloud pile',
        );
      }

      try {
        const { data, error } = await supabase
          .from('posts')
          .update({
            ...updates,
            title: updates.title || extractTitle(updates.content),
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setCloudPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...data,
                  path: `cloud://${data.id}`,
                  hash: data.id,
                  isCloudPost: true,
                  created: data.created_at,
                  lastModified: data.updated_at,
                  metadata: data.metadata || {},
                }
              : post,
          ),
        );

        return data;
      } catch (err) {
        console.error('Error updating cloud post:', err);
        throw err;
      }
    },
    [user, currentPile, isAuthenticated],
  );

  const deleteCloudPost = useCallback(
    async (postId) => {
      if (!isAuthenticated || !currentPile?.isCloudPile) {
        throw new Error(
          'Cannot delete cloud post: not authenticated or not a cloud pile',
        );
      }

      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', user.id);

        if (error) throw error;

        // Remove from local state
        setCloudPosts((prev) => prev.filter((post) => post.id !== postId));
        return true;
      } catch (err) {
        console.error('Error deleting cloud post:', err);
        throw err;
      }
    },
    [user, isAuthenticated],
  );

  const getCloudPost = useCallback(
    async (postId) => {
      if (!isAuthenticated) return null;

      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error fetching cloud post:', err);
        return null;
      }
    },
    [isAuthenticated],
  );

  // Helper function to extract title from content
  const extractTitle = (content) => {
    if (!content) return 'Untitled';
    const firstLine = content.split('\n')[0].trim();
    if (firstLine) return firstLine.substring(0, 100);
    return content.substring(0, 50).trim() || 'Untitled';
  };

  // Convert cloud posts to index-compatible format for the UI
  const getCloudPostsAsIndex = useCallback(() => {
    return cloudPosts.map((post) => {
      return [
        `cloud://${post.id}`,
        {
          title: post.title,
          created: post.created_at,
          lastModified: post.updated_at,
          updatedAt: post.updated_at,
          path: `cloud://${post.id}`,
          hash: post.id,
          isCloudPost: true,
          isReply: false, // Cloud posts are always parent posts for now
          height: 200, // Estimated height for virtual list
          metadata: post.metadata,
        },
      ];
    });
  }, [cloudPosts]);

  const value = {
    // State
    cloudPosts,
    loading,
    error,

    // Actions
    loadCloudPosts,
    createCloudPost,
    updateCloudPost,
    deleteCloudPost,
    getCloudPost,

    // Utils
    getCloudPostsAsIndex,
    isCloudPile: currentPile?.isCloudPile || false,

    // Real-time data
    isRealtimeConnected: realtimeData.isConnected,
    activeUsers: realtimeData.activeUsers,
    cursorPositions: realtimeData.cursorPositions,
    broadcastCursor: realtimeData.broadcastCursor,
  };

  return (
    <CloudPostsContext.Provider value={value}>
      {children}
    </CloudPostsContext.Provider>
  );
}

export default CloudPostsContext;
