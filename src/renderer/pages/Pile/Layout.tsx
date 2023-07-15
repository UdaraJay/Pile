import { useParams, Link } from 'react-router-dom';
import styles from './PileLayout.module.scss';
import { HomeIcon, RefreshIcon, SearchIcon } from 'renderer/icons';
import Sidebar from './Sidebar';
import { CountUp } from 'use-count-up';
import usePost from 'renderer/hooks/usePost';
import { useIndexContext } from 'renderer/context/IndexContext';
import { useEffect, useState } from 'react';

export default function PileLayout({ children }) {
  const { pileName } = useParams();
  const { index } = useIndexContext();
  const [scrollPosition, setScrollPosition] = useState(0);
  const handleScroll = () => {
    const position = window.scrollY;
    setScrollPosition(position);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className={styles.frame}>
      <div className={styles.main}>
        <div className={styles.sidebar}>
          <div className={styles.top}>
            <div className={styles.count}>
              <span>
                <CountUp isCounting start={0} end={index.size} duration={3.2} />
              </span>{' '}
              posts in
            </div>
            <div className={styles.pile}>{pileName}</div>
          </div>
          <Sidebar />
        </div>
        <div className={styles.content}>
          <div
            className={`${styles.nav} ${
              scrollPosition > 5 && styles.showBorder
            }`}
          >
            <div className={styles.center}>
              {/* <div className={styles.search}>
                <SearchIcon className={styles.icon} />
                <input placeholder={'Search this pile...'} />
              </div> */}
            </div>
            <div className={styles.right}>
              <Link to={`/pile/${pileName}`} className={`${styles.iconHolder}`}>
                <RefreshIcon className={styles.icon} />
              </Link>
              <Link to="/" className={`${styles.iconHolder}`}>
                <HomeIcon className={styles.icon} />
              </Link>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
