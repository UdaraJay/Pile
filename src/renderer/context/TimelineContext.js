import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useLocation } from 'react-router-dom';
import debounce from 'renderer/utils/debounce';

export const TimelineContext = createContext();

export const TimelineContextProvider = ({ children }) => {
  const [visibleIndex, _setVisibleIndex] = useState(0);
  const [closestDate, setClosestDate] = useState(new Date());
  const virtualListRef = useRef(null);

  const setVisibleIndex = debounce((index) => {
    _setVisibleIndex(index);
  }, 15);

  const scrollToIndex = useCallback((index = 0) => {
    if (!virtualListRef.current) return;
    if (index == -1) return;
    virtualListRef.current.scrollToIndex({
      index,
      align: 'end',
      behavior: 'auto',
    });
  }, []);

  const timelineContextValue = {
    virtualListRef,
    visibleIndex,
    closestDate,
    setClosestDate,
    scrollToIndex,
    setVisibleIndex,
  };

  return (
    <TimelineContext.Provider value={timelineContextValue}>
      {children}
    </TimelineContext.Provider>
  );
};

export const useTimelineContext = () => useContext(TimelineContext);
