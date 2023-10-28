import { useParams } from 'react-router-dom';
import styles from './Posts.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useIndexContext } from 'renderer/context/IndexContext';
import { motion } from 'framer-motion';
import Post from './Post';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {},
  },
};

const item = {
  hidden: { opacity: 0, y: -30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function Posts() {
  const { index } = useIndexContext();

  const renderPosts = useMemo(() => {
    return Array.from(index, ([postPath, data]) => {
      return (
        <motion.div key={postPath} variants={item}>
          <Post key={`post-${postPath}`} postPath={postPath} />
        </motion.div>
      );
    });
  }, [index]);

  return (
    <div className={styles.posts}>
      <motion.div variants={container} initial="hidden" animate="show">
        {renderPosts}
      </motion.div>
    </div>
  );
}
