import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import styles from './Ball.module.scss';
import { useHighlightsContext } from 'renderer/context/HighlightsContext';

const Ball = ({
  isAI,
  highlightColor,
  cycleColor = () => {},
  setHighlight = () => {},
}) => {
  const { openHighlights, highlights } = useHighlightsContext();

  const [bookmarksChecked, setBookmarksChecked] = React.useState(true);
  const [urlsChecked, setUrlsChecked] = React.useState(false);
  const [person, setPerson] = React.useState('pedro');

  const renderHightlights = () => {
    return Array.from(highlights, ([highlight, data]) => {
      return (
        <DropdownMenu.Item
          className={styles.DropdownMenuItem}
          onSelect={() => setHighlight(highlight)}
        >
          <div
            className={styles.menuBall}
            style={{ background: data.color }}
          ></div>
          {highlight}
        </DropdownMenu.Item>
      );
    });
  };

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          tabIndex={2}
          className={`${styles.ball} ${isAI && styles.ai}`}
          style={{
            backgroundColor: highlightColor,
          }}
          aria-label="Change highlight"
        ></button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.DropdownMenuContent}
          sideOffset={6}
          side="right"
          align="start"
        >
          <DropdownMenu.Item
            className={styles.DropdownMenuItem}
            onSelect={() => setHighlight(null)}
          >
            <div
              className={styles.menuBall}
              style={{ background: 'var(--border)' }}
            ></div>
            None
          </DropdownMenu.Item>
          {renderHightlights()}
          {/* <DropdownMenu.Item
            className={styles.DropdownMenuItem}
            onSelect={openHighlights}
          >
            <div
              className={styles.menuBall}
              style={{ background: 'var(--border)' }}
            >
              +
            </div>
            Create new highlight
          </DropdownMenu.Item> */}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default Ball;
