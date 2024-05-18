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
    const updatedAt = entry[1].updatedAt;
    const repliesCount = entry[1].replies?.length;
    const key = postPath + updatedAt;
    if (index == 0) return <NewPost />;

    return (
      <div style={{ minHeight: 72 }}>
        <motion.div
          key={key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Post postPath={postPath} repliesCount={repliesCount} />
        </motion.div>
      </div>
    );
  }, []);

  const getKey = useCallback(
    (index) => {
      const entry = data[index];
      const updatedAt = entry[1].updatedAt;
      const repliesCount = entry[1].replies?.length;
      const key = entry[0] + repliesCount;
      return key;
    },
    [data]
  );

  const handleIsScrolling = (bool) => {
    setIsScrolling(bool);
  };

  return (
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
  );
});

export default VirtualList;
