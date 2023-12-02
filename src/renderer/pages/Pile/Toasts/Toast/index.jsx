import styles from './Toast.module.scss';
import { motion } from 'framer-motion';
import { useToastsContext } from 'renderer/context/ToastsContext';
import Logo from 'renderer/pages/Home/logo';
import Thinking from './Loaders/Thinking';
import Waiting from './Loaders/Waiting';
import Info from './Loaders/Info';
import { PaperclipIcon, SmileIcon, WarningIcon } from 'renderer/icons';
export default function Toast({ notification }) {
  const renderIcon = (type) => {
    switch (type) {
      case 'thinking':
        return <Thinking className={styles.icon} />;
      case 'waiting':
        return <Waiting className={styles.icon} />;
      case 'success':
        return null;
      case 'attached':
        return <PaperclipIcon className={styles.icon} />;
      case 'failed':
        return <WarningIcon className={styles.icon} />;
      default:
        return <Info className={styles.icon} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 0, scale: 0.9 }}
      transition={{ delay: 0.1 }}
    >
      <div className={`${styles.toast} ${styles[notification.type]}`}>
        {notification.message}
        {renderIcon(notification.type)}
      </div>
    </motion.div>
  );
}
