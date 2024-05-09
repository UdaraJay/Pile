import styles from './OptionsBar.module.scss';
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
  PaperclipIcon,
  HighlightIcon,
} from 'renderer/icons';

export default function OptionsBar({ options, setOptions }) {
  const flipValue = (e) => {
    const key = e.target.name;
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRecent = (e) => {
    setOptions((prev) => ({ ...prev, sortOrder: e.target.name }));
  };

  return (
    <div className={styles.container}>
      <button
        className={`${styles.button} ${
          options.sortOrder === 'mostRecent' && styles.active
        }`}
        name={'mostRecent'}
        onClick={toggleRecent}
      >
        ↑ Recent
      </button>
      <button
        className={`${styles.button} ${
          options.sortOrder === 'oldest' && styles.active
        }`}
        name={'oldest'}
        onClick={toggleRecent}
      >
        ↓ Oldest
      </button>
      <div className={styles.sep}>•</div>
      <button
        className={`${styles.button} ${
          options.onlyHighlighted && styles.active
        }`}
        name={'onlyHighlighted'}
        onClick={flipValue}
      >
        <HighlightIcon className={styles.icon} />
        Highlighted
      </button>
      <button
        className={`${styles.button} ${
          options.hasAttachments && styles.active
        }`}
        name={'hasAttachments'}
        onClick={flipValue}
      >
        <PaperclipIcon className={styles.icon} /> Attachments
      </button>
    </div>
  );
}
