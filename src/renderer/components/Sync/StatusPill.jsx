import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePilesContext } from 'renderer/context/PilesContext';
import { ClockIcon, ExclamationTriangleIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import styles from './StatusPill.module.scss';

export default function StatusPill() {
  const { getCurrentPilePath, currentPile } = usePilesContext();
  const pilePath = useMemo(() => getCurrentPilePath?.() ?? null, [getCurrentPilePath, currentPile]);

  const [status, setStatus] = useState(null);

  const refresh = useCallback(async () => {
    if (!pilePath || !window.electron?.sync?.getStatus) {
      setStatus(null);
      return;
    }
    try {
      const res = await window.electron.sync.getStatus(pilePath);
      const pile = Array.isArray(res?.piles)
        ? res.piles.find((p) => p.pilePath === pilePath)
        : res;
      setStatus(pile || null);
    } catch (e) {
      // Fail quietly; pill will be hidden
      setStatus(null);
    }
  }, [pilePath]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  if (!status?.linked) return null;

  const queueLen = status.queueLen ?? 0;
  const conflicts = status.conflictsCount ?? 0;
  const lastSync = status.lastPushAt || status.lastPullAt;
  const Icon = queueLen > 0 ? ClockIcon : conflicts > 0 ? ExclamationTriangleIcon : CheckCircledIcon;

  return (
    <div
      className={styles.pill}
      title={
        lastSync
          ? `Last sync: ${new Date(lastSync).toLocaleString()}\nPending: ${queueLen}\nConflicts: ${conflicts}`
          : `Pending: ${queueLen}\nConflicts: ${conflicts}`
      }
    >
      <Icon width={14} height={14} />
      {queueLen > 0 && <span className={styles.count}>{queueLen}</span>}
    </div>
  );
}
