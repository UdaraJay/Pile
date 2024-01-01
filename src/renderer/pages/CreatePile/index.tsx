import { useEffect, useState } from 'react';
import styles from './CreatePile.module.scss';
import { TrashIcon } from 'renderer/icons';
import { Link } from 'react-router-dom';
import { usePilesContext } from 'renderer/context/PilesContext';
import { useNavigate } from 'react-router-dom';
import icon from '../../../../assets/logo.png';
import { motion } from 'framer-motion';
const pilesList = ['Users/uj/Personal', 'Users/uj/Startup', 'Users/uj/School'];

export default function CreatePile() {
  const navigate = useNavigate();
  const { createPile } = usePilesContext();
  const [folderExists, setFolderExists] = useState(false);
  const [name, setName] = useState('');
  const [path, setPath] = useState('');

  useEffect(() => {
    window.electron.ipc.on('selected-directory', (path: string) => {
      setPath(path);
    });

    return () => {
      window.electron.ipc.removeAllListeners('selected-directory');
    };
  }, []);

  const handleNameChange = (e: any) => {
    setName(e.target.value);
  };

  const handleClick = () => {
    window.electron.ipc.sendMessage('open-file-dialog');
  };

  const handleSubmit = () => {
    if (!path) return;
    if (!name) return;

    createPile(name, path);
    navigate('/pile/' + name);
  };

  const renderPiles = () => {
    return pilesList.map((pile) => {
      const name = pile.split(/[/\\]/).pop();
      return (
        <div className={styles.pile} key={pile}>
          <div className={styles.left}>
            <div className={styles.name}>{name}</div>
            <div className={styles.src}>/Users/uj/Documents</div>
          </div>
          <div className={styles.right}>
            <TrashIcon className={styles.icon} />

            <div className={styles.button}>Open</div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className={styles.frame}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.name}>Create a new pile</div>
        </div>

        <div className={styles.form}>
          <div className={styles.input}>
            <div className={styles.des}>
              <label>Pile name</label>
              Pick a name for your new pile
            </div>
            <input
              type="text"
              placeholder="eg. Personal, School, Work"
              value={name}
              onChange={handleNameChange}
            />
          </div>
          <div className={styles.input}>
            <div className={styles.des}>
              <label>Location</label>
              Pick a place to store this pile
            </div>

            <button placeholder="Location" onClick={handleClick}>
              {path ? path : 'Choose a location'}
            </button>
          </div>
        </div>
        <div className={styles.buttons}>
          <Link to="/" className={styles.back}>
            ← Back
          </Link>
          <div className={styles.button} onClick={handleSubmit}>
            Create
          </div>
        </div>
      </div>
    </div>
  );
}
