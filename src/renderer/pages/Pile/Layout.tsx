import { useParams, Link } from 'react-router-dom';
import styles from './PileLayout.module.scss';
import { HomeIcon } from 'renderer/icons';
import Sidebar from './Sidebar/Timeline/index';
import { useIndexContext } from 'renderer/context/IndexContext';
import { useEffect, useState, useMemo } from 'react';
import { DateTime } from 'luxon';
import Settings from './Settings';
import HighlightsDialog from './Highlights';
import { usePilesContext } from 'renderer/context/PilesContext';
import Toasts from './Toasts';
import Reflections from './Reflections';
import { useTimelineContext } from 'renderer/context/TimelineContext';
import { AnimatePresence, motion } from 'framer-motion';
import InstallUpdate from './InstallUpdate';

export default function PileLayout({ children }) {
  const { pileName } = useParams();
  const { index, refreshIndex } = useIndexContext();
  const { visibleIndex, closestDate } = useTimelineContext();
  const { currentTheme } = usePilesContext();

  const [now, setNow] = useState(DateTime.now().toFormat('cccc, LLL dd, yyyy'));

  useEffect(() => {
    try {
      if (visibleIndex < 5) {
        setNow(DateTime.now().toFormat('cccc, LLL dd, yyyy'));
      } else {
        setNow(DateTime.fromISO(closestDate).toFormat('cccc, LLL dd, yyyy'));
      }
    } catch (error) {
      console.log('Failed to render header date');
    }
  }, [visibleIndex, closestDate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const themeStyles = useMemo(() => {
    switch (currentTheme) {
      case 'purple':
        return styles.purpleTheme;
      case 'yellow':
        return styles.yellowTheme;
      case 'green':
        return styles.greenTheme;
      default:
        break;
    }
  }, [currentTheme]);

  const osStyles = useMemo(
    () => (window.electron.isMac ? styles.mac : styles.win),
    []
  );

  return (
    <div className={`${styles.frame} ${themeStyles} ${osStyles}`}>
      <div className={styles.bg}></div>
      <div className={styles.main}>
        <div className={styles.sidebar}>
          <div className={styles.top}>
            <div className={styles.part}>
              <div className={styles.count}>
                <span>{index.size}</span> entries
              </div>
            </div>
          </div>
          <Sidebar />
        </div>
        <div className={styles.content}>
          <div className={styles.nav}>
            <div className={styles.left}>
              {pileName} <span style={{ padding: '6px' }}>·</span>
              <motion.span
                key={now}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {now}
              </motion.span>
            </div>
            <div className={styles.right}>
              <Toasts />
<InstallUpdate/>
              <Reflections />
              <Settings />
              <Link to="/" className={`${styles.iconHolder}`}>
                <HomeIcon className={styles.homeIcon} />
              </Link>
              {/* <HighlightsDialog /> */}
            </div>
          </div>
          {children}
        </div>
      </div>
      <div id="reflections"></div>
      <div id="dialog"></div>
    </div>
  );
}
