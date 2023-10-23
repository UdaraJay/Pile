import styles from './Highlights.module.scss';
import { SettingsIcon, CrossIcon } from 'renderer/icons';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import { useHighlightsContext } from 'renderer/context/HighlightsContext';

export default function HighlightsDialog() {
  const { open, onOpenChange } = useHighlightsContext();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.DialogOverlay} />
        <Dialog.Content className={styles.DialogContent}>
          <Dialog.Title className={styles.DialogTitle}>Highlights</Dialog.Title>
          <Dialog.Description className={styles.DialogDescription}>
            Manage your hightlights for this Pile
          </Dialog.Description>
          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              API key (OpenAI / UNMS)
            </label>
            {/* <input
              className={styles.Input}
              onChange={handleOnChangeKey}
              value={key}
              placeholder="Paste an OpenAI API key to enable AI reflections"
            /> */}
          </fieldset>
          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Prompt (locked)
            </label>
            <textarea
              className={styles.Textarea}
              placeholder="Paste an OpenAI API key to enable AI reflections"
              readOnly
            />
          </fieldset>
          <div
            style={{
              display: 'flex',
              marginTop: 25,
              justifyContent: 'flex-end',
            }}
          >
            <Dialog.Close asChild>
              <button className={styles.Button}>Save changes</button>
            </Dialog.Close>
          </div>
          <Dialog.Close asChild>
            <button className={styles.IconButton} aria-label="Close">
              <CrossIcon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
