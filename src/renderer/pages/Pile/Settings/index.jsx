import styles from './Settings.module.scss';
import {
  SettingsIcon,
  CrossIcon,
  OpenAIIcon,
  OllamaIcon,
} from 'renderer/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  availableModelsProviders,
  recognizeModel,
  useAIContext,
} from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';
import { motion } from 'framer-motion';

export default function Settings() {
  const {
    ai,
    model,
    setModel,
    provider,
    setProvider,
    prompt,
    setPrompt,
    getKey,
    setKey,
    deleteKey,
    updateSettings,
  } = useAIContext();
  const [key, setCurrentKey] = useState('');
  const [modelName, setCurrentModelName] = useState('');
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

  const handleOnModelNameChange = (e) => {
    setModel(e.target.value);
  };

  const handleSaveChanges = () => {
    if (provider == 'openai') {
      if (key == '') {
        deleteKey();
      } else {
        setKey(key);
      }
    } else {
      if (model == '') {
        // clearModelName();
      } else {
        // setModelName(model);
      }
    }

    updateSettings(provider, model, prompt);
  };

  const handleOnChangePrompt = (e) => {
    const p = e.target.value ?? '';
    setPrompt(p);
  };

  const renderModelOptions = () => {
    return Object.keys(availableModelsProviders).map((_provider, index) => {
      return (
        <button
          key={`model-${_provider}`}
          className={`${styles.model} ${
            provider == _provider && styles.current
          }`}
          onClick={() => {
            setProvider(_provider);
            if (_provider == 'openai') {
              setModel('gpt-4');
            }
          }}
        >
          {_provider === 'openai' ? (
            <OpenAIIcon className={styles.icon} />
          ) : (
            <OllamaIcon className={`${styles.icon} ${styles.ollama}`} />
          )}
          {availableModelsProviders[_provider]}
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
    return (
      <>
        <fieldset className={styles.Fieldset}>
          <label className={styles.Label} htmlFor="name">
            OpenAI API key
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
          <a href="https://platform.openai.com/account/limits" target="_blank">
            spending limit within OpenAI's interface
          </a>{' '}
          to prevent unexpected costs.
        </div>
      </>
    );
  };

  const ollamaOptions = () => {
    const graphics = recognizeModel(model);
    return (
      <>
        <fieldset className={styles.Fieldset}>
          <label className={styles.Label} htmlFor="name">
            AI Model
          </label>
          <div className={styles.AIModelInput}>
            <input
              className={styles.text}
              onChange={handleOnModelNameChange}
              value={model}
              placeholder="(eg. mixtral)"
              spellcheck="false"
            />
            <motion.div
              key={model}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className={styles.aiiconholder}>
                <graphics.icon className={styles.aiicon} />
              </div>
            </motion.div>
          </div>
        </fieldset>
        <div className={styles.disclaimer}>
          <a href="https://ollama.ai/library" target="_blank">
            Ollama
          </a>{' '}
          needs to be installed and running the specified model for this to
          work. For a list of available models, see{' '}
          <a href="https://ollama.ai/library" target="_blank">
            Ollama's library
          </a>
          .{' '}
        </div>
      </>
    );
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
              AI Provider
            </label>
            <div className={styles.models}>{renderModelOptions()}</div>
          </fieldset>

          <div>{provider == 'openai' ? openAIOptions() : ollamaOptions()}</div>
          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Prompt
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
