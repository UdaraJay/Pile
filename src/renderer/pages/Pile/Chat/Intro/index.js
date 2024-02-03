import { OpenBookIcon } from 'renderer/icons';
import styles from './Intro.module.scss';
import { AnimatePresence, motion } from 'framer-motion';

const Intro = () => {
  return (
    <AnimatePresence>
      <motion.div
        key="intro"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{
          delay: 0.3,
          type: 'spring',
          stiffness: 50,
          duration: 1,
          scale: { duration: 1 },
        }}
        className={styles.intro}
      >
        <div className={styles.intro}>
          <OpenBookIcon className={styles.icon} />
          <div className={styles.title}>
          Start a conversation with your journal
          </div>
          <div className={styles.des}>
            The AI will use your journal entries as context for the conversation.
            It's not perfect yet, but we will improve it with time.
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Intro;
