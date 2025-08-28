import {
  useState,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export const availableThemes = {
  light: { primary: '#ddd', secondary: '#fff' },
  blue: { primary: '#a4d5ff', secondary: '#fff' },
  purple: { primary: '#d014e1', secondary: '#fff' },
  yellow: { primary: '#ff9634', secondary: '#fff' },
  green: { primary: '#22ff00', secondary: '#fff' },
};

export const PilesContext = createContext();

export function PilesContextProvider({ children }) {
  const location = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [currentPile, setCurrentPile] = useState(null);
  const [piles, setPiles] = useState([]);
  const [cloudPiles, setCloudPiles] = useState([]);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize config file
  useEffect(() => {
    getConfig();
  }, [location]);

  // Load cloud piles when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !authLoading) {
      loadCloudPiles();
    } else {
      setCloudPiles([]);
      setSyncEnabled(false);
    }
  }, [isAuthenticated, user, authLoading]);

  // Set the current pile based on the url
  useEffect(() => {
    if (!location.pathname) return;
    if (!location.pathname.startsWith('/pile/')) return;

    const currentPileName = location.pathname.split(/[/\\]/).pop();

    changeCurrentPile(currentPileName);
  }, [location.pathname]);

  const getConfig = async () => {
    if (!window.electron?.getConfigPath) return;
    
    const configFilePath = window.electron.getConfigPath();

    // Setup new piles.json if doesn't exist,
    // or read in the existing
    if (!window.electron.existsSync(configFilePath)) {
      window.electron.writeFile(configFilePath, JSON.stringify([]), (err) => {
        if (err) return;
        setPiles([]);
      });
    } else {
      await window.electron.readFile(configFilePath, (err, data) => {
        if (err) return;
        const jsonData = JSON.parse(data);
        setPiles(jsonData);
      });
    }
  };

  const getCurrentPilePath = (appendPath = '') => {
    if (!currentPile) return;
    const pile = piles.find((p) => p.name == currentPile.name);
    const path = window.electron.joinPath(pile.path, appendPath);
    return path;
  };

  const writeConfig = async (piles) => {
    if (!piles || !window.electron?.getConfigPath) return;
    
    const configFilePath = window.electron.getConfigPath();
    window.electron.writeFile(configFilePath, JSON.stringify(piles), (err) => {
      if (err) {
        console.error('Error writing to config');
      }
    });
  };

  // Cloud pile management functions
  const loadCloudPiles = async () => {
    if (!isAuthenticated || !user) return;

    setLoading(true);
    try {
      // Use IPC to load piles from main process (where session is authenticated)
      const result = await window.electron?.auth?.getPiles();

      if (result?.error) {
        console.error('Error loading cloud piles:', result.error);
        return;
      }

      console.log('Loaded', result?.data?.length || 0, 'cloud piles via IPC');
      setCloudPiles(result?.data || []);
      setSyncEnabled(true);
    } catch (error) {
      console.error('Error loading cloud piles:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCloudPile = async (name, description = '', isPrivate = true) => {
    if (!isAuthenticated || !user) return null;

    try {
      const { data, error } = await supabase
        .from('piles')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim(),
          is_private: isPrivate,
          settings: {
            theme: 'light',
            sync_enabled: true,
          },
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating cloud pile:', error);
        return null;
      }

      // Refresh cloud piles
      await loadCloudPiles();
      return data;
    } catch (error) {
      console.error('Error creating cloud pile:', error);
      return null;
    }
  };

  const deleteCloudPile = async (pileId) => {
    if (!isAuthenticated || !user) return false;

    try {
      const { error } = await supabase
        .from('piles')
        .delete()
        .eq('id', pileId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting cloud pile:', error);
        return false;
      }

      // Refresh cloud piles
      await loadCloudPiles();
      return true;
    } catch (error) {
      console.error('Error deleting cloud pile:', error);
      return false;
    }
  };

  const updateCloudPile = async (pileId, updates) => {
    if (!isAuthenticated || !user) return false;

    try {
      const { data, error } = await supabase
        .from('piles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pileId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating cloud pile:', error);
        return false;
      }

      // Refresh cloud piles
      await loadCloudPiles();
      return data;
    } catch (error) {
      console.error('Error updating cloud pile:', error);
      return false;
    }
  };

  const createPile = (name = '', selectedPath = null) => {
    if (name == '' && selectedPath == null) return;

    let path = selectedPath;

    if (piles.find((p) => p.name == name)) {
      return;
    }

    // If selected directory is not empty, create a new directory
    if (!window.electron.isDirEmpty(selectedPath)) {
      path = window.electron.joinPath(selectedPath, name);
      window.electron.mkdir(path);
    }

    const newPiles = [{ name, path }, ...piles];
    setPiles(newPiles);
    writeConfig(newPiles);

    return name;
  };

  const changeCurrentPile = (name) => {
    if (!piles || piles.length == 0) return;
    const pile = piles.find((p) => p.name == name);
    setCurrentPile(pile);
  };

  // This does not delete the actual folder
  // User can do that if they actually want to.
  const deletePile = (name) => {
    if (!piles || piles.length == 0) return;
    const newPiles = piles.filter((p) => p.name != name);
    setPiles(newPiles);
    writeConfig(newPiles);
  };

  // Update current pile
  const updateCurrentPile = (newPile) => {
    const newPiles = piles.map((pile) => {
      if (pile.path === currentPile.path) {
        return newPile;
      }
      return pile;
    });
    writeConfig(newPiles);
    setCurrentPile(newPile);
  };

  // THEMES
  const currentTheme = useMemo(() => {
    return currentPile?.theme ?? 'light';
  }, [currentPile]);

  const setTheme = useCallback(
    (theme = 'light') => {
      const valid = Object.keys(availableThemes);
      if (!valid.includes(theme)) return;
      const _pile = { ...currentPile, theme };
      updateCurrentPile(_pile);
    },
    [currentPile],
  );

  // Combined piles for display (local + cloud)
  const allPiles = useMemo(() => {
    const combined = [...piles];
    if (isAuthenticated && syncEnabled) {
      cloudPiles.forEach((cloudPile) => {
        // Add cloud pile with identifier
        combined.push({
          ...cloudPile,
          isCloudPile: true,
          type: 'cloud',
        });
      });
    }
    return combined;
  }, [piles, cloudPiles, isAuthenticated, syncEnabled]);

  const pilesContextValue = {
    // Local piles
    piles,
    getCurrentPilePath,
    createPile,
    currentPile,
    deletePile,
    currentTheme,
    setTheme,
    updateCurrentPile,

    // Cloud piles
    cloudPiles,
    syncEnabled,
    loading,
    loadCloudPiles,
    createCloudPile,
    deleteCloudPile,
    updateCloudPile,

    // Combined
    allPiles,

    // Auth integration
    isAuthenticated,
    user,
  };

  return (
    <PilesContext.Provider value={pilesContextValue}>
      {children}
    </PilesContext.Provider>
  );
}

export const usePilesContext = () => useContext(PilesContext);
