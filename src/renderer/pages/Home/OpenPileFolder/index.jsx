import { useEffect, useState } from 'react';
import styles from './OpenPileFolder.module.scss';
import { FolderIcon, TrashIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import { usePilesContext } from '../../../context/PilesContext';

export default function OpenPileFolder({ pile }) {
  const { deletePile } = usePilesContext();
  const handleClick = () => {
    window.electron.openFolder(pile.path);
  };

  return (
    <button className={styles.button} onClick={handleClick}>
      <FolderIcon className={styles.icon} />
    </button>
  );
}
