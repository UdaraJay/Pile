import { useCallback, useState, memo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { motion } from 'framer-motion';
import { useTimelineContext } from 'renderer/context/TimelineContext';
import NewPost from '../NewPost';
import Post from './Post';
import Scrollbar from './Scrollbar';

const PostItem = memo(({ postPath, post }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ minHeight: 72, width: '100%' }}
    >
      <Post postPath={postPath} />
    </motion.div>
  );
});

const MemoizedNewPost = memo(() => <NewPost />);

const VirtualTimeline = memo(({ data }) => {
  const { virtualListRef, setVisibleIndex } = useTimelineContext();
  const [isScrolling, setIsScrolling] = useState(false);

  const handleRangeChanged = useCallback((range) => {
    setVisibleIndex(range.startIndex);
  }, [setVisibleIndex]);

  const renderItem = useCallback((index, entry) => {
    // Only render NewPost at the very top
    if (index === 0) {
      return <MemoizedNewPost />;
    }

    const [postPath, post] = entry;
    return (
      <PostItem
        postPath={postPath}
        post={post}
      />
    );
  }, []);

  const getKey = useCallback((index, entry) => {
    if (index === 0) return 'new-post';
    const [postPath, post] = entry;
    return `${postPath}-${post.updatedAt}`;
  }, []);

  return (
    <Virtuoso
      ref={virtualListRef}
      data={data}
      rangeChanged={handleRangeChanged}
      itemContent={renderItem}
      computeItemKey={getKey}
      components={{
        Scroller: Scrollbar
      }}
      overscan={5}
      defaultItemHeight={220}
      style={{ height: '100%', width: '100%' }}
      initialTopMostItemIndex={0}
      followOutput={'smooth'}
      alignToBottom={false}
      components={{
        Scroller: Scrollbar,
        Footer: () => <div style={{ height: 20 }} />,
        EmptyPlaceholder: () => <div></div>,
      }}
    />
  );
});

VirtualTimeline.displayName = 'VirtualTimeline';

export default VirtualTimeline;
