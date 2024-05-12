import { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styles from './Post.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { DateTime } from 'luxon';
import { postFormat } from 'renderer/utils/fileOperations';
import Editor from '../../Editor';
import * as fileOperations from 'renderer/utils/fileOperations';
import { usePilesContext } from 'renderer/context/PilesContext';
import usePost from 'renderer/hooks/usePost';
import { AnimatePresence, motion } from 'framer-motion';
import Reply from './Reply';
import {
  AIIcon,
  EditIcon,
  NeedleIcon,
  PaperIcon,
  ReflectIcon,
} from 'renderer/icons';
import { useTimelineContext } from 'renderer/context/TimelineContext';
import Ball from './Ball';
import { useHighlightsContext } from 'renderer/context/HighlightsContext';

const Post = memo(({ postPath, searchTerm = null, repliesCount = 0 }) => {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { highlights } = useHighlightsContext();
  // const { setClosestDate } = useTimelineContext();
  const { post, cycleColor, refreshPost, setHighlight } = usePost(postPath);
  const [hovering, setHover] = useState(false);
  const [replying, setReplying] = useState(false);
  const [isAIResplying, setIsAiReplying] = useState(false);
  const [editable, setEditable] = useState(false);

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

  if (!post) return;

  const created = DateTime.fromISO(post.data.createdAt);
  const replies = post?.data?.replies || [];
  const hasReplies = replies.length > 0;
  const isAI = post?.data?.isAI || false;
  const isReply = post?.data?.isReply || false;
  const highlightColor = post?.data?.highlight
    ? highlights.get(post.data.highlight).color
    : 'var(--border)';

  const renderReplies = () => {
    return replies.map((reply, i) => {
      const isFirst = i === 0;
      const isLast = i === replies.length - 1;
      const path = getCurrentPilePath(reply);

      return (
        <Reply
          key={reply}
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

  return (
    <div
      ref={containerRef}
      className={`${styles.root} ${
        (replying || isAIResplying) && styles.focused
      }`}
      tabIndex="0"
      onMouseEnter={handleRootMouseEnter}
      onMouseLeave={handleRootMouseLeave}
      onFocus={handleRootMouseEnter}
      onBlur={handleRootMouseLeave}
    >
      <div className={styles.post}>
        <div className={styles.left}>
          {post.data.isReply && <div className={styles.connector}></div>}
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
          ></div>
        </div>
        <div className={styles.right}>
          <div className={styles.header}>
            <div className={styles.title}>{post.name}</div>
            <div className={styles.meta}>
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

      {renderReplies()}

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
                <div className={styles.sep}>/</div>
                <button
                  className={styles.openReply}
                  onClick={() => {
                    setIsAiReplying(true);
                    toggleReplying();
                  }}
                >
                  <ReflectIcon className={styles.icon2} />
                  Reflect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                    backgroundColor: highlightColor,
                  }}
                ></div>
                <div
                  className={`${styles.ball} ${isAIResplying && styles.ai}`}
                  style={{
                    backgroundColor: highlightColor,
                  }}
                >
                  {isAIResplying && (
                    <AIIcon className={`${styles.iconAI} ${styles.replying}`} />
                  )}
                </div>
              </div>
              <div className={styles.right}>
                <div className={styles.editor}>
                  <Editor
                    parentPostPath={postPath}
                    reloadParentPost={refreshPost}
                    setEditable={setEditable}
                    editable
                    isReply
                    closeReply={closeReply}
                    isAI={isAIResplying}
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
