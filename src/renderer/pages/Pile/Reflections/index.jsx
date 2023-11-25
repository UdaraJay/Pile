import styles from './Reflections.module.scss';
import {
  SettingsIcon,
  CrossIcon,
  ReflectIcon,
  RefreshIcon,
  DiscIcon,
  DownloadIcon,
  FlameIcon,
} from 'renderer/icons';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';
import { useIndexContext } from 'renderer/context/IndexContext';
import { response as testResponse } from './response';
import Post from '../Posts/Post';
import TextareaAutosize from 'react-textarea-autosize';
import Waiting from '../Toasts/Toast/Loaders/Waiting';
import Thinking from '../Toasts/Toast/Loaders/Thinking';
import Status from './Status';
import { AnimatePresence, motion } from 'framer-motion';

const prompts = [
  'Pose me any riddle or wonderment you wish',
  'You may consult this mind on any matter, mysterious or mundane.',
];

export default function Reflections() {
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

    return sources.map((source) => {
      return (
        <div className={styles.post}>
          <Post
            key={`post-${source.metadata.relativeFilePath}`}
            postPath={source.metadata.relativeFilePath}
          />
        </div>
      );
    });
  };

  return (
    <>
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <div className={styles.iconHolder}>
            <ReflectIcon className={styles.settingsIcon} />
          </div>
        </Dialog.Trigger>
        <Dialog.Portal container={container}>
          <Dialog.Overlay className={styles.DialogOverlay} />
          <Dialog.Content className={styles.DialogContent}>
            <div className={styles.wrapper}>
              <Dialog.Title className={styles.DialogTitle}>
                <Status setReady={setReady} />
              </Dialog.Title>
              <TextareaAutosize
                value={text}
                onChange={onChangeText}
                className={styles.textarea}
                onKeyDown={handleKeyPress}
                placeholder="Pose me any riddle or wonderment you wish"
              />
              <div className={styles.buttons}>
                <div className={styles.left}>
                  <button
                    className={`${styles.ask} ${querying && styles.processing}`}
                    onClick={onSubmit}
                    disabled={querying}
                  >
                    {querying ? (
                      <Thinking className={styles.spinner} />
                    ) : (
                      'Reflect'
                    )}
                  </button>
                  {/* <button onClick={rebuildVectorIndex}>Rebuild</button> */}
                </div>
              </div>

              <AnimatePresence>
                {response && (
                  <motion.div
                    key={response.response}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className={styles.text}>{response.response}</div>
                  </motion.div>
                )}
              </AnimatePresence>

              {renderResponse()}

              {/* <Dialog.Close asChild>
                <button
                  className={styles.IconButton}
                  aria-label="Close Reflections"
                >
                  <CrossIcon />
                </button>
              </Dialog.Close> */}
            </div>
          </Dialog.Content>
          <div className={styles.DialogContentOverlay}></div>
        </Dialog.Portal>
      </Dialog.Root>
      <div ref={setContainer} />
    </>
  );
}
