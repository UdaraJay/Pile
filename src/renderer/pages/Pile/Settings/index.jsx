import styles from './Settings.module.scss';
import { SettingsIcon, CrossIcon } from 'renderer/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { availableModelsSources, useAIContext } from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';

export default function Settings() {
  const { ai, prompt, type, getKey, setKey, deleteKey, getModelName, setModelName, clearModelName, setModelType } = useAIContext();
  const [key, setCurrentKey] = useState('');
  const [modelName, setCurrentModelName] = useState('');
  const { currentTheme, setTheme } = usePilesContext();
  

  const retrieveKey = async () => {
    const k = await getKey();
    setCurrentKey(k);
  };

  const retrieveModelName = async () => {
    const m = await getModelName();
    setCurrentModelName(m);
  };


  useEffect(() => {
    retrieveKey();
    retrieveModelName();
  }, []);

  const handleOnChangeKey = (e) => {
    setCurrentKey(e.target.value);
  };

  const handleOnModelNameChange = (e) => {
    setCurrentModelName(e.target.value);
  };

  const handleSaveChanges = () => {
    if (type == "openai") {
      if (key == '') {
        deleteKey();
      } else {
        setKey(key);
      }
    } else {
      if (modelName == '') {
        clearModelName();
      } else {
        setModelName(modelName);
      }
    }
    


  };

  const renderModelOptions = () => {
    return Object.keys(availableModelsSources).map((model, index) => {
      return (
        <button
          key={`model-${model}`}
          className={`${styles.model} ${
            type == model && styles.current
          }`}
          onClick={() => {
            setModelType(model);
          }}
        
        >
          {availableModelsSources[model]}
        </button>
      );
    });
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

  const openAIOptions = () => {
    retrieveKey();
    console.log(key)
    return (
      <>
        <fieldset className={styles.Fieldset}>
          <label className={styles.Label} htmlFor="name">
            API key (OpenAI)
          </label>
          <input
            className={styles.Input}
            onChange={handleOnChangeKey}
            value={key || ''}
            placeholder="Paste an OpenAI API key to enable AI reflections"
            />
        </fieldset>
        <div className={styles.disclaimer}>
          Before you use the AI-powered features within this app, we{' '}
          <b>strongly recommend</b> that you configure a{' '}
          <a
            href="https://platform.openai.com/account/limits"
            target="_blank"
            >
            spending limit within OpenAI's interface
          </a>{' '}
          to prevent unexpected costs.
        </div>
      </>
    )
  }

  const ollamaOptions = () => {
    retrieveModelName();
    return (
      <>
        <fieldset className={styles.Fieldset}>
          <label className={styles.Label} htmlFor="name">
            Model Name
          </label>
          <input
            className={styles.Input}
            onChange={handleOnModelNameChange}
            value={modelName}
            placeholder="Enter a model name to enable AI reflections (eg. llama2)"
            />
        </fieldset>
        <div className={styles.disclaimer}>
          For a list of available models, see{' '}
          <a
            href="https://ollama.ai/library"
            target="_blank"
            >
            Ollama's library
          </a>{' '}
        </div>
      </>
    )
  }

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
              AI Model Source
            </label>
            <div className={styles.models}>{renderModelOptions()}</div>
            </fieldset>
          
          <div>{ type == "openai" ? openAIOptions() : ollamaOptions()}</div>
          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Prompt (locked)
            </label>
            <textarea
              className={styles.Textarea}
              placeholder="Enter your own prompt for AI reflections"
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
