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
import { NeedleIcon } from 'renderer/icons';

export default function Post({ postPath }) {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { post, cycleColor } = usePost(postPath);
  const [replying, setReplying] = useState(false);
  const [editable, setEditable] = useState(false);

  const toggleReplying = () => setReplying(!replying);
  const toggleEditable = () => setEditable(!editable);

  if (!post) return;

  const created = DateTime.fromISO(post.data.createdAt);
  const replies = post?.data?.replies || [];
  const isReply = post?.data?.isReply || false;

  const renderReplies = () => {
    return replies.map((reply, i) => {
      const isFirst = i === 0;
      const isLast = i === replies.length - 1;
      const path = getCurrentPilePath(reply);
      return (
        <div className={styles.replies}>
          <Reply
            postPath={path}
            isLast={isLast}
            isFirst={isFirst}
            highlightColor={post.data.highlightColor}
          />
        </div>
      );
    });
  };

  if (isReply) return;

  return (
    <div className={styles.root}>
      <div className={styles.post}>
        <div className={styles.left}>
          {post.data.isReply && <div className={styles.connector}></div>}
          <div
            className={styles.ball}
            onDoubleClick={cycleColor}
            style={{
              backgroundColor: post.data.highlightColor ?? 'var(--border)',
            }}
          ></div>

          <div
            className={`${styles.line} ${
              (post.data.replies.length > 0 || replying) && styles.show
            }`}
            style={{
              backgroundColor: post.data.highlightColor ?? 'var(--border)',
            }}
          ></div>
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <div className={styles.title}>{post.name}</div>
            <div className={styles.meta}>
              {!isReply && (
                <div className={styles.replyButton} onClick={toggleReplying}>
                  <NeedleIcon className={styles.icon} />
                </div>
              )}

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
                    backgroundColor:
                      post.data.highlightColor ?? 'var(--border)',
                  }}
                ></div>
                <div
                  className={styles.ball}
                  onDoubleClick={cycleColor}
                  style={{
                    backgroundColor: 'var(--border)',
                  }}
                ></div>
                <div
                  className={`${styles.line} ${
                    (post.data.replies.length > 0 || replying) && styles.show
                  }`}
                  style={{
                    backgroundColor:
                      post.data.highlightColor ?? 'var(--border)',
                  }}
                ></div>
              </div>
              <div className={styles.right}>
                <div className={styles.editor}>
                  <Editor parentPostPath={postPath} editable isReply />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderReplies()}
    </div>
  );
}
