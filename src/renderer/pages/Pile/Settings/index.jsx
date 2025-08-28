import { SettingsIcon, CrossIcon } from 'renderer/icons';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import { useAuth } from 'renderer/context/AuthContext';
import { useSyncContext } from 'renderer/context/SyncContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';
import { useIndexContext } from 'renderer/context/IndexContext';
import MigrationWizard from 'renderer/components/Sync/MigrationWizard';
import AISettingTabs from './AISettingsTabs';
import styles from './Settings.module.scss';

export default function Settings() {
  const { regenerateEmbeddings } = useIndexContext();
  const {
    ai,
    prompt,
    setPrompt,
    updateSettings,
    getKey,
    setKey,
    deleteKey,
    model,
    setModel,
  } = useAIContext();
  const { isAuthenticated, user } = useAuth();
  const { isOnline, isSyncing, canSync } = useSyncContext();
  const [APIkey, setCurrentKey] = useState('');
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);
  const { currentTheme, setTheme, currentPile } = usePilesContext();

  const retrieveKey = async () => {
    const k = await getKey();
    setCurrentKey(k);
  };

  useEffect(() => {
    retrieveKey();
  }, []);

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
    if (!APIkey || APIkey == '') {
      deleteKey();
    } else {
      console.log('save key', APIkey ? '[API key provided]' : '[no key]');
      setKey(APIkey);
    }

    updateSettings(prompt);
    saveCloudSyncSettings();
    // regenerateEmbeddings();
  };

  // Load cloud sync settings
  useEffect(() => {
    loadCloudSyncSettings();
  }, []);

  const loadCloudSyncSettings = async () => {
    try {
      const settings =
        (await window.electron.store.get('cloudSyncSettings')) || {};
      setCloudSyncEnabled(settings.enabled || false);
    } catch (error) {
      console.error('Error loading cloud sync settings:', error);
    }
  };

  const saveCloudSyncSettings = async () => {
    try {
      await window.electron.store.set('cloudSyncSettings', {
        enabled: cloudSyncEnabled,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving cloud sync settings:', error);
    }
  };

  const handleCloudSyncToggle = (enabled) => {
    if (enabled && !isAuthenticated) {
      // Store current location for redirect after auth
      const currentPath = window.location.pathname;
      window.electron?.store?.set('auth_return_url', currentPath);
      
      // Redirect to authentication if not logged in
      window.location.href = '/auth';
      return;
    }

    if (enabled && !currentPile?.isCloudPile) {
      // Show migration wizard for local piles
      setShowMigrationWizard(true);
    } else {
      setCloudSyncEnabled(enabled);
    }
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
          />
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

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Cloud Sync
            </label>
            <div className={styles.switch}>
              <div className={styles.Label}>
                <span>Enable Supabase Sync</span>
                {!isOnline && (
                  <span
                    style={{ color: 'var(--secondary)', fontSize: '0.75em' }}
                  >
                    (Offline)
                  </span>
                )}
              </div>
              <label className={styles.switchRoot}>
                <input
                  type="checkbox"
                  checked={cloudSyncEnabled}
                  onChange={(e) => handleCloudSyncToggle(e.target.checked)}
                  disabled={!isOnline}
                />
                <span className={styles.slider} />
              </label>
            </div>
            {!isAuthenticated && (
              <div className={styles.disclaimer}>
                You need to <a href="/auth">sign in</a> to enable cloud
                synchronization.
              </div>
            )}
            {isAuthenticated && cloudSyncEnabled && (
              <div className={styles.disclaimer}>
                Cloud sync is active. Your data will automatically sync with
                Supabase.
                {isSyncing && <span> Currently syncing...</span>}
              </div>
            )}
            {isAuthenticated &&
              !cloudSyncEnabled &&
              currentPile?.isCloudPile && (
                <div className={styles.disclaimer}>
                  This pile is already cloud-enabled. Toggle to enable automatic
                  sync.
                </div>
              )}
          </fieldset>

          <fieldset className={styles.Fieldset}>
            <label className={styles.Label} htmlFor="name">
              Select your AI provider
            </label>
            <AISettingTabs APIkey={APIkey} setCurrentKey={setCurrentKey} />
          </fieldset>

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

      {/* Migration Wizard */}
      <MigrationWizard
        isOpen={showMigrationWizard}
        onClose={() => setShowMigrationWizard(false)}
        onComplete={() => {
          setCloudSyncEnabled(true);
          setShowMigrationWizard(false);
        }}
      />
    </Dialog.Root>
  );
}
