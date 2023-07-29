import { useEffect, useState } from 'react';
import styles from './Home.module.scss';
import { PileIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import { usePilesContext } from '../../context/PilesContext';
import DeletePile from './DeletePile';
import icon from '../../../../assets/icon.svg';
import { motion } from 'framer-motion';
import Logo from './logo';

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
            <DeletePile pile={pile} />

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
      {/* <div className={styles.bg}></div> */}
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Logo className={styles.icon} />

          <div className={styles.name}>Pile</div>
          <div className={styles.version}>{quote}</div>
        </div>

        <Link to="/new-pile" className={styles.create}>
          Create a new pile →
        </Link>

        <div className={styles.or}>or open an existing pile</div>

        <div className={styles.piles}>{renderPiles()}</div>

        <div className={styles.footer}>
          <a href="https://un.ms" target="_blank">
            <div className={styles.unms}></div>
            Crafted with care by Udara Jay.
          </a>

          <div className={styles.nav}>
            <Link to="/license" className={styles.link}>
              License
            </Link>
            <a href="https://un.ms" target="_blank" className={styles.link}>
              Tips & Tricks
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
