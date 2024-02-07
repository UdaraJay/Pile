import styles from './Message.module.scss';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useCallback, memo } from 'react';
import { AIIcon, PersonIcon } from 'renderer/icons';

const isOdd = (num) => {
  return num % 2 !== 0;
};

const Message = ({ index, text, scrollToBottom }) => {
  const isUser = !isOdd(index);
  const [streamedResponse, setStreamedResponse] = useState('');

  // If the message is @@PENDING@@, then we listen to streaming chats
  // and use that as the text
  useEffect(() => {
    if (!window) return;
    if(text !== '@@PENDING@@') return;

    window.electron.ipc.on('streamed_chat', handleStreamedChat);

    return () => {
      window.electron.ipc.removeListener('streamed_chat', handleStreamedChat);
    };
  }, []);

  const handleStreamedChat = useCallback((res) => {
    if (res == '@@END@@') return;
      setStreamedResponse((str) => str.concat(res));
      scrollToBottom();
  }, []);
  
  return (
    <div style={{ minHeight: 72 }}>
      <motion.div
        key={`${index}-item`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ delay: 0.1 }}
      >
        {isUser ? (
          <div className={`${styles.message} ${styles.user}`}>
            <div className={styles.wrap}>
              <div className={styles.ball}><PersonIcon className={styles.avatar}/></div>
              <div className={styles.text}>{text}</div>
            </div>
          </div>
        ) : (
          <div className={`${styles.message} ${styles.ai}`}>
            <div className={styles.wrap}>
              <div className={styles.ball}><AIIcon className={styles.avatar}/></div>
              <div className={styles.text}>
                {text == '@@PENDING@@' ? streamedResponse : text}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Message;
