import React from 'react';
import styles from './OutlineView.module.scss';

function OutlineView({ summary, stale = false }) {
  if (!summary) return null;

  const { title, summary: text, mood, confidence } = summary;

  return (
    <div className={styles.wrapper}>
      <div className={styles.label}>Summary</div>
      <div className={styles.headerRow}>
        <div className={styles.title}>{title || 'Summary'}</div>
        <div className={styles.right}>{stale && <div className={styles.badge}>New since summary</div>}</div>
      </div>

      {text && <div className={styles.summaryText}>{text}</div>}

      <div className={styles.metaRow}>
        {mood && <div className={styles.meta}>Mood: {mood}</div>}
        {typeof confidence === 'number' && (
          <div className={styles.meta}>Confidence: {(confidence * 100).toFixed(0)}%</div>
        )}
      </div>

      <div className={styles.divider} />
    </div>
  );
}

export default OutlineView;
