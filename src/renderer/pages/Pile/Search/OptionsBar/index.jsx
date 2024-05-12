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
  RelevantIcon,
} from 'renderer/icons';
import styles from './OptionsBar.module.scss';
import * as Switch from '@radix-ui/react-switch';

export default function OptionsBar({ options, setOptions, onSubmit }) {
  const flipValue = (e) => {
    const key = e.target.name;
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRecent = (e) => {
    setOptions((prev) => ({ ...prev, sortOrder: e.target.name }));
  };

  const toggleSearchMode = () => {
    setOptions((prev) => ({ ...prev, semanticSearch: !prev.semanticSearch }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <button
          className={`${styles.button} ${
            options.sortOrder === 'relevance' && styles.active
          }`}
          name={'relevance'}
          onClick={toggleRecent}
        >
          <RelevantIcon className={styles.icon} /> Relevance
        </button>
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
      <div className={styles.right}>
        <div className={styles.switch}>
          <label className={styles.Label} htmlFor="semantic-search">
            Semantic
          </label>
          <Switch.Root
            id={'semantic-search'}
            className={styles.SwitchRoot}
            checked={options.semanticSearch}
            onCheckedChange={toggleSearchMode}
          >
            <Switch.Thumb className={styles.SwitchThumb} />
          </Switch.Root>
        </div>
      </div>
    </div>
  );
}
