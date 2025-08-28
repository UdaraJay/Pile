import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { usePilesContext } from './PilesContext';
import { useCloudPostsContext } from './CloudPostsContext';

export const IndexContext = createContext();

export function IndexContextProvider({ children }) {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { cloudPosts, getCloudPostsAsIndex, isCloudPile } =
    useCloudPostsContext();
  const [filters, setFilters] = useState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [index, setIndex] = useState(new Map());
  const [latestThreads, setLatestThreads] = useState([]);

  useEffect(() => {
    if (currentPile) {
      if (currentPile.isCloudPile) {
        loadCloudIndex();
      } else {
        loadIndex(getCurrentPilePath());
      }
      loadLatestThreads();
    }
  }, [currentPile]);

  // Load cloud posts into index format
  useEffect(() => {
    if (isCloudPile && cloudPosts.length > 0) {
      loadCloudIndex();
    }
  }, [cloudPosts, isCloudPile]);

  const loadIndex = useCallback(async (pilePath) => {
    const newIndex = await window.electron.ipc.invoke('index-load', pilePath);
    const newMap = new Map(newIndex);
    setIndex(newMap);
  }, []);

  const loadCloudIndex = useCallback(() => {
    if (!isCloudPile || !getCloudPostsAsIndex) return;

    const cloudIndex = getCloudPostsAsIndex();
    const newMap = new Map(cloudIndex);
    setIndex(newMap);
  }, [isCloudPile, getCloudPostsAsIndex]);

  const refreshIndex = useCallback(async () => {
    if (isCloudPile) {
      loadCloudIndex();
    } else {
      const newIndex = await window.electron.ipc.invoke('index-get');
      const newMap = new Map(newIndex);
      setIndex(newMap);
    }
  }, [isCloudPile, loadCloudIndex]);

  const prependIndex = useCallback((key, value) => {
    console.log('prepend index', key, value);
    setIndex((prevIndex) => {
      const newIndex = new Map([[key, value], ...prevIndex]);
      return newIndex;
    });
  }, []);

  const addIndex = useCallback(
    async (newEntryPath, parentPath = null) => {
      console.time('index-add-time');
      const pilePath = getCurrentPilePath();

      await window.electron.ipc
        .invoke('index-add', newEntryPath)
        .then((index) => {
          // setIndex(index);
          loadLatestThreads();
        });
      console.timeEnd('index-add-time');
    },
    [currentPile],
  );

  const regenerateEmbeddings = () => {
    window.electron.ipc.invoke('index-regenerate-embeddings');
  };

  const getThreadsAsText = useCallback(async (filePaths) => {
    if (isCloudPile) {
      const ids = (filePaths || []).map((p) => String(p).replace('cloud://', ''));
      const threads = (cloudPosts || [])
        .filter((p) => ids.includes(p.id))
        .map((p) => p.content || '');
      return threads;
    }
    return window.electron.ipc.invoke('index-get-threads-as-text', filePaths);
  }, [isCloudPile, cloudPosts]);

  const updateIndex = useCallback(async (filePath, data) => {
    window.electron.ipc.invoke('index-update', filePath, data).then((index) => {
      setIndex(index);
      loadLatestThreads();
    });
  }, []);

  const removeIndex = useCallback(async (filePath) => {
    window.electron.ipc.invoke('index-remove', filePath).then((index) => {
      setIndex(index);
    });
  }, []);

  const search = useCallback(async (query) => {
    if (isCloudPile) {
      const q = (query || '').toLowerCase();
      const results = (cloudPosts || [])
        .filter((p) => {
          if (!q) return true;
          const t = (p.title || '').toLowerCase();
          const c = (p.content || '').toLowerCase();
          return t.includes(q) || c.includes(q);
        })
        .map((p) => ({ ref: `cloud://${p.id}`, score: 1 }));
      return results;
    }
    return window.electron.ipc.invoke('index-search', query);
  }, [isCloudPile, cloudPosts]);

  const vectorSearch = useCallback(async (query, topN = 50) => {
    return window.electron.ipc.invoke('index-vector-search', query, topN);
  }, []);

  const loadLatestThreads = useCallback(async (count = 25) => {
    const items = await search('');
    const latest = items.slice(0, count);

    const entryFilePaths = latest.map((entry) => entry.ref);
    const latestThreadsAsText = await getThreadsAsText(entryFilePaths);

    setLatestThreads(latestThreadsAsText);
  }, []);

  const indexContextValue = {
    index,
    refreshIndex,
    addIndex,
    removeIndex,
    updateIndex,
    search,
    searchOpen,
    setSearchOpen,
    vectorSearch,
    getThreadsAsText,
    latestThreads,
    regenerateEmbeddings,
    prependIndex,
  };

  return (
    <IndexContext.Provider value={indexContextValue}>
      {children}
    </IndexContext.Provider>
  );
}

export const useIndexContext = () => useContext(IndexContext);
