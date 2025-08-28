import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Home.module.scss';
import { usePilesContext } from '../../context/PilesContext';
import { useAuth } from '../../context/AuthContext';
import DeletePile from './DeletePile';
import { TrashIcon } from 'renderer/icons';
import Logo from './logo';
import OpenPileFolder from './OpenPileFolder';

const quotes = [
  'One moment at a time',
  'Scribe your soul',
  'Reflections reimagined',
  'Look back, leap forward!',
  'Tales of you - for every human is an epic in progress',
  'Your thoughtopia awaits',
  'The quintessence of quiet contemplation',
  'Journal jamboree',
];

export default function Home() {
  const {
    piles,
    loading: pilesLoading,
    createPile,
  } = usePilesContext();
  const { user, profile, signOut, isAuthenticated, loading } = useAuth();
  const [quote, setQuote] = useState(quotes[0]);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [remotePileId, setRemotePileId] = useState('');
  const [basePath, setBasePath] = useState('');
  const [newName, setNewName] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(randomQuote);
  }, []);

  useEffect(() => {
    const listener = (path: string) => setBasePath(path);
    window.electron.ipc.on('selected-directory', listener as any);
    return () => {
      window.electron.ipc.removeAllListeners('selected-directory');
    };
  }, []);


  const renderPiles = () => {
    if (piles.length === 0) {
      return (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.emptyState}
        >
          <div className={styles.emptyIcon}>📚</div>
          <h3 className={styles.emptyTitle}>No piles yet</h3>
          <p className={styles.emptyDescription}>
            Create your first pile to begin your journaling journey.
          </p>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className={styles.pilesGrid}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {piles.map((pile: any, index: number) => {
          const pileKey = pile.path;

          return (
            <motion.div
              key={pileKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={styles.pileCard}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.pileHeader}>
                <div className={styles.pileTitle}>
                  <h3 className={styles.pileName}>{pile.name}</h3>
                </div>
                
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className={styles.menuButton} aria-label="Pile options">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="19" cy="12" r="2"/>
                        <circle cx="5" cy="12" r="2"/>
                      </svg>
                    </button>
                  </DropdownMenu.Trigger>
                  
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5}>
                      <OpenPileFolder pile={pile} />
                      <DeletePile pile={pile} />
                      <DropdownMenu.Arrow className={styles.dropdownArrow} />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              <div className={styles.pileContent}>
                <p className={styles.pilePath}>{pile.path}</p>
              </div>

              <Link 
                to={`/pile/${pile.name}`} 
                className={styles.openButton}
              >
                Open Pile
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header with authentication */}
        <header className={styles.header}>
          <motion.div 
            className={styles.brandSection}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.logoWrapper}>
              <Logo className={styles.logo} />
            </div>
            <h1 className={styles.appName}>Pile</h1>
            <p className={styles.tagline}>{quote}</p>
          </motion.div>

          <motion.div 
            className={styles.authSection}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {loading ? (
              <div className={styles.authStatus}>Loading...</div>
            ) : isAuthenticated ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className={styles.userButton}>
                    <span className={styles.userName}>
                      {profile?.display_name || user?.email?.split('@')[0]}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z"/>
                    </svg>
                  </button>
                </DropdownMenu.Trigger>
                
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5}>
                    <DropdownMenu.Item className={styles.dropdownItem} asChild>
                      <Link to="/profile">Profile</Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className={styles.dropdownSeparator} />
                    <DropdownMenu.Item 
                      className={styles.dropdownItem}
                      onSelect={signOut}
                    >
                      Sign Out
                    </DropdownMenu.Item>
                    <DropdownMenu.Arrow className={styles.dropdownArrow} />
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <div className={styles.authButtons}>
                <Link to="/auth/signin" className={styles.secondaryButton}>
                  Sign In
                </Link>
                <Link to="/auth/signup" className={styles.primaryButton}>
                  Sign Up
                </Link>
              </div>
            )}
          </motion.div>
        </header>

        {/* Main content */}
        <main className={styles.main}>
          
          {/* Action buttons */}
          <motion.section 
            className={styles.actions}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/new-pile" className={styles.primaryButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Create pile
            </Link>

            <button
              className={styles.secondaryButton}
              onClick={() => setMigrateOpen(true)}
            >
              Import Cloud Pile
            </button>
          </motion.section>

          {/* Piles section */}
          <section className={styles.pilesSection}>
            {renderPiles()}
          </section>

          {/* Footer */}
          <footer className={styles.footer}>
            <div className={styles.footerContent}>
              <div className={styles.footerLinks}>
                <Link to="/license" className={styles.footerLink}>
                  License
                </Link>
                <a
                  href="https://udara.io/pile"
                  target="_blank"
                  className={styles.footerLink}
                  rel="noreferrer"
                >
                  Tutorial
                </a>
                <a
                  href="https://github.com/udarajay/pile"
                  target="_blank"
                  className={styles.footerLink}
                  rel="noreferrer"
                >
                  GitHub
                </a>
              </div>
            </div>
          </footer>
        </main>

      </div>

      {/* Migration Dialog */}
      <Dialog.Root open={migrateOpen} onOpenChange={setMigrateOpen}>
        <Dialog.Portal container={document.getElementById('dialog') as any}>
          <Dialog.Overlay className={styles.DialogOverlay as any} />
          <Dialog.Content className={styles.DialogContent as any}>
            <Dialog.Title className={styles.DialogTitle as any}>Import Cloud Pile</Dialog.Title>
            {(!isAuthenticated) && (
              <div style={{ color: 'orange', marginBottom: 8 }}>
                You need to sign in to import a cloud pile.
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Remote Pile ID</span>
                <input
                  type="text"
                  placeholder="e.g. 7b1e1f5a-..."
                  value={remotePileId}
                  onChange={(e) => setRemotePileId(e.target.value)}
                  style={{ padding: 8 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>New Pile Name</span>
                <input
                  type="text"
                  placeholder="e.g. ImportedNotes"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: 8 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Destination Folder</span>
                <button
                  className={styles.secondaryButton}
                  onClick={() => window.electron.ipc.sendMessage('open-file-dialog')}
                >
                  {basePath || 'Choose a destination folder'}
                </button>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  A new folder named "{newName || 'YourPileName'}" will be created here.
                </div>
              </label>
              {migrateError && (
                <div style={{ color: 'orange' }}>{migrateError}</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Dialog.Close asChild>
                <button className={styles.secondaryButton}>Cancel</button>
              </Dialog.Close>
              <button
                className={styles.primaryButton}
                disabled={!isAuthenticated || !remotePileId || !basePath || !newName || migrating}
                onClick={async () => {
                  try {
                    setMigrateError(null);
                    setMigrating(true);
                    // Create the pile folder and add to config
                    // createPile(name, selectedPath) -> will create folder join(basePath, newName)
                    // But we are on Home and do not navigate yet; we can compute path directly too
                    const destFolder = window.electron.joinPath(basePath, newName);
                    // Ensure config has the pile entry and directory exists
                    await window.electron.mkdir(destFolder);
                    await createPile(newName, basePath);
                    // Call migration
                    const res = await window.electron.sync.migrateCloudPile(remotePileId, destFolder);
                    if (res?.error) {
                      throw new Error(res.error);
                    }
                    // Navigate to the new pile; ensure it exists in config list
                    // Add to config via create pile helper if not present
                    if (!piles.find((p: any) => p.path === destFolder)) {
                      // Attempt to add to config by simulating a pile creation record
                      // Home doesn't expose writeConfig; simplest is to trigger a soft reload of config by creating pile entry
                      // We cannot import writeConfig here, so we rely on existing Create flow: createPile
                      // But we are outside context method scope here; keep UX by navigating and letting PilesContext pick it up
                    }
                    // Navigate to route using name
                    window.location.href = `/#/pile/${encodeURIComponent(newName)}`;
                    setMigrateOpen(false);
                  } catch (e: any) {
                    setMigrateError(e?.message || 'Migration failed');
                  } finally {
                    setMigrating(false);
                  }
                }}
              >
                {migrating ? 'Importing…' : 'Import'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
