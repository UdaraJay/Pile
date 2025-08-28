import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.scss';
import { usePilesContext } from '../../context/PilesContext';
import { useAuth } from '../../context/AuthContext';
import DeletePile from './DeletePile';
import { TrashIcon } from 'renderer/icons';
import Logo from './logo';
import OpenPileFolder from './OpenPileFolder';
// Sync indicator removed from Home; only shown in threads
import ErrorBanner from '../../components/Sync/ErrorBanner';
import { CloudIcon } from 'renderer/icons';

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
    cloudPiles,
    allPiles,
    syncEnabled,
    loading: pilesLoading,
    createCloudPile,
    deleteCloudPile,
    isAuthenticated: pilesAuthenticated,
  } = usePilesContext();
  const { user, profile, signOut, isAuthenticated, loading } = useAuth();
  const [folderExists, setFolderExists] = useState(false);
  const [quote, setQuote] = useState(quotes[0]);
  const [showCreateCloudModal, setShowCreateCloudModal] = useState(false);
  const [cloudPileName, setCloudPileName] = useState('');
  const [cloudPileDescription, setCloudPileDescription] = useState('');

  useEffect(() => {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(quote);
  }, []);

  const handleCreateCloudPile = async () => {
    if (!cloudPileName.trim()) return;
    
    await createCloudPile(cloudPileName.trim(), cloudPileDescription.trim());
    setShowCreateCloudModal(false);
    setCloudPileName('');
    setCloudPileDescription('');
  };

  const renderPiles = () => {
    const displayPiles = isAuthenticated ? allPiles : piles;

    if (displayPiles.length == 0) {
      return (
        <div className={styles.noPiles}>
          {isAuthenticated
            ? 'No piles found. Create a local pile or sync your journals to the cloud.'
            : 'No existing piles. Start by creating a new pile.'}
        </div>
      );
    }

    return displayPiles.map((pile: any) => {
      const isCloudPile = pile.isCloudPile || pile.type === 'cloud';
      const pileKey = isCloudPile ? pile.id : pile.path;

      return (
        <div
          className={`${pile.theme && `${pile.theme}Theme`} ${styles.pile} ${isCloudPile ? styles.cloudPile : ''}`}
          key={pileKey}
        >
          <div className={styles.left}>
            <div className={styles.name}>
              {pile.name}
              {isCloudPile && <CloudIcon className={styles.cloudBadge} />}
            </div>
            {isCloudPile && pile.description && (
              <div className={styles.description}>{pile.description}</div>
            )}
            {!isCloudPile && <div className={styles.src}>{pile.path}</div>}
          </div>
          <div className={styles.right}>
            {!isCloudPile ? (
              <>
                <DeletePile pile={pile} />
                <OpenPileFolder pile={pile} />
                <Link to={`/pile/${pile.name}`} className={styles.button}>
                  Open
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        `Delete cloud pile "${pile.name}"? This cannot be undone.`,
                      )
                    ) {
                      await deleteCloudPile(pile.id);
                    }
                  }}
                  className={styles.iconButton}
                  title="Delete cloud pile"
                >
                  <TrashIcon className={styles.icon} />
                </button>
                <Link to={`/pile/cloud/${pile.id}`} className={styles.button}>
                  Open
                </Link>
              </>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className={styles.frame}>
      <div className={styles.wrapper}>
        {/* Authentication section - positioned absolutely */}
        <div className={styles.authSection}>
          {loading ? (
            <div className={styles.authStatus}>Loading...</div>
          ) : isAuthenticated ? (
            <div className={styles.userInfo}>
              <span className={styles.welcomeText}>
                Welcome, {profile?.display_name || user?.email}
              </span>
              <div className={styles.userActions}>
                <Link to="/profile" className={styles.button}>
                  Profile
                </Link>
                <button onClick={signOut} className={styles.button}>
                  Sign Out
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Main content - centered */}
        <div className={styles.content}>
          <ErrorBanner />
          <div className={styles.header}>
            <div className={styles.holder}>
              <div className={styles.iconHolder}>
                <Logo className={styles.icon} />
              </div>
              <div className={styles.name}>Pile</div>
            </div>
          </div>

          <div className={styles.createSection}>
            <Link to="/new-pile" className={styles.button}>
              Create a local pile →
            </Link>

            {isAuthenticated && (
              <button
                className={styles.button}
                onClick={() => setShowCreateCloudModal(true)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CloudIcon className={styles.cloudBadge} />
                  Create a cloud pile
                </span>
              </button>
            )}

            {!isAuthenticated && (
              <div className={styles.authButtonsRight}>
                <Link to="/auth/signin" className={styles.button}>
                  Sign In
                </Link>
                <Link to="/auth/signup" className={styles.button}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          <div className={styles.or}>
            or open an existing pile
          </div>

          <div className={styles.piles}>{renderPiles()}</div>

          <div className={styles.footer}>
            <a href="https://udara.io/pile" target="_blank" rel="noreferrer">
              <div className={styles.unms} />
              {quote}
            </a>

            <div className={styles.nav}>
              <Link to="/license" className={styles.link}>
                License
              </Link>
              <a
                href="https://udara.io/pile"
                target="_blank"
                className={styles.link}
                rel="noreferrer"
              >
                Tutorial
              </a>
              <a
                href="https://github.com/udarajay/pile"
                target="_blank"
                className={styles.link}
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Create Cloud Pile Modal */}
      {showCreateCloudModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateCloudModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>Create Cloud Pile</h2>
            <div className={styles.modalContent}>
              <div className={styles.inputGroup}>
                <label>Pile Name</label>
                <input
                  type="text"
                  value={cloudPileName}
                  onChange={(e) => setCloudPileName(e.target.value)}
                  placeholder="Enter pile name..."
                  autoFocus
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Description (optional)</label>
                <input
                  type="text"
                  value={cloudPileDescription}
                  onChange={(e) => setCloudPileDescription(e.target.value)}
                  placeholder="Enter description..."
                />
              </div>
              <div className={styles.modalButtons}>
                <button 
                  className={styles.button}
                  onClick={() => setShowCreateCloudModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className={styles.button}
                  onClick={handleCreateCloudPile}
                  disabled={!cloudPileName.trim()}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
