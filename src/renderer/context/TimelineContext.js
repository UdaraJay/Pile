import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import debounce from 'renderer/utils/debounce';

export const TimelineContext = createContext();

export const TimelineContextProvider = ({ children }) => {
  const [closestDate, _setClosestDate] = useState(new Date());

  const setClosestDate = debounce((val) => {
    _setClosestDate(val);
  }, 15);

  const timelineContextValue = { closestDate, setClosestDate };

  return (
    <TimelineContext.Provider value={timelineContextValue}>
      {children}
    </TimelineContext.Provider>
  );
};

export const useTimelineContext = () => useContext(TimelineContext);
