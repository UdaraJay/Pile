import styles from './Blobs.module.scss';
import { AnimatePresence, motion } from 'framer-motion';

const Blobs = ({ show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="blobs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1}}
          exit={{ opacity: 0 }}
        >
          <div className={styles.blobCont}>
            <div className={`${styles.green} ${styles.blob}`}></div>
            <div className={`${styles.purple} ${styles.blob}`}></div>
            <div className={`${styles.black} ${styles.blob}`}></div>
            <svg>
              <filter id="noiseFilter">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.45"
                  stitchTiles="stitch"
                />
                <feComposite
                  operator="in"
                  in2="SourceGraphic"
                  result="monoNoise"
                />
                <feBlend in="SourceGraphic" in2="monoNoise" mode="screen" />
              </filter>
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Blobs;
