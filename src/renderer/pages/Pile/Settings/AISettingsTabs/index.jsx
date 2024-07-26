import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import styles from './AISettingTabs.module.scss';
import { useAIContext } from 'renderer/context/AIContext';
import {
  usePilesContext,
  availableThemes,
} from 'renderer/context/PilesContext';
import { CardIcon, OllamaIcon, BoxOpenIcon } from 'renderer/icons';
import { useIndexContext } from 'renderer/context/IndexContext';

export default function AISettingTabs({ APIkey, setCurrentKey }) {
  const {
    prompt,
    setPrompt,
    updateSettings,
    setBaseUrl,
    getKey,
    setKey,
    deleteKey,
    model,
    setModel,
    embeddingModel,
    setEmbeddingModel,
    ollama,
    baseUrl,
    pileAIProvider,
    setPileAIProvider,
  } = useAIContext();

  const { currentTheme, setTheme } = usePilesContext();

  const handleTabChange = (newValue) => {
    setPileAIProvider(newValue);
  };

  const handleInputChange = (setter) => (e) => setter(e.target.value);

  const renderThemes = () => {
    return Object.entries(availableThemes).map(([theme, colors]) => (
      <button
        key={`theme-${theme}`}
        className={`${styles.theme} ${
          currentTheme === theme ? styles.current : ''
        }`}
        onClick={() => setTheme(theme)}
      >
        <div
          className={styles.color1}
          style={{ background: colors.primary }}
        ></div>
      </button>
    ));
  };

  return (
    <Tabs.Root
      className={styles.tabsRoot}
      defaultValue="openai"
      value={pileAIProvider}
      onValueChange={handleTabChange}
    >
      <Tabs.List className={styles.tabsList} aria-label="Manage your account">
        <Tabs.Trigger
          className={`${styles.tabsTrigger} ${
            pileAIProvider === 'ollama' ? styles.activeCenter : ''
          } ${pileAIProvider === 'openai' ? styles.activeRight : ''}`}
          value="subscription"
        >
          Subscription
          <CardIcon className={styles.icon} />
        </Tabs.Trigger>
        <Tabs.Trigger
          className={`${styles.tabsTrigger} ${
            pileAIProvider === 'subscription' ? styles.activeLeft : ''
          } ${pileAIProvider === 'openai' ? styles.activeRight : ''}`}
          value="ollama"
        >
          Ollama API
          <OllamaIcon className={styles.icon} />
        </Tabs.Trigger>
        <Tabs.Trigger
          className={`${styles.tabsTrigger} ${
            pileAIProvider === 'ollama' ? styles.activeCenter : ''
          }`}
          value="openai"
        >
          OpenAI API
          <BoxOpenIcon className={styles.icon} />
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content className={styles.tabsContent} value="subscription">
        <div className={styles.providers}>
          <div className={styles.pitch}>
            One simple subscription to use best-in-class AI with Pile, and
            support the project.
          </div>
          <div>
            <div className={styles.pro}>
              <div className={styles.left}>
                <div className={styles.price}>$9/month</div>
              </div>
              <div className={styles.right}>
                <div className={styles.subscribe}>Coming soon!</div>
              </div>
            </div>
            <div className={styles.disclaimer}>
              AI subscription for Pile is provided separately by{' '}
              <a href="https://un.ms" target="_blank">
                UNMS
              </a>
              . Subject to availability and capacity limits. Fair-use policy
              applies.
            </div>
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content className={styles.tabsContent} value="ollama">
        <div className={styles.providers}>
          <div className={styles.pitch}>
            Setup Ollama and set your preferred models here to use your local AI
            in Pile.
          </div>

          <div className={styles.group}>
            <fieldset className={styles.fieldset}>
              <label className={styles.label} htmlFor="ollama-model">
                Model
              </label>
              <input
                id="ollama-model"
                className={styles.input}
                onChange={handleInputChange(setModel)}
                value={model}
                defaultValue="llama3.1:70b"
                placeholder="llama3.1:70b"
              />
            </fieldset>
            <fieldset className={styles.fieldset}>
              <label className={styles.label} htmlFor="ollama-embedding-model">
                Embedding model
              </label>
              <input
                id="ollama-embedding-model"
                className={styles.input}
                onChange={handleInputChange(setEmbeddingModel)}
                value={embeddingModel}
                defaultValue="mxbai-embed-large"
                placeholder="mxbai-embed-large"
                disabled
              />
            </fieldset>
          </div>

          <div className={styles.disclaimer}>
            Ollama is the easiest way to run AI models on your own computer.
            Remember to pull your models in Ollama before using them in Pile.
            Learn more and download Ollama from{' '}
            <a href="https://ollama.com" target="_blank">
              ollama.com
            </a>
            .
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content className={styles.tabsContent} value="openai">
        <div className={styles.providers}>
          <div className={styles.pitch}>
            Create an API key in your OpenAI account and paste it here to start
            using GPT AI models in Pile.
          </div>

          <div className={styles.group}>
            <fieldset className={styles.fieldset}>
              <label className={styles.label} htmlFor="openai-base-url">
                Base URL
              </label>
              <input
                id="openai-base-url"
                className={styles.input}
                onChange={handleInputChange(setBaseUrl)}
                value={baseUrl}
                placeholder="https://api.openai.com/v1"
              />
            </fieldset>
            <fieldset className={styles.fieldset}>
              <label className={styles.label} htmlFor="openai-model">
                Model
              </label>
              <input
                id="openai-model"
                className={styles.input}
                onChange={handleInputChange(setModel)}
                value={model}
                placeholder="gpt-4o"
              />
            </fieldset>
          </div>
          <fieldset className={styles.fieldset}>
            <label className={styles.label} htmlFor="openai-api-key">
              OpenAI API key
            </label>
            <input
              id="openai-api-key"
              className={styles.input}
              onChange={handleInputChange(setCurrentKey)}
              value={APIkey}
              placeholder="Paste an OpenAI API key to enable AI reflections"
            />
          </fieldset>
          <div className={styles.disclaimer}>
            Remember to manage your spend by setting up a budget in the API
            service you choose to use.
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
