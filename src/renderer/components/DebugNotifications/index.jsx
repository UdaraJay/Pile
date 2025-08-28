import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebug } from 'renderer/context/DebugContext';
import styles from './DebugNotifications.module.scss';

function DebugNotifications() {
  const { aiStatus, logs, hideAIStatus, clearLogs } = useDebug();
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand when new logs arrive
  useEffect(() => {
    if (logs.length > 0 && !isExpanded) {
      setIsExpanded(true);
      const timer = setTimeout(() => setIsExpanded(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [logs.length, isExpanded]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'info':
      default:
        return '📝';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return '#ff3b30';
      case 'success':
        return '#34c759';
      case 'info':
      default:
        return '#007aff';
    }
  };

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

      {/* Debug Log Panel */}
      <div
        className={`${styles.logPanel} ${isExpanded ? styles.expanded : ''}`}
      >
        <div
          className={styles.header}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className={styles.title}>Debug Logs</span>
          <span className={styles.count}>{logs.length}</span>
          <span className={styles.toggle}>{isExpanded ? '−' : '+'}</span>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className={styles.logContent}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.logList}>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`${styles.logEntry} ${styles[log.type]}`}
                  >
                    <span className={styles.logIcon}>
                      {getLogIcon(log.type)}
                    </span>
                    <span className={styles.logTime}>{log.timestamp}</span>
                    <span className={styles.logMessage}>{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className={styles.emptyState}>
                    No AI debug logs yet...
                  </div>
                )}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.clearButton}
                  onClick={clearLogs}
                  disabled={logs.length === 0}
                >
                  Clear Logs
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default DebugNotifications;
