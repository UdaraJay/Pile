import styles from './Status.module.scss';
import {
  SettingsIcon,
  CrossIcon,
  ReflectIcon,
  RefreshIcon,
  DiscIcon,
  DownloadIcon,
  FlameIcon,
  InfoIcon,
  ChatIcon,
} from 'renderer/icons';
import { useEffect, useState } from 'react';
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

export default function Status() {
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
        return <ChatIcon className={styles.reflectIcon} />;
    }
  };

  return (
    <div className={styles.container}>
      {renderIcon(status)}
      <div className={styles.text}>
        {status ? message.message : 'Chat with this journal'}
      </div>
    </div>
  );
}
