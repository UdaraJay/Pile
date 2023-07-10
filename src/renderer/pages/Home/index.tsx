import { useEffect, useState } from 'react';
import styles from './Home.module.scss';
import { TrashIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import { usePilesContext } from '../../context/PilesContext';

const pilesList = ['Users/uj/Personal', 'Users/uj/Startup', 'Users/uj/School'];
export default function Home() {
  const { piles } = usePilesContext();
  const [folderExists, setFolderExists] = useState(false);

  useEffect(() => {}, []);

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
      <div className={styles.header}>
        <div className={styles.logo}></div>
        <div className={styles.name}>Pile</div>
        <div className={styles.version}>version 0.0.3</div>
      </div>

      <Link to="/new-pile" className={styles.create}>
        Create a new pile →
      </Link>

      <div className={styles.or}>or open an existing pile</div>

      <div className={styles.piles}>{renderPiles()}</div>

      <div className={styles.footer}>
        <div className={styles.unms}></div>
        Designed by <b>unms</b>, an ultra new media studio. <br />
      </div>
    </div>
  );
}
