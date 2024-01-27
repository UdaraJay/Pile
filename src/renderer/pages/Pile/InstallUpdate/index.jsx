import styles from './InstallUpdate.module.scss';
import { RefreshIcon } from 'renderer/icons';
import { useEffect, useState, useMemo } from 'react';
import { useAutoUpdateContext } from 'renderer/context/AutoUpdateContext';

export default function InstallUpdate() {
  const { updateDownloaded,updateError, restartAndUpdate } = useAutoUpdateContext();

  if (updateError) return;
  if (updateDownloaded !== true) return;

  return (
    <div onClick={restartAndUpdate} className={styles.update}>
      <RefreshIcon className={styles.icon} /> Restart to update
    </div>
  );
}
