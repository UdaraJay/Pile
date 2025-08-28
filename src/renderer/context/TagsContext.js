import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { usePilesContext } from './PilesContext';

export const TagsContext = createContext();

export function TagsContextProvider({ children }) {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const [tags, setTags] = useState(new Map());

  useEffect(() => {
    if (!currentPile || currentPile.isCloudPile) return;
    const pilePath = getCurrentPilePath();
    if (pilePath) {
      loadTags(pilePath);
    }
  }, [currentPile]);

  const loadTags = useCallback(async (pilePath) => {
    const newTags = await window.electron.ipc.invoke('tags-load', pilePath);
    const newMap = new Map(newTags);
    setTags(newMap);
  }, []);

  const refreshTags = useCallback(async () => {
    const newTags = await window.electron.ipc.invoke('tags-get');
    const newMap = new Map(newTags);
    setTags(newMap);
  }, []);

  const syncTags = useCallback(async (filePath) => {
    window.electron.ipc.invoke('tags-sync', filePath).then((tags) => {
      setTags(tags);
    });
  }, []);

  const addTag = useCallback(async (tag, filePath) => {
    window.electron.ipc.invoke('tags-add', { tag, filePath }).then((tags) => {
      setTags(tags);
    });
  }, []);

  const removeTag = useCallback(async (tag, filePath) => {
    window.electron.ipc
      .invoke('tags-remove', { tag, filePath })
      .then((tags) => {
        setTags(tags);
      });
  }, []);

  const tagsContextValue = { tags, refreshTags, addTag, removeTag };

  return (
    <TagsContext.Provider value={tagsContextValue}>
      {children}
    </TagsContext.Provider>
  );
}

export const useTagsContext = () => useContext(TagsContext);
