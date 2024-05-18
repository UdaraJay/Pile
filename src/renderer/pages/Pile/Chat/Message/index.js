import styles from './Message.module.scss';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useCallback, memo } from 'react';
import { AIIcon, PersonIcon } from 'renderer/icons';
import Markdown from 'react-markdown';

const Message = ({ index, message, scrollToBottom }) => {
  const isUser = message.role === 'user';
  const [streamedResponse, setStreamedResponse] = useState('');

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
              <div className={styles.ball}>
                <PersonIcon className={styles.avatar} />
              </div>
              <div className={styles.text}>{message.content}</div>
            </div>
          </div>
        ) : (
          <div className={`${styles.message} ${styles.ai}`}>
            <div className={styles.wrap}>
              <div className={styles.ball}>
                <AIIcon className={styles.avatar} />
              </div>
              <div className={styles.text}>
                {message.content == '@@PENDING@@'
                  ? streamedResponse
                  : message.content}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Message;
