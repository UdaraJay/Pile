import { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { DateTime } from 'luxon';
import { postFormat } from 'renderer/utils/fileOperations';
import * as fileOperations from 'renderer/utils/fileOperations';
import { usePilesContext } from 'renderer/context/PilesContext';
import usePost from 'renderer/hooks/usePost';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AIIcon,
  EditIcon,
  NeedleIcon,
  PaperIcon,
  ReflectIcon,
  TrashIcon,
} from 'renderer/icons';
import { useTimelineContext } from 'renderer/context/TimelineContext';
import { useHighlightsContext } from 'renderer/context/HighlightsContext';
import { useAIContext } from 'renderer/context/AIContext';
import { useToastsContext } from 'renderer/context/ToastsContext';
import Ball from './Ball';
import Reply from './Reply';
import Editor from '../../Editor';
import useThread from 'renderer/hooks/useThread';
import { generateStructuredResponse } from 'renderer/utils/jsonHelper';
import OutlineView from './OutlineView';
import styles from './Post.module.scss';
import StatusBadge from 'renderer/components/StatusBadge';
import { isOpenTodo, isDone } from 'renderer/utils/todoTags';

const Post = memo(({ postPath, searchTerm = null, repliesCount = 0 }) => {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { highlights } = useHighlightsContext();
  const { validKey } = useAIContext();
  // const { setClosestDate } = useTimelineContext();
  const { post, cycleColor, refreshPost, setHighlight, deletePost } =
    usePost(postPath);
  const [hovering, setHover] = useState(false);
  const [replying, setReplying] = useState(false);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [editable, setEditable] = useState(false);
  const [aiApiKeyValid, setAiApiKeyValid] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState(null);

  // Check if the AI API key is valid
  useEffect(() => {
    const checkApiKeyValid = async () => {
      const valid = await validKey();
      setAiApiKeyValid(valid);
    };
    checkApiKeyValid();
  }, [validKey]);

  const closeReply = () => {
    setReplying(false);
    setIsAiReplying(false);
  };

  const toggleReplying = () => {
    if (replying) {
      // reset AI reply
      setIsAiReplying(false);
    }

    setReplying(!replying);
  };

  const toggleEditable = () => setEditable(!editable);
  const handleRootMouseEnter = () => setHover(true);
  const handleRootMouseLeave = () => setHover(false);
  const containerRef = useRef();

  // Listen for a request to open a user reply after AI completes (Think Deeper flow)
  useEffect(() => {
    const handler = (e) => {
      const { parentPostPath: target } = e.detail || {};
      if (!target) return;
      if (target === postPath) {
        console.log('open-user-reply event received for:', target);
        setIsAiReplying(false);
        // Only open reply if not already replying to prevent duplicates
        if (!replying) {
          setReplying(true);
          console.log('Opening user reply after AI completion');
        } else {
          console.log('Reply already open, ignoring duplicate event');
        }
      }
    };
    document.addEventListener('open-user-reply', handler);
    return () => document.removeEventListener('open-user-reply', handler);
  }, [postPath, replying]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      // Auto-reset confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }

    try {
      await deletePost();
      setDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete post:', error);
      setDeleteConfirm(false);
    }
  }, [deleteConfirm, deletePost]);

  if (!post) return;

  const created = DateTime.fromISO(post.data.createdAt);
  const replies = post?.data?.replies || [];
  const hasReplies = replies.length > 0;
  const isAI = post?.data?.isAI || false;
  const isReply = post?.data?.isReply || false;
  const isSummarized = post?.data?.isSummarized || false;
  const summary = post?.data?.summary || null;
  const summaryStale = post?.data?.summaryStale || false;
  const highlightColor = post?.data?.highlight
    ? highlights.get(post.data.highlight).color
    : 'var(--border)';
  const tags = post?.data?.tags || [];
  const openTodo = isOpenTodo(tags);
  const done = isDone(tags);

  const renderReplies = () => {
    return replies.map((reply, i) => {
      const isFirst = i === 0;
      const isLast = i === replies.length - 1;
      const path = getCurrentPilePath(reply);

      return (
        <Reply
          key={`${reply}-${i}`}
          postPath={reply}
          isLast={isLast}
          isFirst={isFirst}
          replying={replying}
          highlightColor={highlightColor}
          parentPostPath={postPath}
          reloadParentPost={refreshPost}
          searchTerm={searchTerm}
        />
      );
    });
  };

  // Replies are handled at the sub-component level
  if (isReply) return;

  const { getThread } = useThread();
  const { addNotification, updateNotification, removeNotification } = useToastsContext();

  const buildSummaryPrompt = async () => {
    const thread = await getThread(postPath);
    if (!thread || thread.length === 0) return '';
    const stripHtml = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const lines = thread.map((p) => {
      // No author labels to avoid "Pengguna/User/AI" in context
      const created = p?.data?.createdAt || '';
      return `- ${created}: ${stripHtml(p.content)}`;
    });
    return (
      `Task: Create a structured JSON summary (schema: {title, summary, keyThemes[], mood, confidence}) ` +
      `from the following conversation/notes. Write it as if I wrote it myself (first-person when relevant). ` +
      `Do not mention 'user', 'assistant', or 'AI'. No meta commentary or greetings. Do not use bullet points.\n\n` +
      `Output rules (single-paragraph focus):\n` +
      `- title: optional; if present, keep very short (<= 60 chars)\n` +
      `- summary: ONE cohesive short paragraph (1–3 sentences) that includes concrete context (people, places, books, tasks)\n` +
      `- keyThemes: return an empty array [] (we will not display them)\n` +
      `- mood: positive|negative|neutral|mixed\n` +
      `- confidence: number 0..1\n\n` +
      `Content:\n` +
      lines.join('\n')
    );
  };

  const handleSummarize = async () => {
    try {
      if (isSummarizing) return;
      setSummarizeError(null);
      setIsSummarizing(true);
      const toastId = `summarize-${postPath}-${Date.now()}`;
      addNotification({ id: toastId, type: 'info', message: 'Summarizing thread…', dismissTime: 8000 });
      const prompt = await buildSummaryPrompt();
      if (!prompt) return;
      const result = await generateStructuredResponse(prompt, 'summary');
      const now = new Date().toISOString();
      const data = result?.data || {};
      const newSummary = {
        title: data.title || 'Summary',
        summary: data.summary || '',
        keyPoints: Array.isArray(data.keyThemes) ? data.keyThemes : [],
        mood: data.mood || 'neutral',
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        createdAt: now,
        model: 'gemini',
      };
      await fileOperations.saveFile(
        window.electron.joinPath(getCurrentPilePath(), postPath),
        await fileOperations.generateMarkdown(post.content, {
          ...post.data,
          isSummarized: true,
          summaryStale: false,
          summary: newSummary,
          updatedAt: now,
        }),
      );
      await refreshPost();
      // Trigger immediate sync so meta is pushed quickly (if linked)
      try {
        if (currentPile?.path) {
          await window.electron.sync.immediateSync(currentPile.path);
        }
      } catch (_) {}
      updateNotification(toastId, 'success', 'Summary created');
      setTimeout(() => removeNotification(toastId), 1500);
    } catch (e) {
      console.error('Failed to summarize thread:', e);
      setSummarizeError(e?.message || 'Failed to summarize');
      const toastId = `summarize-error-${postPath}-${Date.now()}`;
      addNotification({ id: toastId, type: 'error', message: 'Failed to summarize. Please try again.', dismissTime: 6000 });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleResummarize = async () => {
    await handleSummarize();
  };

  const handleUnpinSummary = async () => {
    try {
      const now = new Date().toISOString();
      await fileOperations.saveFile(
        window.electron.joinPath(getCurrentPilePath(), postPath),
        await fileOperations.generateMarkdown(post.content, {
          ...post.data,
          isSummarized: false,
          updatedAt: now,
        }),
      );
      await refreshPost();
      try {
        if (currentPile?.path) {
          await window.electron.sync.immediateSync(currentPile.path);
        }
      } catch (_) {}
    } catch (e) {
      console.error('Failed to unpin summary:', e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.root} ${
        (replying || isAiReplying) && styles.focused
      }`}
      tabIndex="0"
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onFocus={handleRootMouseEnter}
      onBlur={handleRootMouseLeave}
    >
      {isSummarized && summary && (
        <OutlineView summary={summary} stale={summaryStale} />
      )}
      {(!isSummarized || showConversation) && (
        <div className={styles.post}>
          <div className={styles.left}>
            {post.data.isReply && <div className={styles.connector} />}
            <Ball
              isAI={isAI}
              highlightColor={highlightColor}
              cycleColor={cycleColor}
              setHighlight={setHighlight}
            />
            <div
              className={`${styles.line} ${
                (post.data.replies.length > 0 || replying) && styles.show
              }`}
              style={{
                borderColor: highlightColor,
              }}
            />
          </div>
          <div className={styles.right}>
            <div className={styles.header}>
              <div className={styles.title}>{post.name}</div>
              <div className={styles.meta}>
                {(openTodo || done) && (
                  <StatusBadge kind={done ? 'done' : 'todo'}>
                    {done ? 'Done' : 'Todo'}
                  </StatusBadge>
                )}
                <button className={styles.time} onClick={toggleEditable}>
                  {created.toRelative()}
                </button>
              </div>
            </div>
            <div className={styles.editor}>
              <Editor
                postPath={postPath}
                editable={editable}
                setEditable={setEditable}
                searchTerm={searchTerm}
              />
            </div>
          </div>
        </div>
      )}

      {(!isSummarized || showConversation) && renderReplies()}

      <div className={styles.actionsHolder}>
        <AnimatePresence>
          {(replying || hovering) && !isReply && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.actions}>
                <button className={styles.openReply} onClick={toggleReplying}>
                  <NeedleIcon className={styles.icon} />
                  Add another entry
                </button>
                {!isSummarized && (
                  <>
                    <button
                      className={`${styles.openReply} ${isSummarizing ? styles.loading : ''}`}
                      disabled={!aiApiKeyValid || isSummarizing}
                      onClick={handleSummarize}
                    >
                      <PaperIcon className={styles.icon2} />
                      {isSummarizing ? 'Summarizing…' : 'Summarize'}
                    </button>
                  </>
                )}
                {isSummarized && (
                  <>
                    {summaryStale && (
                      <>
                        <button
                          className={`${styles.openReply} ${isSummarizing ? styles.loading : ''}`}
                          disabled={!aiApiKeyValid || isSummarizing}
                          onClick={handleResummarize}
                        >
                          <ReflectIcon className={styles.icon2} />
                          {isSummarizing ? 'Resummarizing…' : 'Resummarize'}
                        </button>
                      </>
                    )}
                    <button
                      className={styles.openReply}
                      onClick={() => setShowConversation((v) => !v)}
                    >
                      <EditIcon className={styles.icon2} />
                      {showConversation ? 'Hide Conversation' : 'View Conversation'}
                    </button>
                    <button className={styles.openReply} onClick={handleUnpinSummary}>
                      <EditIcon className={styles.icon2} />
                      Unpin Summary
                    </button>
                  </>
                )}
                <button
                  className={styles.openReply}
                  disabled={!aiApiKeyValid || isAiReplying}
                  onClick={() => {
                    if (isAiReplying) return; // Prevent double-clicks
                    setIsAiReplying(true);
                    toggleReplying();
                  }}
                >
                  <ReflectIcon className={styles.icon2} />
                  Think Deeper
                </button>
                <button
                  className={`${styles.openReply} ${deleteConfirm ? styles.confirmDelete : ''}`}
                  onClick={handleDelete}
                  title={
                    deleteConfirm
                      ? 'Click again to confirm deletion of entire thread'
                      : 'Delete entire thread (including all replies)'
                  }
                >
                  <TrashIcon className={styles.icon2} />
                  {deleteConfirm ? 'Confirm Delete Thread' : 'Delete Thread'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {replying && (!isSummarized || showConversation) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.09 }}
          >
            <div className={`${styles.post} ${styles.reply}`}>
              <div className={styles.left}>
                <div
                  className={`${styles.connector} ${
                    (post.data.replies.length > 0 || replying) && styles.show
                  }`}
                  style={{
                    backgroundColor: highlightColor,
                  }}
                />
                <div
                  className={`${styles.ball} ${isAiReplying && styles.ai}`}
                  style={{
                    backgroundColor: highlightColor,
                  }}
                >
                  {isAiReplying && (
                    <AIIcon className={`${styles.iconAI} ${styles.replying}`} />
                  )}
                </div>
              </div>
              <div className={styles.right}>
                <div className={styles.editor}>
                  <Editor
                    key={`reply-${isAiReplying ? 'ai' : 'user'}`}
                    parentPostPath={postPath}
                    reloadParentPost={refreshPost}
                    setEditable={setEditable}
                    editable
                    isReply
                    closeReply={closeReply}
                    isAI={isAiReplying}
                    isThinkDeeper={isAiReplying}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default Post;
