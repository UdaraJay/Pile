import { useParams, Link } from 'react-router-dom';
import styles from './PileLayout.module.scss';
import { HomeIcon } from 'renderer/icons';
import Sidebar from './Sidebar/Timeline/index';
import { CountUp } from 'use-count-up';
import usePost from 'renderer/hooks/usePost';
import { useIndexContext } from 'renderer/context/IndexContext';
import { useEffect, useState } from 'react';
import { DateTime } from 'luxon';
import Settings from './Settings';
import HighlightsDialog from './Highlights';
import styles from './Pile.module.scss';

export default function PileLayout({ children }) {
  const { pileName } = useParams();
  const { index, refreshIndex } = useIndexContext();

  const now = DateTime.now().toLocaleString(DateTime.DATE_HUGE);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className={styles.frame}>
      <div className={styles.main}>
        <div className={styles.sidebar}>
          <div className={styles.top}>
            <div className={styles.part}>
              <div className={styles.count}>
                <span>
                  <CountUp
                    isCounting
                    start={0}
                    end={index.size}
                    duration={3.2}
                  />
                </span>{' '}
                entries
              </div>
            </div>
          </div>
          <Sidebar />
        </div>
        <div className={styles.content}>
          <div className={styles.nav}>
            <div className={styles.left}>
              {/* <div className={styles.search}>
                <SearchIcon className={styles.icon} />
                <input placeholder={'Search this pile...'} />
              </div> */}
              {pileName} <span style={{ padding: '6px' }}>·</span> {now}
            </div>
            <div className={styles.right}>
              <Settings />
              <HighlightsDialog />
              <Link to="/" className={`${styles.iconHolder}`}>
                <HomeIcon className={styles.homeIcon} />
              </Link>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
