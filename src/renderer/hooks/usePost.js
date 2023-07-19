import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import * as fileOperations from '../utils/fileOperations';
import { useIndexContext } from 'renderer/context/IndexContext';

const highlightColors = [
  'var(--border)',
  'var(--base-yellow)',
  'var(--base-green)',
];

const defaultPost = {
  content: '',
  data: {
    title: '',
    createdAt: null,
    updatedAt: null,
    highlightColor: null,
    tags: [],
    replies: [],
    attachments: [],
    isReply: false,
    isAi: false,
  },
};

function usePost(
  postPath = null,
  { isReply = false, isAI = false, parentPostPath = null } = {}
) {
  const { currentPile } = usePilesContext();
  const { addIndex } = useIndexContext();
  const [updates, setUpdates] = useState(0);
  const [path, setPath] = useState();
  const [post, setPost] = useState({ ...defaultPost });

  // Init
  useEffect(() => {
    if (!postPath) {
      return;
    }

    refreshPost(postPath);
    setPath(postPath);
  }, [postPath]);

  const refreshPost = useCallback(async (path) => {
    if (!path) return;

    const freshPost = await getPost(path);
    setPost(freshPost);
  }, []);

  const getPost = useCallback(async (postPath) => {
    try {
      if (!postPath) return;
      const fileContent = await window.electron.ipc.invoke(
        'get-file',
        postPath
      );

      const parsed = await window.electron.ipc.invoke(
        'matter-parse',
        fileContent
      );

      const post = { content: parsed.content, data: parsed.data };
      return post;
    } catch (error) {
      console.error(`Error reading/parsing file: ${postPath}`);
      console.error(error);
    }
  }, []);

  const setContent = (content) => {
    setPost((post) => {
      return { ...post, content };
    });
  };

  const updateData = (data) => {
    setPost((post) => {
      return { ...post, data: { ...post.data, ...data } };
    });
  };

  const cycleColor = () => {
    if (!post.data.highlightColor) {
      updateData({ highlightColor: highlightColors[1] });
      return;
    }

    const currentColor = post.data.highlightColor;
    const currentIndex = highlightColors.findIndex(
      (color) => color === currentColor
    );
    const nextIndex = (currentIndex + 1) % highlightColors.length;
    const nextColor = highlightColors[nextIndex];

    updateData({ highlightColor: nextColor });
    savePost();
  };

  const deletePost = useCallback(() => {
    // Delete the file
    // Remove from the index
  }, []);

  const addTag = useCallback(
    (tag) => {
      if (!post.data.tags.includes(tag)) {
        setPost((post) => {
          let newPost = {
            ...post,
            data: {
              ...post.data,
              tags: [...post.data.tags, tag],
            },
          };

          return newPost;
        });
      }
    },
    [currentPile]
  );

  const removeTag = useCallback(
    (tag) => {
      // remove tag logic
      // make a call to clear this tag
      // from the tag cache if it's not new
      if (post.data.tags.includes(tag)) {
        let newPost = {
          ...post,
          data: {
            ...post.data,
            tags: post.data.tags.filter((t) => t !== tag),
          },
        };

        setPost(newPost);
      }
    },
    [currentPile]
  );

  const attachToPost = useCallback(async () => {
    const storePath = window.electron.joinPath(
      currentPile.path,
      currentPile.name
    );

    const newAttachments = await window.electron.ipc.invoke('open-file', {
      storePath: storePath,
    });

    // Attachments are stored relative to the base path from the
    // base directory of the pile
    const correctedPaths = newAttachments.map((path) => {
      const pathArr = path.split('/').slice(-4);
      const newPath = window.electron.joinPath(...pathArr);

      return newPath;
    });

    setPost((post) => {
      const attachments = [...post.data.attachments, ...correctedPaths];
      const newPost = {
        ...post,
        data: { ...post.data, attachments },
      };

      console.log('Attachments added', correctedPaths);
      return newPost;
    });
  }, [currentPile]);

  const detachFromPost = useCallback((attachmentPath) => {
    setPost((post) => {
      let newPost = JSON.parse(JSON.stringify(post));
      const newAtt = newPost.data.attachments.filter(
        (a) => a !== attachmentPath
      );

      newPost.data.attachments = newAtt;

      const fullPath = window.electron.joinPath(
        currentPile.path,
        currentPile.name,
        attachmentPath
      );

      window.electron.deleteFile(fullPath, (err) => {
        if (err) {
          console.error('There was an error:', err);
        } else {
          console.log('File was deleted successfully');
        }
      });

      console.log('Attachment removed', attachmentPath);

      return newPost;
    });
  }, []);

  const savePost = useCallback(async () => {
    const saveToPath = path
      ? path
      : fileOperations.getFilePathForNewPost(
          currentPile.path,
          currentPile.name
        );

    const directoryPath = fileOperations.getDirectoryPath(saveToPath);
    const now = new Date().toISOString();
    const content = post.content;
    const data = {
      ...post.data,
      isReply: post.data.createdAt ? post.data.isReply : isReply,
      createdAt: post.data.createdAt ?? now,
      updatedAt: now,
    };

    try {
      const fileContents = await fileOperations.generateMarkdown(content, data);
      await fileOperations.createDirectory(directoryPath);
      await fileOperations.saveFile(saveToPath, fileContents);

      console.log(`File successfully written to: ${saveToPath}`);

      if (isReply) {
        await addReplyToParent(parentPostPath, saveToPath);
      }

      // Add the file to the index
      addIndex(saveToPath);

      // Sync tags
      window.electron.ipc.invoke('tags-sync', saveToPath);
    } catch (error) {
      console.error(`Error writing file: ${saveToPath}`);
      console.error(error);
    }
  }, [path, post]);

  const addReplyToParent = async (parentPostPath, replyPostPath) => {
    const relativeReplyPath = replyPostPath.split('/').slice(-3).join('/');
    const parentPost = await getPost(parentPostPath);
    const content = parentPost.content;
    const data = {
      ...parentPost.data,
      replies: [...parentPost.data.replies, relativeReplyPath],
    };
    const fileContents = await fileOperations.generateMarkdown(content, data);
    await fileOperations.saveFile(parentPostPath, fileContents);
  };

  const resetPost = () => {
    console.log('resetting post', defaultPost);
    setPost(defaultPost);
  };

  return {
    defaultPost,
    post,
    savePost,
    setContent,
    cycleColor,
    addTag,
    removeTag,
    attachToPost,
    detachFromPost,
    resetPost,
  };
}

export default usePost;
