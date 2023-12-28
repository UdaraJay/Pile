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
import VirtualList from './VirtualList';

export default function Posts() {
  const { index, updateIndex } = useIndexContext();
  const [windowWidth, windowHeight] = useWindowResize();
  const [data, setData] = useState([]);

  console.log('Rerender: Posts');

  // Index is updated when an entry is added/deleted.
  // We use this to generate the data array which consists of
  // all the items that are going to be rendered on the virtual list.
  useEffect(() => {
    console.log('index changed');
    const onlyParentEntries = Array.from(index)
      .filter(([key, metadata]) => !metadata.isReply)
      .reduce((acc, [key, value]) => acc.set(key, value), new Map());

    if (onlyParentEntries.size === data.length - 1) {
      return;
    }

    console.log('Updating list data');
    // Dummy entry appended to the front to account for the
    // NewPost component at the top of the list.
    setData([['NewPost', { height: 150 }], ...Array.from(onlyParentEntries)]);
  }, [index]);

  return (
    <div className={styles.posts}>
      <VirtualList data={data} updateIndex={updateIndex} />
    </div>
  );
}
