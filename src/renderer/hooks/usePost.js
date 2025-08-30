import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import { useIndexContext } from 'renderer/context/IndexContext';
import * as fileOperations from '../utils/fileOperations';
import {
  getPost,
  cycleColorCreator,
  tagActionsCreator,
  attachToPostCreator,
  detachFromPostCreator,
  setHighlightCreator,
} from './usePostHelpers';

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
    highlight: null,
    highlightColor: null,
    tags: [],
    replies: [],
    attachments: [],
    isReply: false,
    isAI: false,
    // summarization
    isSummarized: false,
    summaryStale: false,
    summary: null,
  },
};

function usePost(
  postPath = null, // relative path
  {
    isReply = false,
    isAI = false,
    parentPostPath = null, // relative path
    reloadParentPost = () => {},
  } = {},
) {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { addIndex, removeIndex, refreshIndex, updateIndex, prependIndex } =
    useIndexContext();
  const [updates, setUpdates] = useState(0);
  const [path, setPath] = useState(); // absolute path
  const [post, setPost] = useState({ ...defaultPost });

  useEffect(() => {
    if (!postPath) return;
    const fullPath = window.electron.joinPath(getCurrentPilePath(), postPath);
    setPath(fullPath);
  }, [postPath, currentPile]);

  useEffect(() => {
    if (!path) return;
    refreshPost();
  }, [path]);

  const refreshPost = useCallback(async () => {
    if (!path) return;
    const freshPost = await getPost(path);
    setPost(freshPost);
  }, [path]);

  const savePost = useCallback(
    async (dataOverrides = {}, contentOverride = undefined) => {
      console.time('post-time');

      const saveToPath =
        path || fileOperations.getFilePathForNewPost(currentPile.path);
      const directoryPath = fileOperations.getDirectoryPath(saveToPath);
      const now = new Date().toISOString();
      const content = contentOverride !== undefined ? contentOverride : post.content;
      const data = {
        ...post.data,
        isAI: post.data.isAI === true ? post.data.isAI : isAI,
        isReply: post.data.createdAt ? post.data.isReply : isReply,
        createdAt: post.data.createdAt ?? now,
        updatedAt: now,
        ...dataOverrides,
      };

      // If editing a non-reply post that is currently summarized, mark summary stale
      if (!isReply && data.isSummarized && dataOverrides.summary === undefined) {
        data.summaryStale = true;
      }

      try {
        const fileContents = await fileOperations.generateMarkdown(content, data);

        await fileOperations.createDirectory(directoryPath);
        await fileOperations.saveFile(saveToPath, fileContents);

        if (isReply) {
          // Compute a reliable relative path for the new reply
          const postRelativePath = saveToPath.replace(
            getCurrentPilePath() + window.electron.pathSeparator,
            '',
          );
          await addReplyToParent(parentPostPath, postRelativePath);
        }

        const postRelativePath = saveToPath.replace(
          getCurrentPilePath() + window.electron.pathSeparator,
          '',
        );
        prependIndex(postRelativePath, data); // Add the file to the index
        addIndex(postRelativePath, parentPostPath); // Add the file to the index
        window.electron.ipc.invoke('tags-sync', saveToPath); // Sync tags
        console.timeEnd('post-time');
      } catch (error) {
        console.error(`Error writing file: ${saveToPath}`);
        console.error(error);
      }
    },
    [path, post, reloadParentPost],
  );

  const addReplyToParent = async (parentPostPath, replyPostPath) => {
    // Ensure we always store a relative path in parent.replies
    let relativeReplyPath = replyPostPath;
    const rootPath = getCurrentPilePath();
    if (replyPostPath.startsWith(rootPath)) {
      relativeReplyPath = replyPostPath.replace(
        rootPath + window.electron.pathSeparator,
        '',
      );
    }
    const fullParentPostPath = getCurrentPilePath(parentPostPath);
    const parentPost = await getPost(fullParentPostPath);
    const { content } = parentPost;
    // Prevent duplicate replies
    const existingReplies = parentPost.data.replies || [];
    const newReplies = existingReplies.includes(relativeReplyPath) 
      ? existingReplies 
      : [...existingReplies, relativeReplyPath];
      
    console.log('Adding reply to parent:', {
      parentPostPath,
      relativeReplyPath,
      existingReplies,
      isDuplicate: existingReplies.includes(relativeReplyPath)
    });
    
    const data = {
      ...parentPost.data,
      replies: newReplies,
      // If the parent was summarized, mark it stale due to new reply
      summaryStale: parentPost.data.isSummarized ? true : parentPost.data.summaryStale,
    };
    const fileContents = await fileOperations.generateMarkdown(content, data);
    await fileOperations.saveFile(fullParentPostPath, fileContents);
    updateIndex(parentPostPath, data);
    reloadParentPost(parentPostPath);
  };

  const deletePost = useCallback(async () => {
    if (!postPath) return null;
    const fullPostPath = getCurrentPilePath(postPath);

    // if reply, remove from parent
    if (post.data.isReply && parentPostPath) {
      const fullParentPostPath = getCurrentPilePath(parentPostPath);
      const parentPost = await getPost(fullParentPostPath);
      const { content } = parentPost;
      const newReplies = parentPost.data.replies.filter((p) => {
        return p !== postPath;
      });
      const data = {
        ...parentPost.data,
        replies: newReplies,
      };
      const fileContents = await fileOperations.generateMarkdown(content, data);
      await fileOperations.saveFile(fullParentPostPath, fileContents);
      await reloadParentPost();
    }

    // delete file and remove from index
    await fileOperations.deleteFile(fullPostPath);
    removeIndex(postPath);
  }, [postPath, reloadParentPost, parentPostPath, post]);

  const postActions = useMemo(
    () => ({
      setContent: (content) => setPost((post) => ({ ...post, content })),
      updateData: (data) =>
        setPost((post) => ({ ...post, data: { ...post.data, ...data } })),
      cycleColor: cycleColorCreator(post, setPost, savePost, highlightColors),
      setHighlight: setHighlightCreator(post, setPost, savePost),
      addTag: tagActionsCreator(setPost, 'add'),
      removeTag: tagActionsCreator(setPost, 'remove'),
      attachToPost: attachToPostCreator(setPost, getCurrentPilePath),
      detachFromPost: detachFromPostCreator(setPost, getCurrentPilePath),
      resetPost: () => setPost(defaultPost),
    }),
    [post],
  );

  return {
    defaultPost,
    post,
    savePost,
    refreshPost,
    deletePost,
    ...postActions,
  };
}

export default usePost;
