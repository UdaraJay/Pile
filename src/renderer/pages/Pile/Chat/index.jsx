import styles from './Chat.module.scss';
import {
  SettingsIcon,
  CrossIcon,
  ReflectIcon,
  RefreshIcon,
  DiscIcon,
  DownloadIcon,
  FlameIcon,
  ChatIcon,
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
import Status from './Status';
import { AnimatePresence, motion } from 'framer-motion';
import VirtualList from './VirtualList';
import Blobs from './Blobs';
import useChat from 'renderer/hooks/useChat';

export default function Chat() {
  const { currentTheme, setTheme } = usePilesContext();
  const { getAIResponse, addMessage, resetMessages } = useChat();
  const [container, setContainer] = useState(null);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');
  const [querying, setQuerying] = useState(false);
  const [history, setHistory] = useState([]);

  const onChangeText = (e) => {
    setText(e.target.value);
  };

  const onResetConversation = () => {
    setText('');
    setHistory([]);
    resetMessages();
  };

  const appendToLastSystemMessage = (token) => {
    setHistory((history) => {
      const last = history[history.length - 1];
      if (last.role === 'system') {
        return [
          ...history.slice(0, -1),
          { role: 'system', content: last.content + (token ?? '') },
        ];
      }
    });
  };

  const onSubmit = async () => {
    if (text === '') return;
    setQuerying(true);
    const message = `${text}`;
    setText('');
    setHistory((history) => [...history, { role: 'user', content: message }]);
    const messages = await addMessage(message);
    setHistory((history) => [...history, { role: 'system', content: '' }]);
    await getAIResponse(messages, appendToLastSystemMessage);
    setQuerying(false);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      onSubmit();
      event.preventDefault();
      return false;
    }
  };

  const renderHistory = () => {
    return history.map((text) => <div className={styles.text}>{text}</div>);
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
            <ChatIcon className={styles.chatIcon} />
          </div>
        </Dialog.Trigger>
        <Dialog.Portal container={container}>
          <Dialog.Overlay className={styles.DialogOverlay} />
          <Dialog.Content className={styles.DialogContent}>
            <div className={styles.scroller}>
              <div className={styles.wrapper}>
                <div className={styles.wrapperUnderlay}></div>
                <Blobs show={querying} />
                <Dialog.Title className={styles.DialogTitle}>
                  <Status setReady={setReady} />
                </Dialog.Title>
                <div className={styles.buttons}>
                  <div className={styles.button} onClick={onResetConversation}>
                    <RefreshIcon className={styles.icon} />
                    Clear chat
                  </div>
                  <Dialog.Close asChild>
                    <button
                      className={`${styles.close} ${osStyles}`}
                      aria-label="Close Chat"
                    >
                      <CrossIcon />
                    </button>
                  </Dialog.Close>
                </div>
              </div>
              <AnimatePresence>
                <div className={styles.answer}>
                  <VirtualList data={history} />
                </div>
              </AnimatePresence>

              <div className={styles.inputBar}>
                <AnimatePresence>
                  <div className={styles.inputbaroverlay}></div>
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.1 }}
                    className={styles.bar}
                  >
                    <TextareaAutosize
                      value={text}
                      onChange={onChangeText}
                      className={styles.textarea}
                      onKeyDown={handleKeyPress}
                      placeholder="Start chatting..."
                      autoFocus
                    />
                    <div className={styles.buttons}>
                      <button
                        className={`${styles.ask} ${
                          querying && styles.processing
                        }`}
                        onClick={onSubmit}
                        disabled={querying}
                      >
                        {querying ? (
                          <Thinking className={styles.spinner} />
                        ) : (
                          'Ask'
                        )}
                      </button>
                    </div>
                  </motion.div>
                  <motion.div
                    key="disclaimer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.3 }}
                    className={styles.disclaimer}
                  >
                    *AI can make mistakes. Consider checking important
                    information.
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Dialog.Content>
          {/* <div className={styles.DialogContentOverlay}></div> */}
        </Dialog.Portal>
      </Dialog.Root>
      <div ref={setContainer} />
    </>
  );
}
