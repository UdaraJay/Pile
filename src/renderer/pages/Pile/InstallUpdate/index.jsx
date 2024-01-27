import styles from './InstallUpdate.module.scss';
import { RefreshIcon } from 'renderer/icons';
import { useEffect, useState, useMemo } from 'react';
import { useAutoUpdateContext } from 'renderer/context/AutoUpdateContext';

export default function InstallUpdate() {
  const { updateAvailable, restartAndUpdate } = useAutoUpdateContext();

  if (updateAvailable !== true) return;

  return (
    <div onClick={restartAndUpdate} className={styles.update}>
      <RefreshIcon className={styles.icon} /> Install Update
    </div>
  );
}
