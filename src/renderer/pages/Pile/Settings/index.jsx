import styles from './Settings.module.scss';
import { SettingsIcon, CrossIcon } from 'renderer/icons';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';

export default function Settings() {
  const { ai, prompt, getKey, setKey, deleteKey } = useAIContext();
  const [key, setCurrentKey] = useState('');
  const { currentTheme, setTheme } = usePilesContext();

  const retrieveKey = async () => {
    const k = await getKey();
    setCurrentKey(k);
  };

  useEffect(() => {
    retrieveKey();
  }, []);

  const handleOnChangeKey = (e) => {
    setCurrentKey(e.target.value);
  };

  const handleSaveChanges = () => {
    if (key == '') {
      deleteKey();
    } else {
      setKey(key);
    }
  };

  const renderThemes = () => {
    return Object.keys(availableThemes).map((theme) => {
      const colors = availableThemes[theme];
      return (
        <button
          key={`theme-${theme}`}
          className={`${styles.theme} ${
            currentTheme == theme && styles.current
          }`}
          onClick={() => {
            setTheme(theme);
          }}
        >
          <div
            className={styles.color1}
            style={{ background: colors.primary }}
          ></div>
          {/* <div
            className={styles.color2}
            style={{ background: colors.secondary }}
          ></div> */}
        </button>
      );
    });
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <div className={styles.iconHolder}>
          <SettingsIcon className={styles.settingsIcon} />
        </div>
      </Dialog.Trigger>
      <Dialog.Portal container={document.getElementById('dialog')}>
        <Dialog.Overlay className={styles.DialogOverlay} />
        <Dialog.Content className={styles.DialogContent}>
          <Dialog.Title className={styles.DialogTitle}>Settings</Dialog.Title>
          <Dialog.Description className={styles.DialogDescription}>
            Configuration options for your Pile and AI
          </Dialog.Description>

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Appearance
            </label>
            <div className={styles.themes}>{renderThemes()}</div>
          </fieldset>

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              API key (OpenAI)
            </label>
            <input
              className={styles.Input}
              onChange={handleOnChangeKey}
              value={key}
              placeholder="Paste an OpenAI API key to enable AI reflections"
            />
          </fieldset>
          <div className={styles.disclaimer}>
            Before you enable the AI-powered features within this app, we
            strongly recommend that you configure your own{' '}
            <a
              href="https://platform.openai.com/account/limits"
              target="_blank"
            >
              spending limit within OpenAI's interface
            </a>{' '}
            to prevent unexpected costs.
          </div>
          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Prompt (locked)
            </label>
            <textarea
              className={styles.Textarea}
              placeholder="Paste an OpenAI API key to enable AI reflections"
              value={prompt}
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
              <button className={styles.Button} onClick={handleSaveChanges}>
                Save changes
              </button>
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
