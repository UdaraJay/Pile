import React, { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useAIContext } from 'renderer/context/AIContext';
import {
  usePilesContext,
  availableThemes,
} from 'renderer/context/PilesContext';
import { BoxOpenIcon } from 'renderer/icons';
import { useIndexContext } from 'renderer/context/IndexContext';
import styles from './AISettingTabs.module.scss';

export default function AISettingTabs({ APIkey, setCurrentKey }) {
  const {
    prompt,
    setPrompt,
    updateSettings,
    useCustomThinkDeeperPrompt,
    setUseCustomThinkDeeperPrompt,
    customThinkDeeperPrompt,
    setCustomThinkDeeperPrompt,
    thinkDeeperPreset,
    setBaseUrl,
    getKey,
    setKey,
    testApiKey,
    deleteKey,
    model,
    setModel,
    pileAIProvider,
    setPileAIProvider,
    useMockAI,
    setUseMockAI,
  } = useAIContext();

  const [keyTestStatus, setKeyTestStatus] = useState(null); // null, 'testing', 'valid', 'invalid'
  const [keyTestError, setKeyTestError] = useState('');

  const { currentTheme, setTheme } = usePilesContext();

  const handleTabChange = (newValue) => {
    setPileAIProvider(newValue);
  };

  const handleInputChange = (setter) => (e) => setter(e.target.value);

  const handleTestApiKey = async () => {
    if (!APIkey || APIkey.trim().length === 0) {
      setKeyTestStatus('invalid');
      setKeyTestError('Please enter an API key first');
      return;
    }

    setKeyTestStatus('testing');
    setKeyTestError('');

    try {
      const result = await testApiKey(APIkey);
      if (result.success && result.isValid) {
        setKeyTestStatus('valid');
        setKeyTestError('');
      } else {
        setKeyTestStatus('invalid');
        setKeyTestError(result.error || 'Invalid API key');
      }
    } catch (error) {
      setKeyTestStatus('invalid');
      setKeyTestError('Failed to test API key');
    }
  };

  const getKeyTestButtonText = () => {
    switch (keyTestStatus) {
      case 'testing':
        return 'Testing...';
      case 'valid':
        return '✓ Valid';
      case 'invalid':
        return '✗ Invalid';
      default:
        return 'Test Key';
    }
  };

  const getKeyTestButtonClass = () => {
    let baseClass = styles.testButton;
    switch (keyTestStatus) {
      case 'testing':
        return `${baseClass} ${styles.testing}`;
      case 'valid':
        return `${baseClass} ${styles.valid}`;
      case 'invalid':
        return `${baseClass} ${styles.invalid}`;
      default:
        return baseClass;
    }
  };

  const renderThemes = () => {
    return Object.entries(availableThemes).map(([theme, colors]) => (
      <button
        key={`theme-${theme}`}
        className={`${styles.theme} ${
          currentTheme === theme ? styles.current : ''
        }`}
        onClick={() => setTheme(theme)}
      >
        <div className={styles.color1} style={{ background: colors.primary }} />
      </button>
    ));
  };

  return (
    <Tabs.Root
      className={styles.tabsRoot}
      defaultValue="gemini"
      value={pileAIProvider}
      onValueChange={handleTabChange}
    >
      <Tabs.List className={styles.tabsList} aria-label="Manage your account">
        <Tabs.Trigger className={`${styles.tabsTrigger}`} value="gemini">
          Gemini API
          <BoxOpenIcon className={styles.icon} />
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content className={styles.tabsContent} value="gemini">
        <div className={styles.providers}>
          <div className={styles.pitch}>
            Create an API key in your Google AI Studio account and paste it here
            to start using Gemini AI models in Pile.
          </div>

          <div className={styles.group}>
            <fieldset className={styles.fieldset}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={useMockAI}
                  onChange={(e) => setUseMockAI(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Use Mock AI (for testing)
              </label>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <label className={styles.label} htmlFor="gemini-model">
                Model
              </label>
              <select
                id="gemini-model"
                className={styles.input}
                onChange={handleInputChange(setModel)}
                value={model}
                disabled={useMockAI}
              >
                <option value="gemini-2.5-flash">
                  gemini-2.5-flash (Fast & Efficient - Recommended)
                </option>
                <option value="gemini-2.5-pro">
                  gemini-2.5-pro (Most Powerful with Thinking)
                </option>
                <option value="gemini-2.5-flash-lite-preview-06-17">
                  gemini-2.5-flash-lite (Low Cost & High Speed)
                </option>
              </select>
            </fieldset>
          </div>
          <fieldset className={styles.fieldset}>
            <label className={styles.label} htmlFor="gemini-api-key">
              Gemini API key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="gemini-api-key"
                className={styles.input}
                onChange={handleInputChange(setCurrentKey)}
                value={APIkey}
                placeholder="Paste a Gemini API key to enable AI reflections"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={getKeyTestButtonClass()}
                onClick={handleTestApiKey}
                disabled={keyTestStatus === 'testing' || useMockAI}
              >
                {getKeyTestButtonText()}
              </button>
            </div>
            {keyTestError && (
              <div className={styles.keyTestError}>
                {keyTestError}
              </div>
            )}
          </fieldset>
          <fieldset className={styles.fieldset}>
              <label className={styles.label}>Think Deeper prompt preset</label>
              <div className={styles.switch}>
                <div className={styles.Label}>
                  <span>Use custom prompt (override Mindsera preset)</span>
                </div>
                <label className={styles.switchRoot}>
                  <input
                    type="checkbox"
                    checked={useCustomThinkDeeperPrompt}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUseCustomThinkDeeperPrompt(checked);
                      if (checked && (!customThinkDeeperPrompt || customThinkDeeperPrompt.trim().length === 0)) {
                        setCustomThinkDeeperPrompt(thinkDeeperPreset);
                      }
                    }}
                  />
                  <span className={styles.slider} />
                </label>
              </div>
              {useCustomThinkDeeperPrompt && (
                <div style={{ marginTop: 10 }}>
                  <label className={styles.label} htmlFor="custom-td-prompt">
                    Custom Think Deeper prompt
                  </label>
                  <textarea
                    id="custom-td-prompt"
                    className={styles.input}
                    rows={10}
                    value={customThinkDeeperPrompt}
                    onChange={(e) => setCustomThinkDeeperPrompt(e.target.value)}
                    placeholder="Paste or write your custom Think Deeper system prompt"
                    style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button
                      type="button"
                      className={styles.testButton}
                      onClick={() => setCustomThinkDeeperPrompt(thinkDeeperPreset)}
                    >
                      Reset to Mindsera preset
                    </button>
                  </div>
                </div>
              )}
            </fieldset>
          <div className={styles.disclaimer}>
            Get your free Gemini API key from Google AI Studio. Remember to
            monitor your usage and set up quotas as needed.
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}
