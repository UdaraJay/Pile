import { useParams, Link } from 'react-router-dom';
import styles from './PileLayout.module.scss';
import { HomeIcon } from 'renderer/icons';
import Sidebar from './Sidebar/Timeline/index';
import { useIndexContext } from 'renderer/context/IndexContext';
import { useEffect, useCallback } from 'react';
import { DateTime } from 'luxon';
import Settings from './Settings';
import HighlightsDialog from './Highlights';
import { usePilesContext } from 'renderer/context/PilesContext';
import Toasts from './Toasts';
import Reflections from './Reflections';

export default function PileLayout({ children }) {
  const { pileName } = useParams();
  const { index, refreshIndex } = useIndexContext();
  const { currentTheme } = usePilesContext();
  const now = DateTime.now().toFormat('cccc, LLL dd, yyyy');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const themeStyles = useCallback(() => {
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

  return (
    <div className={`${styles.frame} ${themeStyles()}`}>
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
              {pileName} <span style={{ padding: '6px' }}>·</span> {now}
            </div>
            <div className={styles.right}>
              <Toasts />
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
