import styles from './InputBar.module.scss';
import {
  SettingsIcon,
  CrossIcon,
  ReflectIcon,
  RefreshIcon,
  DiscIcon,
  DownloadIcon,
  FlameIcon,
  InfoIcon,
  SearchIcon,
} from 'renderer/icons';
import { useEffect, useState, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAIContext } from 'renderer/context/AIContext';
import {
  availableThemes,
  usePilesContext,
} from 'renderer/context/PilesContext';
import { useIndexContext } from 'renderer/context/IndexContext';
import TextareaAutosize from 'react-textarea-autosize';
import useIPCListener from 'renderer/hooks/useIPCListener';
import Waiting from '../../Toasts/Toast/Loaders/Waiting';
import Thinking from '../../Toasts/Toast/Loaders/Thinking';

const prompts = [
  'Pose me any riddle or wonderment you wish',
  'You may consult this mind on any matter, mysterious or mundane',
];

let randomPrompt = () => prompts[Math.floor(Math.random() * prompts.length)];

export default function InputBar({
  value,
  onChange,
  close,
  querying = false,
  onSubmit,
}) {
  const statusFromMain = useIPCListener('vector-index', '');
  const [setupRun, setSetupRun] = useState(false);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState({
    type: 'loading',
    message: 'Loading index...',
  });
  const { initVectorIndex, rebuildVectorIndex, query, getVectorIndex } =
    useIndexContext();

  useEffect(() => {
    if (statusFromMain) {
      setStatus(statusFromMain.type);
      setMessage(statusFromMain);

      const timer = setTimeout(() => {
        setStatus('');
      }, 3000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [statusFromMain]);

  // Setup sequence for the vector store
  const setup = async () => {
    // 1. Get the vector store
    const vIndex = await getVectorIndex();
    if (vIndex) {
      setStatus('');
      return;
    }
    // 2. Initialize the vector store
    // 3. If the index is empty and there are more than 1 entires
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      onSubmit();
      event.preventDefault();
      return false;
    }
  };

  useEffect(() => {
    if (setupRun) return;
    setup();
    setSetupRun(true);
  }, [setupRun]);

  const renderIcon = (status) => {
    switch (status) {
      case 'loading':
        return <Waiting className={styles.waiting} />;
      case 'querying':
        return <Waiting className={styles.waiting} />;
      case 'indexing':
        return <Waiting className={styles.waiting} />;
      case 'done':
        return <InfoIcon className={styles.reflectIcon} />;
      default:
        return <SearchIcon className={styles.reflectIcon} />;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.bar}>
          {renderIcon(status)}
          <input
            value={value}
            onChange={onChange}
            className={styles.textarea}
            onKeyDown={handleKeyPress}
            placeholder={'Search your journal...'}
          />
        </div>
        <div className={styles.buttons}>
          <button
            className={`${styles.ask} ${querying && styles.processing}`}
            onClick={onSubmit}
            disabled={querying}
          >
            {querying ? <Thinking className={styles.spinner} /> : 'Search'}
          </button>
        </div>

        <Dialog.Close asChild>
          <button className={styles.close} aria-label="Close search">
            <CrossIcon className={styles.icon} />
          </button>
        </Dialog.Close>
      </div>
    </div>
  );
}
