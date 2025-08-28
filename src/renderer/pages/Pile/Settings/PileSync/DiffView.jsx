import { useEffect, useMemo, useRef } from 'react';
import { diffLines, diffWords } from 'diff';
import styles from './index.module.scss';

function buildSideBySide(leftText, rightText) {
  const parts = diffLines(leftText || '', rightText || '');
  const left = [];
  const right = [];

  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (part.added) {
      // Lines only on right
      const lines = part.value.split('\n');
      // Drop final empty caused by trailing newline split
      if (lines[lines.length - 1] === '') lines.pop();
      lines.forEach((l) => {
        left.push({ type: 'pad', text: '' });
        right.push({ type: 'added', text: l });
      });
      i += 1;
    } else if (part.removed) {
      // Lines only on left
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      // If next part is an added block, attempt inline pairing
      const next = parts[i + 1];
      if (next && next.added) {
        const leftLines = lines;
        const rightLines = next.value.split('\n');
        if (rightLines[rightLines.length - 1] === '') rightLines.pop();

        const maxLen = Math.max(leftLines.length, rightLines.length);
        for (let k = 0; k < maxLen; k += 1) {
          const L = leftLines[k] ?? '';
          const R = rightLines[k] ?? '';
          if (L && R) {
            // Inline diff when both sides have a line
            const w = diffWords(L, R);
            left.push({ type: 'removed-inline', parts: w.map((p) => ({
              text: p.removed ? p.value : p.added ? '' : p.value,
              added: p.added,
              removed: p.removed,
            })) });
            right.push({ type: 'added-inline', parts: w.map((p) => ({
              text: p.added ? p.value : p.removed ? '' : p.value,
              added: p.added,
              removed: p.removed,
            })) });
          } else if (L && !R) {
            left.push({ type: 'removed', text: L });
            right.push({ type: 'pad', text: '' });
          } else if (!L && R) {
            left.push({ type: 'pad', text: '' });
            right.push({ type: 'added', text: R });
          }
        }
        i += 2; // consume removed + added pair
      } else {
        lines.forEach((l) => {
          left.push({ type: 'removed', text: l });
          right.push({ type: 'pad', text: '' });
        });
        i += 1;
      }
    } else {
      // Context lines on both sides
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      lines.forEach((l) => {
        left.push({ type: 'context', text: l });
        right.push({ type: 'context', text: l });
      });
      i += 1;
    }
  }
  return { left, right };
}

export default function DiffView({ left = '', right = '' }) {
  const { left: leftLines, right: rightLines } = useMemo(
    () => buildSideBySide(left, right),
    [left, right],
  );

  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    const A = leftRef.current;
    const B = rightRef.current;
    if (!A || !B) return () => {};
    let syncing = false;
    const onScrollA = () => {
      if (syncing) return;
      syncing = true;
      B.scrollTop = A.scrollTop;
      syncing = false;
    };
    const onScrollB = () => {
      if (syncing) return;
      syncing = true;
      A.scrollTop = B.scrollTop;
      syncing = false;
    };
    A.addEventListener('scroll', onScrollA);
    B.addEventListener('scroll', onScrollB);
    return () => {
      A.removeEventListener('scroll', onScrollA);
      B.removeEventListener('scroll', onScrollB);
    };
  }, []);

  const renderLine = (entry) => {
    if (entry.type === 'removed-inline' || entry.type === 'added-inline') {
      return (
        <div className={`${styles.line} ${entry.type === 'removed-inline' ? styles.removed : styles.added}`}>
          <code className={styles.code}>
            {entry.parts.map((p, idx) => {
              const isEmph = (entry.type === 'removed-inline' && p.removed) || (entry.type === 'added-inline' && p.added);
              if (!p.text) return null;
              return (
                <span
                  key={idx}
                  style={{ background: isEmph ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                >
                  {p.text}
                </span>
              );
            })}
          </code>
        </div>
      );
    }

    const cls = entry.type === 'added' ? styles.added
      : entry.type === 'removed' ? styles.removed
      : entry.type === 'pad' ? styles.pad
      : styles.context;
    return (
      <div className={`${styles.line} ${cls}`}>
        <code className={styles.code}>{entry.text || '\u00A0'}</code>
      </div>
    );
  };

  return (
    <div className={styles.diff}>
      <div className={styles.diffCol} ref={leftRef}>
        <div className={styles.diffHeader}>Local</div>
        {leftLines.map((e, idx) => (
          <div key={`L${idx}`} className={styles.rowWrap}>
            <div className={styles.gutter}>{idx + 1}</div>
            {renderLine(e)}
          </div>
        ))}
      </div>
      <div className={styles.diffCol} ref={rightRef}>
        <div className={styles.diffHeader}>Remote</div>
        {rightLines.map((e, idx) => (
          <div key={`R${idx}`} className={styles.rowWrap}>
            <div className={styles.gutter}>{idx + 1}</div>
            {renderLine(e)}
          </div>
        ))}
      </div>
    </div>
  );
}

