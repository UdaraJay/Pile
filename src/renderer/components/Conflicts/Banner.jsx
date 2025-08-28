import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { localCache } from '../../lib/localCache';
import styles from './conflicts.module.scss';

export default function ConflictBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const conflicts = await localCache.getConflicts('pending');
        if (mounted) setCount(conflicts.length);
      } catch (e) {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <div className={styles.banner}>
      <span>{count} sync conflict{count > 1 ? 's' : ''} detected</span>
      <Link to="/conflicts" className={styles.link}>Review</Link>
    </div>
  );
}

