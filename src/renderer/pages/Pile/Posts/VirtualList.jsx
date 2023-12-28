import { useParams } from 'react-router-dom';
import styles from './Posts.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { useIndexContext } from 'renderer/context/IndexContext';
import Post from './Post';
import { VariableSizeList as List, areEqual } from 'react-window';
import { useWindowResize } from 'renderer/hooks/useWindowResize';
import AutoSizer from 'react-virtualized-auto-sizer';
import NewPost from '../NewPost';
import { AnimatePresence, motion } from 'framer-motion';
import debounce from 'renderer/utils/debounce';

const Row = memo(
  ({ data: posts, index, setSize, windowWidth, updateIndex }) => {
    const [postPath, data] = posts[index];
    const rowRef = useRef();

    console.log('rendering row');

    useEffect(() => {
      const observer = new MutationObserver(
        debounce(() => {
          refreshHeight();
        }, 400)
      );

      observer.observe(rowRef.current, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
      };
    }, [windowWidth]);

    const refreshHeight = (delta = 0) => {
      const height = rowRef?.current?.getBoundingClientRect().height + delta;

      if (height > 0) {
        setSize(index, height);
      }
    };

    return (
      <div ref={rowRef} className={styles.row}>
        <Post postPath={postPath} refreshHeight={refreshHeight} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.data.length === nextProps.data.length;
  }
);

export default function VirtualList({ data, updateIndex }) {
  const [windowWidth, windowHeight] = useWindowResize();
  const listRef = useRef();
  const sizeMap = useRef(new Map());

  console.log('Rerender: VirtualList');

  const setSize = (index, size) => {
    if (index == 0) return;
    const [postPath, metadata] = data[index];
    if (!metadata.height || metadata.height !== size) {
      updateIndex(postPath, { ...metadata, height: size });
    }
    sizeMap.current.set(postPath, size);
    listRef.current.resetAfterIndex(index, true);
  };

  const getSize = (index) => {
    if (index == 0) return 150;
    const [postPath, metadata] = data[index];
    if (sizeMap.current.has(postPath)) return sizeMap.current.get(postPath);
    return data[index][1].height ?? 0;
  };

  const itemKey = (index, data) => {
    if (index == 0) return 'NewPost';
    const [postPath, metadata] = data[index];
    return postPath;
  };

  const scrollToItem = (index) => {
    listRef.current.scrollToItem(index, 'center');
  };

  return (
    <AnimatePresence>
      <List
        ref={listRef}
        height={windowHeight}
        width="100%"
        itemCount={data.length}
        itemSize={getSize}
        itemData={data}
        itemKey={itemKey}
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
    </AnimatePresence>
  );
}
