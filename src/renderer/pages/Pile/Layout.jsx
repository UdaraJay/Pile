import { useParams, Link } from 'react-router-dom';
import { HomeIcon, ChevronLeftIcon, ChevronRightIcon } from 'renderer/icons';
import { useIndexContext } from 'renderer/context/IndexContext';
import { useEffect, useState, useMemo } from 'react';
import { DateTime } from 'luxon';
import { usePilesContext } from 'renderer/context/PilesContext';
import { useTimelineContext } from 'renderer/context/TimelineContext';
import { AnimatePresence, motion } from 'framer-motion';
import Settings from './Settings';
import StatusPill from 'renderer/components/Sync/StatusPill';
import AutoSyncManager from 'renderer/components/Sync/AutoSyncManager';
import HighlightsDialog from './Highlights';
import Toasts from './Toasts';
import Search from './Search';
import Sidebar from './Sidebar/Timeline/index';
import PresenceIndicator from '../../components/PresenceIndicator';
import styles from './PileLayout.module.scss';
import InstallUpdate from './InstallUpdate';
import Chat from './Chat';

export default function PileLayout({ children }) {
  const { pileName, pileId } = useParams();
  const { index, refreshIndex } = useIndexContext();
  const { visibleIndex, closestDate } = useTimelineContext();
  const { currentTheme, currentPile } = usePilesContext();
  

  const [now, setNow] = useState(DateTime.now().toFormat('cccc, LLL dd, yyyy'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    return currentTheme ? `${currentTheme}Theme` : '';
  }, [currentTheme]);

  const osStyles = useMemo(
    () => (window.electron.isMac ? styles.mac : styles.win),
    [],
  );

  return (
    <div className={`${styles.frame} ${themeStyles} ${osStyles}`}>
      <div className={styles.bg} />
      <div className={styles.main}>
        <AutoSyncManager />
        <div
          className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}
        >
          <div className={styles.top}>
            <div className={styles.part}>
              <button
                className={styles.toggleButton}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRightIcon className={styles.chevron} />
                ) : (
                  <ChevronLeftIcon className={styles.chevron} />
                )}
              </button>
              {!sidebarCollapsed && (
                <div className={styles.count}>
                  <span>{index.size}</span> entries
                </div>
              )}
            </div>
          </div>
          {!sidebarCollapsed && <Sidebar />}
        </div>
        <div
          className={`${styles.content} ${sidebarCollapsed ? styles.contentExpanded : ''}`}
        >
          <div className={styles.nav}>
            <div className={styles.left}>
              {currentPile?.name || pileName}
              <motion.span
                key={now}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {` ${now}`}
              </motion.span>
            </div>
            <div className={styles.right}>
              <StatusPill />
              <Toasts />
              <InstallUpdate />
              <Chat />
              <Search />
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
      <div id="reflections" />
      <div id="dialog" />
    </div>
  );
}
