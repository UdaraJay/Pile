import {
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
} from 'react';
import { usePilesContext } from './PilesContext';
import * as fileOperations from '../utils/fileOperations';
import { nanoid } from 'nanoid';

export const TimelineContext = createContext();

export const TimelineContextProvider = ({ children }) => {
  const { currentPile } = usePilesContext();
  const [timeline, setTimeline] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [postsWindow, setPostsWindow] = useState([new Date()]);

  useEffect(() => {
    if (!currentPile) return;
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const timeline = [];

    for (let d = now; d >= threeMonthsAgo; d.setDate(d.getDate() - 1)) {
      const month = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear().toString();
      const file = `${d.getDate()}.json`;
      const path = window.electron.joinPath(
        currentPile.path,
        year,
        month,
        file
      );
      timeline.push(path);
    }

    setTimeline(timeline);
  }, [currentPile]);

  const timelineContextValue = {
    timeline,
  };

  return (
    <TimelineContext.Provider value={timelineContextValue}>
      {children}
    </TimelineContext.Provider>
  );
};

export const useTimelineContext = () => useContext(TimelineContext);
