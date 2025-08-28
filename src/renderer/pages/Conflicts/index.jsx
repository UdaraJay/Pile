import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../components/Conflicts/conflicts.module.scss';
import { localCache } from '../../lib/localCache';
import { syncManager } from '../../lib/syncManager';

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState([]);
  const [merging, setMerging] = useState(null); // { conflict, merged }
  const navigate = useNavigate();

  const load = async () => {
    const list = await localCache.getConflicts('pending');
    setConflicts(list);
  };

  useEffect(() => {
    load();
  }, []);

  const applyChoice = async (conflict, choice) => {
    const { table_name, item_id, local, remote } = conflict;
    const chosen = choice === 'local' ? local : remote;
    // Update local cache immediately
    if (table_name === 'posts') {
      await localCache.upsertPost(chosen);
    } else if (table_name === 'piles') {
      await localCache.upsertPile(chosen);
    }
    // Queue remote update
    await syncManager.queueOperation('UPDATE', table_name, { ...chosen });
    // Mark conflict resolved
    await localCache.resolveConflictRecord(conflict.id, choice, chosen);
    await load();
  };

  const openMerge = (conflict) => {
    const base = conflict.remote;
    setMerging({ conflict, merged: JSON.stringify(base, null, 2) });
  };

  const applyMerge = async () => {
    try {
      const { conflict, merged } = merging;
      const data = JSON.parse(merged);
      // Write locally and queue remote
      if (conflict.table_name === 'posts') {
        await localCache.upsertPost(data);
      } else if (conflict.table_name === 'piles') {
        await localCache.upsertPile(data);
      }
      await syncManager.queueOperation('UPDATE', conflict.table_name, { ...data });
      await localCache.resolveConflictRecord(conflict.id, 'merged', data);
      setMerging(null);
      await load();
    } catch (e) {
      alert('Invalid JSON for merged data: ' + e.message);
    }
  };

  return (
    <div className={styles.page}>
      <h2>Sync Conflicts</h2>
      {conflicts.length === 0 ? (
        <>
          <p>No pending conflicts.</p>
          <button className={styles.button} onClick={() => navigate('/')}>Back</button>
        </>
      ) : (
        <div className={styles.list}>
          {conflicts.map((c) => (
            <div className={styles.item} key={c.id}>
              <div>
                <strong>{c.table_name}</strong> — item {c.item_id}
              </div>
              <div className={styles.cols}>
                <div>
                  <div>Local</div>
                  <pre className={styles.pre}>{JSON.stringify(c.local, null, 2)}</pre>
                </div>
                <div>
                  <div>Remote</div>
                  <pre className={styles.pre}>{JSON.stringify(c.remote, null, 2)}</pre>
                </div>
              </div>
              <div className={styles.actions}>
                <button className={styles.button} onClick={() => applyChoice(c, 'local')}>Keep Local</button>
                <button className={styles.button} onClick={() => applyChoice(c, 'remote')}>Take Remote</button>
                <button className={`${styles.button} ${styles.subtle}`} onClick={() => openMerge(c)}>Merge...</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {merging && (
        <div style={{ marginTop: 16 }}>
          <h3>Merge JSON</h3>
          <textarea
            className={styles.textarea}
            value={merging.merged}
            onChange={(e) => setMerging({ ...merging, merged: e.target.value })}
          />
          <div className={styles.actions}>
            <button className={styles.button} onClick={applyMerge}>Apply Merge</button>
            <button className={`${styles.button} ${styles.subtle}`} onClick={() => setMerging(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

