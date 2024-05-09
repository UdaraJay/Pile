import styles from './Search.module.scss';
import {
  SettingsIcon,
  CrossIcon,
  ReflectIcon,
  RefreshIcon,
  DiscIcon,
  DownloadIcon,
  FlameIcon,
  SearchIcon,
} from 'renderer/icons';
import { useEffect, useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';
import { useIndexContext } from 'renderer/context/IndexContext';
import Post from '../Posts/Post';
import TextareaAutosize from 'react-textarea-autosize';
import Waiting from '../Toasts/Toast/Loaders/Waiting';
import Thinking from '../Toasts/Toast/Loaders/Thinking';
import InputBar from './InputBar';
import { AnimatePresence, motion } from 'framer-motion';
import OptionsBar from './OptionsBar';

const filterResults = (results, options) => {
  const now = new Date();

  const filtered = results.filter((result) => {
    const createdAt = new Date(result.createdAt);

    // Filter by date range
    let dateCondition = true;
    switch (options.dateRange) {
      case 'lastMonth':
        const lastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        dateCondition = createdAt > lastMonth;
        break;
      case 'last3Months':
        const last3Months = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate()
        );
        dateCondition = createdAt > last3Months;
        break;
      case 'lastYear':
        const lastYear = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        dateCondition = createdAt > lastYear;
        break;
    }

    // Filter by highlight
    const highlightCondition = options.onlyHighlighted
      ? result.highlight != null
      : true;

    // Filter by attachments
    const mediaCondition = options.hasAttachments
      ? result.attachments.length > 0
      : true;

    return dateCondition && highlightCondition && mediaCondition;
  });

  // Sort the filtered results based on the sortOrder option
  if (options.sortOrder === 'oldest') {
    filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (options.sortOrder === 'mostRecent') {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return filtered;
};

export default function Search() {
  const { currentTheme, setTheme } = usePilesContext();
  const { initVectorIndex, rebuildVectorIndex, query, search } =
    useIndexContext();
  const [container, setContainer] = useState(null);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');
  const [querying, setQuerying] = useState(false);
  const [response, setResponse] = useState([]);
  const [options, setOptions] = useState({
    dateRange: '',
    onlyHighlighted: false,
    notReplies: false,
    hasAttachments: false,
    sortOrder: 'mostRecent',
  });

  const onChangeText = (e) => {
    setText(e.target.value);
  };

  const onSubmit = () => {
    setQuerying(true);
    search(text).then((res) => {
      setResponse(res);
      setQuerying(false);
    });
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      onSubmit();
      event.preventDefault();
      return false;
    }
  };

  const containerVariants = {
    show: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  const filtered = useMemo(() => {
    const filtered = filterResults(response, options);
    return filtered;
  }, [response, options]);

  const renderResponse = () => {
    if (!response) return;

    return filtered.map((source, index) => {
      const uniqueKey = source.ref;
      if (!uniqueKey) return null;
      return (
        <motion.div
          variants={itemVariants}
          key={uniqueKey}
          className={styles.post}
        >
          <Post key={`post-${uniqueKey}`} postPath={uniqueKey} />
        </motion.div>
      );
    });
  };

  const osStyles = useMemo(
    () => (window.electron.isMac ? styles.mac : styles.win),
    []
  );

  const createStats = () => {
    console.log('filtered', filtered);
  };

  console.log('filtered', filtered);
  return (
    <>
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <div className={styles.iconHolder}>
            <SearchIcon className={styles.settingsIcon} />
          </div>
        </Dialog.Trigger>
        <Dialog.Portal container={container}>
          <Dialog.Overlay className={styles.DialogOverlay} />
          <Dialog.Content className={styles.DialogContent}>
            <div className={styles.wrapper}>
              <Dialog.Title className={styles.DialogTitle}>
                <InputBar
                  setReady={setReady}
                  value={text}
                  onChange={onChangeText}
                  onSubmit={onSubmit}
                  querying={querying}
                />
                <OptionsBar options={options} setOptions={setOptions} />
              </Dialog.Title>
              {filtered && (
                <div className={styles.meta}>
                  {filtered?.length} thread{filtered?.length !== 1 && 's'}
                  <div className={styles.sep}></div>
                  {filtered.reduce((a, i) => a + 1 + i.replies.length, 0)}{' '}
                  entries
                  <div className={styles.sep}></div>
                  {filtered.filter((post) => post.highlight).length} highlighted
                  <div className={styles.sep}></div>
                  {filtered.reduce((a, i) => a + i.attachments.length, 0)}{' '}
                  attachments
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.ul
                  initial="hidden"
                  animate="show"
                  variants={containerVariants}
                  className={styles.scroller}
                >
                  {renderResponse()}
                </motion.ul>
              </AnimatePresence>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div ref={setContainer} />
    </>
  );
}
