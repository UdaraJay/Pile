import { useEffect, useState } from 'react';
import styles from './Home.module.scss';
import { TrashIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import { usePilesContext } from '../../context/PilesContext';

const pilesList = ['Users/uj/Personal', 'Users/uj/Startup', 'Users/uj/School'];

const quotes = [
  // 'One moment at a time',
  'Scribe your soul',
  // 'Reflections reimagined',
  // 'Look back, leap forward!',
  // 'Tales of you - for every human is an epic in progress',
  'Your thoughtopia awaits',
  'The quintessence of quiet contemplation',
  // 'Journal jamboree',
  // 'Because even a mound starts with a single memory!',
];

export default function Home() {
  const { piles } = usePilesContext();
  const [folderExists, setFolderExists] = useState(false);
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setQuote(quote);
  }, []);

  const renderPiles = () => {
    return piles.map((pile: any) => {
      return (
        <div className={styles.pile} key={pile.path}>
          <div className={styles.left}>
            <div className={styles.name}>{pile.name}</div>
            <div className={styles.src}>{pile.path}</div>
          </div>
          <div className={styles.right}>
            <TrashIcon className={styles.icon} />

            <Link to={`/pile/${pile.name}`} className={styles.button}>
              Open
            </Link>
          </div>
        </div>
      );
    });
  };

  return (
    <div className={styles.frame}>
      <div className={styles.bg}></div>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.logo}></div>
          <div className={styles.name}>Pile</div>
          <div className={styles.version}>{quote}</div>
        </div>

        <Link to="/new-pile" className={styles.create}>
          Create a new pile →
        </Link>

        <div className={styles.or}>or open an existing pile</div>

        <div className={styles.piles}>{renderPiles()}</div>

        <div className={styles.footer}>
          <div className={styles.unms}></div>
          DARE TO DREAM, DARE TO CREATE
          <div className={styles.nav}>
            <Link to="/license" className={styles.link}>
              License
            </Link>
            <Link to="/credits" className={styles.link}>
              Credits
            </Link>
            <Link to="/license" className={styles.link}>
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
