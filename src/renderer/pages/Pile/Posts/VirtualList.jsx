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
import NewPost from '../NewPost';
import { AnimatePresence, motion } from 'framer-motion';
import debounce from 'renderer/utils/debounce';
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { useWindowResize } from 'renderer/hooks/useWindowResize';
import { Virtuoso } from 'react-virtuoso';
import { useTimelineContext } from 'renderer/context/TimelineContext';
import Scrollbar from './Scrollbar';

const VirtualList = memo(({ data }) => {
  const { virtualListRef, setVisibleIndex } = useTimelineContext();
  const [isScrolling, setIsScrolling] = useState(false);

  const handleRangeChanged = (range) => {
    const middle = Math.floor((range.startIndex + range.endIndex) / 2);
    setVisibleIndex(range.startIndex);
  };

  const renderItem = useCallback((index, entry) => {
    const [postPath] = entry;

    if (index == 0) return <NewPost />;

    return (
      <div style={{ minHeight: 72 }}>
        <motion.div
          key={postPath}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Post postPath={postPath} />
        </motion.div>
      </div>
    );
  }, []);

  const getKey = useCallback((index) => data[index][0], [data]);

  const handleIsScrolling = (bool) => {
    setIsScrolling(bool);
  };

  return (
    <AnimatePresence>
      <Virtuoso
        ref={virtualListRef}
        data={data}
        rangeChanged={handleRangeChanged}
        itemContent={renderItem}
        computeItemKey={getKey}
        atTopThreshold={100}
        increaseViewportBy={2000}
        components={{ Scroller: Scrollbar }}
      />
    </AnimatePresence>
  );
});

export default VirtualList;
