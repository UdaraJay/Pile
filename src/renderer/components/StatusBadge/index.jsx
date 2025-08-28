import React from 'react';
import styles from './StatusBadge.module.scss';

export default function StatusBadge({ kind = 'todo', children }) {
  const className = `${styles.badge} ${
    kind === 'done' ? styles.done : styles.todo
  }`;

  return <span className={className}>{children}</span>;
}

