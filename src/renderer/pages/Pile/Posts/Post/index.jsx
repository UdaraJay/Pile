import { useParams } from 'react-router-dom';
import styles from './Post.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import { postFormat } from 'renderer/utils/fileOperations';
import Editor from '../../Editor';
import * as fileOperations from 'renderer/utils/fileOperations';
import { usePilesContext } from 'renderer/context/PilesContext';
import usePost from 'renderer/hooks/usePost';
import { AnimatePresence, motion } from 'framer-motion';
import Reply from './Reply';
import { AIIcon, EditIcon, NeedleIcon, PaperIcon } from 'renderer/icons';

export default function Post({ postPath }) {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { post, cycleColor, refreshPost } = usePost(postPath);
  const [hovering, setHover] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editable, setEditable] = useState(false);

  const toggleReplying = () => setReplying(!replying);
  const toggleEditable = () => setEditable(!editable);

  if (!post) return;

  const created = DateTime.fromISO(post.data.createdAt);
  const replies = post?.data?.replies || [];
  const hasReplies = replies.length > 0;
  const isReply = post?.data?.isReply || false;
  const highlightColor = post.data.highlightColor ?? 'var(--border)';

  const renderReplies = () => {
    return replies.map((reply, i) => {
      const isFirst = i === 0;
      const isLast = i === replies.length - 1;
      const path = getCurrentPilePath(reply);
      return (
        <Reply
          key={reply}
          postPath={path}
          isLast={isLast && !hovering}
          isFirst={isFirst}
          replying={replying}
          highlightColor={post.data.highlightColor}
          parentPostPath={postPath}
          reloadParentPost={refreshPost}
        />
      );
    });
  };

  const handleRootMouseEnter = () => setHover(true);
  const handleRootMouseLeave = () => setHover(false);

  if (isReply) return;

  return (
    <div
      className={styles.root}
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
    >
      <div className={styles.post}>
        <div className={styles.left}>
          {post.data.isReply && <div className={styles.connector}></div>}
          <div
            className={styles.ball}
            onClick={cycleColor}
            style={{
              backgroundColor: highlightColor,
            }}
          ></div>

          <div
            className={`${styles.line} ${
              (post.data.replies.length > 0 || replying || hovering) &&
              styles.show
            }`}
            style={{
              backgroundColor: highlightColor,
            }}
          ></div>
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <div className={styles.title}>{post.name}</div>
            <div className={styles.meta}>
              <div className={styles.time} onClick={toggleEditable}>
                {created.toRelative()}
              </div>
            </div>
          </div>
          <div className={styles.editor}>
            <Editor
              postPath={postPath}
              editable={editable}
              setEditable={setEditable}
            />
          </div>
        </div>
      </div>

      {renderReplies()}

      <AnimatePresence>
        {(replying || hovering) && !isReply && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.actions}>
              <div
                className={styles.openReply}
                style={{ backgroundColor: highlightColor }}
                onClick={toggleReplying}
              >
                <NeedleIcon className={styles.icon} />
                Add another post
              </div>
              <div
                className={styles.openReply}
                style={{ backgroundColor: highlightColor }}
                onClick={toggleReplying}
              >
                <AIIcon className={styles.icon2} />
                Generate
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replying && (
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
                ></div>
                <div
                  className={styles.ball}
                  style={{
                    backgroundColor: highlightColor,
                  }}
                ></div>
              </div>
              <div className={styles.right}>
                <div className={styles.editor}>
                  <Editor
                    parentPostPath={postPath}
                    reloadParentPost={refreshPost}
                    editable
                    isReply
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
