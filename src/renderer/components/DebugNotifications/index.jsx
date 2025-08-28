import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebug } from 'renderer/context/DebugContext';
import styles from './DebugNotifications.module.scss';

function DebugNotifications() {
  const { aiStatus, hideAIStatus } = useDebug();

  return (
    <div className={styles.debugContainer}>
      {/* AI Status Spinner/Notification */}
      <AnimatePresence>
        {aiStatus && (
          <motion.div
            className={`${styles.aiNotification} ${styles[aiStatus.type]}`}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.statusContent}>
              {aiStatus.type === 'loading' && (
                <div className={styles.spinner}>
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                </div>
              )}
              {aiStatus.type === 'error' && (
                <span className={styles.icon}>⚠️</span>
              )}
              {aiStatus.type === 'success' && (
                <span className={styles.icon}>✅</span>
              )}
              <span className={styles.message}>{aiStatus.message}</span>
              {aiStatus.type === 'error' && (
                <button className={styles.retryButton} onClick={hideAIStatus}>
                  Dismiss
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DebugNotifications;
