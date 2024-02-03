import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { usePilesContext } from './PilesContext';

export const IndexContext = createContext();

export const IndexContextProvider = ({ children }) => {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const [filters, setFilters] = useState();
  const [index, setIndex] = useState(new Map());

  useEffect(() => {
    if (currentPile) {
      loadIndex(getCurrentPilePath());
    }
  }, [currentPile]);

  const loadIndex = useCallback(async (pilePath) => {
    const newIndex = await window.electron.ipc.invoke('index-load', pilePath);
    const newMap = new Map(newIndex);
    setIndex(newMap);
  }, []);

  const refreshIndex = useCallback(async () => {
    const newIndex = await window.electron.ipc.invoke('index-get');
    const newMap = new Map(newIndex);
    setIndex(newMap);
  }, []);

  const addIndex = useCallback(
    async (newEntryPath, parentPath = null) => {
      const pilePath = getCurrentPilePath();

      await window.electron.ipc
        .invoke('index-add', newEntryPath)
        .then((index) => {
          setIndex(index);
        });

      // Sync to vector store
      await window.electron.ipc.invoke(
        'vectorindex-add',
        pilePath,
        newEntryPath,
        parentPath
      );
    },
    [currentPile]
  );

  const updateIndex = useCallback(async (filePath, data) => {
    // setIndex((prevMap) => {
    //   const newMap = new Map(prevMap);
    //   newMap.set(filePath, data);
    //   return newMap;
    // });

    window.electron.ipc.invoke('index-update', filePath, data).then((index) => {
      // setIndex(index);
    });
  }, []);

  const removeIndex = useCallback(async (filePath) => {
    window.electron.ipc.invoke('index-remove', filePath).then((index) => {
      setIndex(index);
    });
  }, []);

  const initVectorIndex = useCallback(async () => {
    const pilePath = getCurrentPilePath();
    window.electron.ipc.invoke('vectorindex-init', pilePath);
  }, [currentPile]);

  const rebuildVectorIndex = useCallback(async () => {
    const pilePath = getCurrentPilePath();
    window.electron.ipc.invoke('vectorindex-rebuild', pilePath);
  }, [currentPile]);

  const query = useCallback(
    async (text) => window.electron.ipc.invoke('vectorindex-query', text),
    [currentPile]
  );

  const chat = useCallback(
    async (text) => window.electron.ipc.invoke('vectorindex-chat', text),
    [currentPile]
  );
  
  const resetChat = useCallback(
    async (text) => window.electron.ipc.invoke('vectorindex-reset-chat'),
    [currentPile]
  );

  const getVectorIndex = useCallback(async () => {
    const pilePath = getCurrentPilePath();
    const vIndex = await window.electron.ipc.invoke(
      'vectorindex-get',
      pilePath
    );
    return vIndex;
  }, [currentPile]);

  const indexContextValue = {
    index,
    refreshIndex,
    addIndex,
    removeIndex,
    initVectorIndex,
    rebuildVectorIndex,
    getVectorIndex,
    updateIndex,
    query,
    chat,
    resetChat,
  };

  return (
    <IndexContext.Provider value={indexContextValue}>
      {children}
    </IndexContext.Provider>
  );
};

export const useIndexContext = () => useContext(IndexContext);
