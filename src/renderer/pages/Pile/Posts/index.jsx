import { useParams } from 'react-router-dom';
import styles from './Posts.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { useIndexContext } from 'renderer/context/IndexContext';
import Post from './Post';
import { VariableSizeList as List } from 'react-window';
import { useWindowResize } from 'renderer/hooks/useWindowResize';
import AutoSizer from 'react-virtualized-auto-sizer';
import NewPost from '../NewPost';
import { AnimatePresence, motion } from 'framer-motion';

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

const Row = memo(
  ({ data: posts, index, setSize, windowWidth, updateIndex }) => {
    const [postPath, data] = posts[index];
    const rowRef = useRef();

    const debounce = (func, delay) => {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          func.apply(this, args);
        }, delay);
      };
    };

    useEffect(() => {
      const observer = new MutationObserver(
        debounce(() => {
          refreshHeight();
        }, 500)
      );

      observer.observe(rowRef.current, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
      };
    }, [setSize, index, windowWidth]);

    const refreshHeight = (delta = 0) => {
      const height = rowRef?.current?.getBoundingClientRect().height + delta;

      if (height > 0) {
        setSize(index, height);
      }
    };

    return (
      <div ref={rowRef} className={styles.row}>
        <Post
          key={`post-${postPath}`}
          postPath={postPath}
          refreshHeight={refreshHeight}
        />
      </div>
    );
  }
);

export default function Posts() {
  const { index, updateIndex } = useIndexContext();
  const [windowWidth, windowHeight] = useWindowResize();

  // Dummy entry appended to the front to account for the
  // NewPost component at the top of the list.
  const data = [[null, { height: 150 }], ...Array.from(index)];
  const listRef = useRef();
  const sizeMap = useRef({});

  const setSize = useCallback(
    (index, size) => {
      const [postPath, metadata] = data[index];
      if (!metadata.height || metadata.height !== size) {
        updateIndex(postPath, { ...metadata, height: size });
      }
      sizeMap.current = { ...sizeMap.current, [index]: size };
      listRef.current.resetAfterIndex(index, true);
    },
    [data]
  );

  const getSize = (index) => {
    if (index == 0) return 150;
    if (sizeMap.current[index]) return sizeMap.current[index];
    return data[index][1].height ?? 0;
  };

  const scrollToItem = (index) => {
    this.listRef.current.scrollToItem(index, 'center');
  };

  return (
    <div className={styles.posts}>
      <List
        ref={listRef}
        height={windowHeight}
        width="100%"
        itemCount={data.length}
        itemSize={getSize}
        itemData={data}
      >
        {({ data, index, style }) => (
          <div style={style}>
            {index == 0 && <NewPost />}
            {index > 0 && (
              <Row
                data={data}
                index={index}
                setSize={setSize}
                windowWidth={windowWidth}
                updateIndex={updateIndex}
              />
            )}
          </div>
        )}
      </List>
    </div>
  );
}
