import { useEffect, useState } from 'react';
import { FolderIcon, TrashIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import styles from './OpenPileFolder.module.scss';
import { usePilesContext } from '../../../context/PilesContext';

export default function OpenPileFolder({ pile }) {
  const { deletePile } = usePilesContext();
  const handleClick = () => {
    window.electron.openFolder(pile.path);
  };

  return (
    <button className={styles.iconButton} onClick={handleClick}>
      <FolderIcon className={styles.icon} />
    </button>
  );
}
