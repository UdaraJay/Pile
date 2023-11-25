import styles from './Status.module.scss';
import {
  SettingsIcon,
  CrossIcon,
  ReflectIcon,
  RefreshIcon,
  DiscIcon,
  DownloadIcon,
  FlameIcon,
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
  const [status, setStatus] = useState('Loading index...');
  const { initVectorIndex, rebuildVectorIndex, query, getVectorIndex } =
    useIndexContext();

  useEffect(() => {
    console.log('statusFromMain', statusFromMain);
    if (statusFromMain) {
      console.log('Setting status:', statusFromMain);
      setStatus(statusFromMain);

      const timer = setTimeout(() => {
        console.log('Clearing status after timeout');
        setStatus('');
      }, 3000);

      return () => {
        console.log('Clearing timer');
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
    // 3. If the index is empty and there are more than 1 entires -> Ask the user for permission to
    // rebuild the index
  };

  useEffect(() => {
    if (setupRun) return;
    setup();
    setSetupRun(true);
  }, [setupRun]);

  const renderIcon = (status) => {
    switch (status) {
      case 'Loading index...':
        return <Waiting className={styles.waiting} />;
      default:
        return <ReflectIcon className={styles.reflectIcon} />;
    }
  };

  return (
    <div className={styles.container}>
      {renderIcon()}
      <div className={styles.text}>{status || 'Search or Ask'}</div>
    </div>
  );
}
