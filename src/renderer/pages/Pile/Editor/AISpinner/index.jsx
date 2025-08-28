import { motion } from 'framer-motion';
import styles from './AISpinner.module.scss';

function AISpinner({
  isVisible = false,
  message = 'AI is thinking...',
  canCancel = false,
  onCancel = () => {},
  hasError = false,
  onRetry = () => {},
}) {
  if (!isVisible) return null;

  return (
    <motion.div
      className={`${styles.aiSpinner} ${hasError ? styles.error : ''}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.content}>
        {!hasError ? (
          <>
            <div className={styles.spinner}>
              <div className={styles.dot} />
              <div className={styles.dot} />
              <div className={styles.dot} />
            </div>
            <span className={styles.message}>{message}</span>
          </>
        ) : (
          <>
            <div className={styles.errorIcon}>⚠️</div>
            <span className={styles.errorMessage}>{message}</span>
          </>
        )}

        <div className={styles.actions}>
          {hasError && (
            <button
              className={styles.retryButton}
              onClick={onRetry}
              title="Retry AI request"
            >
              ↻ Retry
            </button>
          )}
          {canCancel && (
            <button
              className={styles.cancelButton}
              onClick={onCancel}
              title="Cancel AI request"
            >
              ✕ Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default AISpinner;
