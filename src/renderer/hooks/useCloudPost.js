import { useCallback, useEffect, useState } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import { useCloudPostsContext } from 'renderer/context/CloudPostsContext';
import { useIndexContext } from 'renderer/context/IndexContext';

const defaultPost = {
  content: '',
  data: {
    title: '',
    createdAt: null,
    updatedAt: null,
    tags: [],
    attachments: [],
    isCloudPost: true,
  },
};

function useCloudPost(postId = null) {
  const { currentPile } = usePilesContext();
  const {
    createCloudPost,
    updateCloudPost,
    deleteCloudPost,
    getCloudPost,
    cloudPosts,
  } = useCloudPostsContext();
  const { refreshIndex } = useIndexContext();

  const [post, setPost] = useState({ ...defaultPost });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isNew = !postId;

  // Load existing post
  useEffect(() => {
    if (postId) {
      loadPost(postId);
    }
  }, [postId]);

  const loadPost = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        // First try to find in local cache
        const cachedPost = cloudPosts.find((p) => p.id === id);

        if (cachedPost) {
          setPost({
            content: cachedPost.content,
            data: {
              title: cachedPost.title,
              createdAt: cachedPost.created_at,
              updatedAt: cachedPost.updated_at,
              tags: cachedPost.metadata?.tags || [],
              attachments: cachedPost.metadata?.attachments || [],
              isCloudPost: true,
              ...cachedPost.metadata,
            },
          });
        } else {
          // Fetch from Supabase if not in cache
          const cloudPost = await getCloudPost(id);
          if (cloudPost) {
            setPost({
              content: cloudPost.content,
              data: {
                title: cloudPost.title,
                createdAt: cloudPost.created_at,
                updatedAt: cloudPost.updated_at,
                tags: cloudPost.metadata?.tags || [],
                attachments: cloudPost.metadata?.attachments || [],
                isCloudPost: true,
                ...cloudPost.metadata,
              },
            });
          }
        }
      } catch (err) {
        console.error('Error loading cloud post:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [cloudPosts, getCloudPost],
  );

  const savePost = useCallback(
    async (dataOverrides = {}) => {
      if (!currentPile?.isCloudPile) {
        throw new Error('Cannot save cloud post: not a cloud pile');
      }

      setLoading(true);
      setError(null);

      try {
        const now = new Date().toISOString();
        const { content } = post;
        const data = {
          ...post.data,
          createdAt: post.data.createdAt ?? now,
          updatedAt: now,
          ...dataOverrides,
        };

        const metadata = {
          tags: data.tags || [],
          attachments: data.attachments || [],
          ...dataOverrides,
        };

        let savedPost;
        if (isNew) {
          // Create new cloud post
          savedPost = await createCloudPost(
            data.title || extractTitle(content),
            content,
            metadata,
          );
        } else {
          // Update existing cloud post
          savedPost = await updateCloudPost(postId, {
            title: data.title || extractTitle(content),
            content,
            metadata,
          });
        }

        if (savedPost) {
          setPost({
            content: savedPost.content,
            data: {
              title: savedPost.title,
              createdAt: savedPost.created_at,
              updatedAt: savedPost.updated_at,
              tags: savedPost.metadata?.tags || [],
              attachments: savedPost.metadata?.attachments || [],
              isCloudPost: true,
              ...savedPost.metadata,
            },
          });

          // Refresh the index to show the new/updated post
          refreshIndex();

          return savedPost;
        }
      } catch (err) {
        console.error('Error saving cloud post:', err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      post,
      currentPile,
      isNew,
      postId,
      createCloudPost,
      updateCloudPost,
      refreshIndex,
    ],
  );

  const deletePost = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    setError(null);

    try {
      await deleteCloudPost(postId);

      // Reset post state
      setPost({ ...defaultPost });

      // Refresh the index
      refreshIndex();

      return true;
    } catch (err) {
      console.error('Error deleting cloud post:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [postId, deleteCloudPost, refreshIndex]);

  const setContent = useCallback((newContent) => {
    setPost((prev) => ({
      ...prev,
      content: newContent,
    }));
  }, []);

  const addTag = useCallback((tag) => {
    setPost((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        tags: [...(prev.data.tags || []), tag],
      },
    }));
  }, []);

  const removeTag = useCallback((tagToRemove) => {
    setPost((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        tags: (prev.data.tags || []).filter((tag) => tag !== tagToRemove),
      },
    }));
  }, []);

  const resetPost = useCallback(() => {
    setPost({ ...defaultPost });
  }, []);

  // Helper function to extract title from content
  const extractTitle = (content) => {
    if (!content) return 'Untitled';
    const firstLine = content.split('\n')[0].trim();
    if (firstLine) return firstLine.substring(0, 100);
    return content.substring(0, 50).trim() || 'Untitled';
  };

  return {
    post,
    loading,
    error,
    isNew,
    savePost,
    deletePost,
    setContent,
    addTag,
    removeTag,
    resetPost,
    loadPost,
  };
}

export default useCloudPost;
