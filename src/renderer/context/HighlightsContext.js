import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { usePilesContext } from './PilesContext';

export const HighlightsContext = createContext();

export const HighlightsContextProvider = ({ children }) => {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const [open, setOpen] = useState(false);
  const [highlights, setHighlights] = useState(new Map());

  const openHighlights = (e) => {
    setOpen(true);
  };

  const onOpenChange = (open) => {
    setOpen(open);
  };

  useEffect(() => {
    if (currentPile) {
      loadHighlights(getCurrentPilePath());
    }
  }, [currentPile]);

  const loadHighlights = useCallback(async (pilePath) => {
    const newHighlights = await window.electron.ipc.invoke(
      'highlights-load',
      pilePath
    );
    const newMap = new Map(newHighlights);
    setHighlights(newMap);
  }, []);

  const refreshHighlights = useCallback(async () => {
    const newHighlights = await window.electron.ipc.invoke('highlights-get');
    const newMap = new Map(newHighlights);
    setHighlights(newMap);
  }, []);

  const createHighlight = useCallback(async ({ name, color }) => {
    const highlights = await window.electron.ipc.invoke('highlights-create', {
      name,
      color,
    });
    const newMap = new Map(highlights);
    setHighlights(newMap);
  }, []);

  const deleteHighlight = useCallback(async (highlight) => {
    const highlights = await window.electron.ipc.invoke(
      'highlights-delete',
      highlight
    );
    const newMap = new Map(highlights);
    setHighlights(newMap);
  }, []);

  const updateHighlight = useCallback(async ({ oldName, name, color }) => {
    const highlights = await window.electron.ipc.invoke('highlights-update', {
      oldName,
      name,
      color,
    });
    const newMap = new Map(highlights);
    setHighlights(newMap);
  }, []);

  const reorderHighlights = useCallback(async (orderedNames) => {
    const highlights = await window.electron.ipc.invoke(
      'highlights-reorder',
      orderedNames
    );
    const newMap = new Map(highlights);
    setHighlights(newMap);
  }, []);

  const highlightsContextValue = {
    open,
    openHighlights,
    onOpenChange,
    highlights,
    refreshHighlights,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    reorderHighlights,
  };

  return (
    <HighlightsContext.Provider value={highlightsContextValue}>
      {children}
    </HighlightsContext.Provider>
  );
};

export const useHighlightsContext = () => useContext(HighlightsContext);
