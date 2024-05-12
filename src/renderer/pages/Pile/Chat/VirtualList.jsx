import { useParams } from 'react-router-dom';
import styles from './Chat.module.scss';
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
import { AnimatePresence, motion } from 'framer-motion';
import debounce from 'renderer/utils/debounce';
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/react-virtual';
import { useWindowResize } from 'renderer/hooks/useWindowResize';
import { Virtuoso } from 'react-virtuoso';
import { useTimelineContext } from 'renderer/context/TimelineContext';
import Scrollbar from './Scrollbar';
import Intro from './Intro';
import Message from './Message';

const VirtualList = memo(({ data }) => {
  const virtualListRef = useRef();

  useEffect(() => {
    scrollToBottom();
  }, [virtualListRef, data]);

  const scrollToBottom = (align = 'end') => {
    virtualListRef?.current?.scrollToIndex({
      index: data.length - 1,
      align,
    });
  };

  const renderItem = useCallback(
    (index, message) => (
      <Message
        index={index}
        message={message}
        scrollToBottom={scrollToBottom}
      />
    ),
    [data]
  );

  const getKey = useCallback((index) => `${index}-item`, [data]);

  return (
    <Virtuoso
      ref={virtualListRef}
      data={data}
      itemContent={renderItem}
      computeItemKey={getKey}
      overscan={500}
      initialTopMostItemIndex={data.length - 1}
      followOutput={'smooth'}
      components={{
        Header: Intro,
        Footer: () => (
          <div
            style={{
              paddingTop: '140px',
            }}
          ></div>
        ),
        Scroller: Scrollbar,
      }}
    />
  );
});

export default VirtualList;
