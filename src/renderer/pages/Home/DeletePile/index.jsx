import { useEffect, useState } from 'react';
import { TrashIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { usePilesContext } from '../../../context/PilesContext';
import styles from './DeletePile.module.scss';

export default function DeletePile({ pile }) {
  const { deletePile } = usePilesContext();

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <button className={styles.iconButton}>
          <TrashIcon className={styles.icon} />
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.AlertDialogOverlay} />
        <AlertDialog.Content className={styles.AlertDialogContent}>
          <AlertDialog.Title className={styles.AlertDialogTitle}>
            Remove this Pile?
          </AlertDialog.Title>
          <AlertDialog.Description className={styles.AlertDialogDescription}>
            This action removes the <b>{pile.name}</b> Pile from the list, but
            it won't actually delete the Pile's files stored at{' '}
            <b>{pile.path}</b> from your computer.
            <br />
            <br />
            You can delete or backup your Pile folder, or import it back into
            Pile in the future.
          </AlertDialog.Description>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <AlertDialog.Cancel asChild>
              <button className={styles.cancelButton}>Cancel</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className={styles.confirmButton}
                onClick={() => {
                  deletePile(pile.name);
                }}
              >
                Yes, remove Pile
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
