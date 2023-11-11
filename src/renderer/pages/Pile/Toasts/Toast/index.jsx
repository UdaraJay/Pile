import styles from './Toast.module.scss';
import { motion } from 'framer-motion';
import { useToastsContext } from 'renderer/context/ToastsContext';
import Logo from 'renderer/pages/Home/logo';
import Thinking from './Thinking';

export default function Toast({ notification }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0 }}
      transition={{ delay: 1 }}
    >
      <div className={styles.toast}>
        <Thinking className={styles.icon} />
        {notification.message}
      </div>
    </motion.div>
  );
}
