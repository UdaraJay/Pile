import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { usePilesContext } from 'renderer/context/PilesContext';
import styles from './index.module.scss';
import DiffView from './DiffView';

export default function ConflictsPanel({ onResolved }) {
  const { getCurrentPilePath, currentPile } = usePilesContext();
  const pilePath = useMemo(() => getCurrentPilePath?.() ?? null, [getCurrentPilePath, currentPile]);

  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadConflicts = useCallback(async () => {
    if (!pilePath) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.electron?.sync?.listConflicts(pilePath);
      setConflicts(Array.isArray(res?.conflicts) ? res.conflicts : []);
    } catch (e) {
      setError('Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  }, [pilePath]);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  const handleResolve = useCallback(
    async (postId, choice, mergedContent) => {
      if (!pilePath) return;
      try {
        const res = await window.electron.sync.resolveConflict(
          pilePath,
          postId,
          choice,
          mergedContent,
        );
        if (!res?.ok) {
          throw new Error(res?.error || 'Resolution failed');
        }
        await loadConflicts();
        onResolved?.();
      } catch (e) {
        setError(e?.message || 'Failed to resolve conflict');
      }
    },
    [pilePath, loadConflicts, onResolved],
  );

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <strong>Conflicts</strong>
        <button className={styles.btnSecondary} onClick={loadConflicts} disabled={loading}>
          Refresh
        </button>
        {loading && <span className={styles.muted}>Loading…</span>}
      </div>

      {error && <div className={styles.warning}>{error}</div>}

      {conflicts.length === 0 ? (
        <div className={styles.muted}>No conflicts found.</div>
      ) : (
        conflicts.map((c) => (
          <ConflictRow key={c.id} conflict={c} onResolve={handleResolve} />
        ))
      )}
    </div>
  );
}

function ConflictRow({ conflict, onResolve }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.row}>
      <span className={styles.warning}>⚠️</span>
      <span className={styles.muted}>Post</span>
      <code>{conflict.postId}</code>
      <span className={styles.muted}>
        Local: {new Date(conflict.updatedAtLocal).toLocaleString()}
      </span>
      <span className={styles.muted}>
        Remote: {new Date(conflict.updatedAtRemote).toLocaleString()}
      </span>
      <button className={styles.btn} onClick={() => onResolve(conflict.postId, 'local')}>Use Local</button>
      <button className={styles.btn} onClick={() => onResolve(conflict.postId, 'remote')}>Use Remote</button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className={styles.btnSecondary}>Review</button>
        </Dialog.Trigger>
        <ConflictDialog conflict={conflict} onResolve={onResolve} onClose={() => setOpen(false)} />
      </Dialog.Root>
    </div>
  );
}

function ConflictDialog({ conflict, onResolve, onClose }) {
  const { getCurrentPilePath, currentPile } = usePilesContext();
  const pilePath = useMemo(() => getCurrentPilePath?.() ?? null, [getCurrentPilePath, currentPile]);
  const [localContent, setLocalContent] = useState('');
  const [remoteContent, setRemoteContent] = useState('');
  const [mergedContent, setMergedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadArtifacts = useCallback(async () => {
    if (!pilePath) return;
    setLoading(true);
    setError(null);
    try {
      const [l, r] = await Promise.all([
        window.electron.sync.getConflictArtifact(pilePath, conflict.id, 'local'),
        window.electron.sync.getConflictArtifact(pilePath, conflict.id, 'remote'),
      ]);
      if (l?.error || r?.error) {
        throw new Error(l?.error || r?.error || 'Failed to load artifacts');
      }
      setLocalContent(l?.content || '');
      setRemoteContent(r?.content || '');
      setMergedContent(l?.content || '');
    } catch (e) {
      setError(e?.message || 'Failed to load artifacts');
    } finally {
      setLoading(false);
    }
  }, [pilePath, conflict?.id]);

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  return (
    <Dialog.Portal>
      <Dialog.Overlay className={styles.DialogOverlay} />
      <Dialog.Content className={styles.DialogContent} style={{ maxWidth: 900 }}>
        <Dialog.Title className={styles.DialogTitle}>Resolve Conflict: {conflict.postId}</Dialog.Title>
        {loading ? (
          <div className={styles.muted}>Loading versions…</div>
        ) : error ? (
          <div className={styles.warning}>{error}</div>
        ) : (
          <>
            <DiffView left={localContent} right={remoteContent} />
            <div className={styles.row}>
              <button className={styles.btn} onClick={() => onResolve(conflict.postId, 'local')}>Use Local</button>
              <button className={styles.btn} onClick={() => onResolve(conflict.postId, 'remote')}>Use Remote</button>
            </div>
          </>
        )}

        {!loading && !error && (
          <div style={{ marginTop: 12 }}>
            <div className={styles.muted}>Or edit a merged version</div>
            <textarea
              className={styles.Textarea}
              style={{ height: 160 }}
              value={mergedContent}
              onChange={(e) => setMergedContent(e.target.value)}
            />
            <button
              className={styles.btn}
              onClick={async () => {
                await onResolve(conflict.postId, 'merged', mergedContent);
                onClose?.();
              }}
            >
              Resolve with Merged
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Dialog.Close asChild>
            <button className={styles.btnSecondary}>Close</button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
