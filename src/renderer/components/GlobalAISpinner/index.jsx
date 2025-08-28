import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalAI } from 'renderer/context/GlobalAIContext';
import styles from './GlobalAISpinner.module.scss';

function GlobalAISpinner() {
  const { globalAIState, hideAISpinner } = useGlobalAI();
  const {
    isActive,
    message,
    hasError,
    canCancel,
    canRetry,
    onCancel,
    onRetry,
  } = globalAIState;

  const handleCancel = () => {
    if (onCancel) onCancel();
    hideAISpinner();
  };

  const handleRetry = () => {
    if (onRetry) onRetry();
    hideAISpinner();
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`${styles.globalSpinner} ${hasError ? styles.error : ''}`}
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className={styles.content}>
            <div className={styles.left}>
              {!hasError ? (
                <div className={styles.spinner}>
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                </div>
              ) : (
                <div className={styles.errorIcon}>⚠️</div>
              )}
              <span className={styles.message}>{message}</span>
            </div>

            <div className={styles.actions}>
              {hasError && canRetry && (
                <button
                  className={styles.retryButton}
                  onClick={handleRetry}
                  title="Retry AI request"
                >
                  ↻ Retry
                </button>
              )}
              {canCancel && (
                <button
                  className={styles.cancelButton}
                  onClick={handleCancel}
                  title="Cancel AI request"
                >
                  ✕ Cancel
                </button>
              )}
              {!canCancel && !canRetry && (
                <button
                  className={styles.dismissButton}
                  onClick={hideAISpinner}
                  title="Dismiss"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default GlobalAISpinner;
