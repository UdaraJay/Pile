import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';

export const TimelineContext = createContext();

export const TimelineContextProvider = ({ children }) => {
  const [closestDate, setClosestDate] = useState(new Date());

  const timelineContextValue = { closestDate, setClosestDate };

  return (
    <TimelineContext.Provider value={timelineContextValue}>
      {children}
    </TimelineContext.Provider>
  );
};

export const useTimelineContext = () => useContext(TimelineContext);
