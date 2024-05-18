import styles from './Settings.module.scss';
import { SettingsIcon, CrossIcon, OllamaIcon } from 'renderer/icons';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';

export default function Settings() {
  const {
    ai,
    prompt,
    setPrompt,
    updateSettings,
    setBaseUrl,
    getKey,
    setKey,
    deleteKey,
    model,
    setModel,
    ollama,
    toggleOllama,
    baseUrl,
  } = useAIContext();
  const [key, setCurrentKey] = useState('');
  const { currentTheme, setTheme } = usePilesContext();

  const retrieveKey = async () => {
    const k = await getKey();
    setCurrentKey(k);
  };

  useEffect(() => {
    retrieveKey();
  }, []);

  const handleOnChangeBaseUrl = (e) => {
    setBaseUrl(e.target.value);
  };

  const handleOnChangeModel = (e) => {
    setModel(e.target.value);
  };

  const handleOnChangeKey = (e) => {
    setCurrentKey(e.target.value);
  };

  const handleOnChangePrompt = (e) => {
    const p = e.target.value ?? '';
    setPrompt(p);
  };

  const handleSaveChanges = () => {
    if (key == '') {
      deleteKey();
    } else {
      setKey(key);
    }

    updateSettings(prompt);
  };

  const renderThemes = () => {
    return Object.keys(availableThemes).map((theme, index) => {
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
          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Appearance
            </label>
            <div className={styles.themes}>{renderThemes()}</div>
          </fieldset>

          <div className={styles.providers}>
            {/* <fieldset className={styles.switch}>
              <label className={styles.Label} htmlFor="toggle-ollama">
                <OllamaIcon className={styles.icon} /> Use Ollama API
              </label>
              <label className={styles.switchRoot}>
                <input
                  type="checkbox"
                  checked={ollama}
                  onChange={toggleOllama}
                />
                <span className={styles.slider}></span>
              </label>
            </fieldset> */}

            <div className={styles.group}>
              <fieldset className={styles.Fieldset}>
                <label className={styles.Label} htmlFor="name">
                  Base url
                </label>
                <input
                  className={styles.Input}
                  onChange={handleOnChangeBaseUrl}
                  value={baseUrl}
                  placeholder="https://api.openai.com/v1"
                  defaultValue="https://api.openai.com/v1"
                />
              </fieldset>

              <fieldset className={styles.Fieldset}>
                <label className={styles.Label} htmlFor="name">
                  Model
                </label>
                <input
                  className={styles.Input}
                  onChange={handleOnChangeModel}
                  value={model}
                  placeholder="gpt-4-turbo"
                  defaultValue="gpt-4-turbo"
                />
              </fieldset>
            </div>

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
              Remember to manage your spend by setting up a budget in the API
              service you choose to use.
            </div>
          </div>

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              AI personality prompt
            </label>
            <textarea
              className={styles.Textarea}
              placeholder="Enter your own prompt for AI reflections"
              value={prompt}
              onChange={handleOnChangePrompt}
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
