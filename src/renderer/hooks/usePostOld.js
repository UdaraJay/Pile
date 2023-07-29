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
    isAI: false,
  },
};

function usePost(
  postPath = null,
  {
    isReply = false,
    isAI = false,
    parentPostPath = null,
    reloadParentPost = () => {},
  } = {}
) {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { addIndex, removeIndex, refreshIndex } = useIndexContext();
  const [updates, setUpdates] = useState(0);
  const [path, setPath] = useState();
  const [post, setPost] = useState({ ...defaultPost });

  useEffect(() => {
    if (!postPath) return;
    refreshPost(postPath);
    setPath(postPath);
  }, [postPath]);

  const refreshPost = useCallback(async () => {
    if (!postPath) return;
    const freshPost = await getPost(postPath);
    setPost(freshPost);
  }, [postPath]);

  const getPost = useCallback(async (postPath) => {
    try {
      if (!postPath) return;
      const fileContent = await window.electron.ipc.invoke(
        'get-file',
        postPath
      );
      if (!fileContent) return null;
      const parsed = await window.electron.ipc.invoke(
        'matter-parse',
        fileContent
      );
      const post = { content: parsed.content, data: parsed.data };
      return post;
    } catch (error) {
      console.error(`Error reading/parsing file: ${postPath}`);
    }
  }, []);

  const setContent = (content) => {
    setPost((post) => {
      return { ...post, content };
    });
  };

  const updateData = useCallback((data) => {
    setPost((post) => {
      return { ...post, data: { ...post.data, ...data } };
    });
  }, []);

  const cycleColor = useCallback(() => {
    if (!post.data.highlightColor) {
      updateData({ highlightColor: highlightColors[1] });
      savePost({ highlightColor: highlightColors[1] });
      return;
    }
    const currentColor = post.data.highlightColor;
    const currentIndex = highlightColors.findIndex(
      (color) => color === currentColor
    );
    const nextIndex = (currentIndex + 1) % highlightColors.length;
    const nextColor = highlightColors[nextIndex];
    updateData({ highlightColor: nextColor });
    savePost({ highlightColor: nextColor });
  }, [post]);

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
    const storePath = getCurrentPilePath();
    const newAttachments = await window.electron.ipc.invoke('open-file', {
      storePath: storePath,
    });
    const correctedPaths = newAttachments.map((path) => {
      const pathArr = path.split('/').slice(-4);
      const newPath = window.electron.joinPath(...pathArr);

      return newPath;
    });
    setPost((post) => {
      const attachments = [...correctedPaths, ...post.data.attachments];
      const newPost = {
        ...post,
        data: { ...post.data, attachments },
      };
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
        getCurrentPilePath(),
        attachmentPath
      );
      window.electron.deleteFile(fullPath, (err) => {
        if (err) {
          console.error('There was an error:', err);
        } else {
          console.log('File was deleted successfully');
        }
      });
      return newPost;
    });
  }, []);

  const savePost = useCallback(
    async (dataOverrides) => {
      const saveToPath = path
        ? path
        : fileOperations.getFilePathForNewPost(currentPile.path);

      const directoryPath = fileOperations.getDirectoryPath(saveToPath);
      const now = new Date().toISOString();
      const content = post.content;
      const data = {
        ...post.data,
        isAI: post.data.isAI === true ? post.data.isAI : isAI,
        isReply: post.data.createdAt ? post.data.isReply : isReply,
        createdAt: post.data.createdAt ?? now,
        updatedAt: now,
        ...dataOverrides,
      };

      try {
        const fileContents = await fileOperations.generateMarkdown(
          content,
          data
        );
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
    },
    [path, post, reloadParentPost]
  );

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
    reloadParentPost(parentPostPath);
  };

  const resetPost = () => {
    setPost(defaultPost);
  };

  const deletePost = useCallback(async () => {
    if (!postPath) return null;

    // if is reply, remove from parent
    if (post.data.isReply && parentPostPath) {
      const parentPost = await getPost(parentPostPath);
      const content = parentPost.content;
      const newReplies = parentPost.data.replies.filter((p) => {
        return p !== postPath.split('/').slice(-3).join('/');
      });
      const data = {
        ...parentPost.data,
        replies: newReplies,
      };
      const fileContents = await fileOperations.generateMarkdown(content, data);
      await fileOperations.saveFile(parentPostPath, fileContents);
      await reloadParentPost(parentPostPath);
    }

    // delete file and remove from index
    await fileOperations.deleteFile(postPath);
    removeIndex(postPath);
  }, [postPath, reloadParentPost, parentPostPath, post]);

  return {
    defaultPost,
    post,
    savePost,
    refreshPost,
    setContent,
    cycleColor,
    addTag,
    removeTag,
    attachToPost,
    detachFromPost,
    resetPost,
    deletePost,
  };
}

export default usePost;
