import { useParams, Link } from 'react-router-dom';
import styles from './PileLayout.module.scss';
import { HomeIcon, RefreshIcon, SearchIcon } from 'renderer/icons';
import Sidebar from './Sidebar';
import { usePostsContext } from 'renderer/context/PostsContext';
import { CountUp } from 'use-count-up';

export default function PileLayout({ children }) {
  const { pileName } = useParams();
  const { posts } = usePostsContext();

  return (
    <div className={styles.frame}>
      <div className={styles.main}>
        <div className={styles.sidebar}>
          <div className={styles.top}>
            <div className={styles.count}>
              <span>
                <CountUp
                  isCounting
                  start={0}
                  end={posts.length}
                  duration={3.2}
                />
              </span>{' '}
              posts in
            </div>
            <div className={styles.pile}>{pileName}</div>
          </div>
          <Sidebar />
        </div>
        <div className={styles.content}>
          <div className={styles.nav}>
            <div className={styles.center}>
              <div className={styles.search}>
                <SearchIcon className={styles.icon} />
                <input placeholder={'Search this pile...'} />
              </div>
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
