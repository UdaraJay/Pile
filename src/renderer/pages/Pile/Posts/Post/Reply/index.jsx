import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useCallback } from 'react';
import { DateTime } from 'luxon';
import { postFormat } from 'renderer/utils/fileOperations';
import * as fileOperations from 'renderer/utils/fileOperations';
import { usePilesContext } from 'renderer/context/PilesContext';
import usePost from 'renderer/hooks/usePost';
import { AnimatePresence, motion } from 'framer-motion';
import { AIIcon, TrashIcon } from 'renderer/icons';
import Editor from '../../../Editor';
import styles from '../Post.module.scss';

export default function Reply({
  postPath,
  isLast = false,
  isFirst = false,
  replying = false,
  highlightColor,
  parentPostPath = null,
  reloadParentPost = () => {},
  searchTerm = { searchTerm },
}) {
  const { currentPile } = usePilesContext();
  const { post, cycleColor, deletePost } = usePost(postPath, {
    isReply: true,
    parentPostPath,
    reloadParentPost,
  });
  const [editable, setEditable] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const toggleEditable = () => setEditable(!editable);

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => setHovering(false);

  const handleDeleteReply = useCallback(async () => {
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
      console.error('Failed to delete reply:', error);
      setDeleteConfirm(false);
    }
  }, [deleteConfirm, deletePost]);

  if (!post) return;

  const created = DateTime.fromISO(post.data.createdAt);
  const replies = post?.data?.replies || [];
  const isReply = post?.data?.isReply || false;
  const isAI = post?.data?.isAI || false;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
      <div className={styles.post}>
        <div className={styles.left}>
          <div className={`${styles.connector} ${isFirst && styles.first}`} />

          <div
            className={`${styles.ball} ${isAI && styles.ai}`}
            onDoubleClick={cycleColor}
            style={{
              backgroundColor: highlightColor ?? 'var(--border)',
            }}
          >
            {isAI && <AIIcon className={styles.iconAI} />}
          </div>
          <div
            className={`${styles.line} ${isAI && styles.ai} ${
              (!isLast || replying) && styles.show
            } `}
            style={{
              borderColor: highlightColor ?? 'var(--border)',
            }}
          />
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <div className={styles.title}>{post.name}</div>
            <div className={styles.meta}>
              <div className={styles.time} onClick={toggleEditable}>
                {created.toRelative()}
              </div>
              <AnimatePresence>
                {hovering && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className={`${styles.deleteReply} ${deleteConfirm ? styles.confirmDelete : ''}`}
                    onClick={handleDeleteReply}
                    title={
                      deleteConfirm
                        ? 'Click again to confirm deletion'
                        : 'Delete this reply'
                    }
                  >
                    <TrashIcon className={styles.deleteIcon} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className={`${styles.editor} ${isAI && styles.ai}`}>
            <Editor
              postPath={postPath}
              editable={editable}
              setEditable={setEditable}
              parentPostPath={parentPostPath}
              reloadParentPost={reloadParentPost}
              searchTerm={searchTerm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
