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

export default function Search() {
  const { currentTheme, setTheme } = usePilesContext();
  const { initVectorIndex, rebuildVectorIndex, query } = useIndexContext();
  const [container, setContainer] = useState(null);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');
  const [querying, setQuerying] = useState(false);
  const [response, setResponse] = useState(null);

  const onChangeText = (e) => {
    setText(e.target.value);
  };

  const onSubmit = () => {
    setQuerying(true);
    query(text)
      .then((res) => {
        setResponse(res);
      })
      .finally(() => {
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

  const renderResponse = () => {
    if (!response) return;
    const sources = response.sourceNodes;

    return sources.map((source, index) => {
      return (
        <div key={index} className={styles.post}>
          <Post
            key={`post-${source.metadata.relativeFilePath}`}
            postPath={source.metadata.relativeFilePath}
          />
        </div>
      );
    });
  };

  const osStyles = useMemo(
    () => (window.electron.isMac ? styles.mac : styles.win),
    []
  );

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
            <div className={styles.scroller}>
              <div className={styles.wrapper}>
                <Dialog.Title className={styles.DialogTitle}>
                  <InputBar
                    setReady={setReady}
                    value={text}
                    onChange={onChangeText}
                    onSubmit={onSubmit}
                    querying={querying}
                  />
                </Dialog.Title>

                <AnimatePresence>
                  {response && (
                    <motion.div
                      key={response.response}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className={styles.answer}>
                        <div className={styles.text}>{response.response}</div>
                        <div className={styles.text_context}>
                          *This answer is written by AI, using the entries
                          below. AI can make mistakes. Consider checking
                          important information.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {renderResponse()}
              </div>
            </div>
          </Dialog.Content>
          <div className={styles.DialogContentOverlay}></div>
        </Dialog.Portal>
      </Dialog.Root>
      <div ref={setContainer} />
    </>
  );
}
