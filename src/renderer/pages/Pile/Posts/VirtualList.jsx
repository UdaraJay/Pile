import { useParams } from 'react-router-dom';
import styles from './Posts.module.scss';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  memo,
  useLayoutEffect,
} from 'react';
import { useIndexContext } from 'renderer/context/IndexContext';
import Post from './Post';
import { VariableSizeList as List, areEqual } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import NewPost from '../NewPost';
import { AnimatePresence, motion } from 'framer-motion';
import debounce from 'renderer/utils/debounce';
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { useWindowResize } from 'renderer/hooks/useWindowResize';

export default function VirtualList({ data }) {
  const [windowWidth, windowHeight] = useWindowResize();
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => data[index][1].height || 150,
    getItemKey: (index) => data[index][0],
    overscan: 50,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      style={{
        height: windowHeight,
        width: '100%',
        overflowY: 'auto',
        overflowAnchor: 'none',
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${items[0]?.start ?? 0}px)`,
          }}
        >
          {items.map(({ index, key, size }) => {
            const [postPath, metadata] = data[index];
            console.log('size', size);
            return (
              <div
                key={key}
                data-index={postPath}
                ref={virtualizer.measureElement}
              >
                {index == 0 && <NewPost />}
                {index > 0 && <Post postPath={postPath} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
