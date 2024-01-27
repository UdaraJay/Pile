import {
  useState,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';

export const availableThemes = {
  light: { primary: '#4d80e6', secondary: '#fff' },
  purple: { primary: '#d014e1', secondary: '#fff' },
  yellow: { primary: '#ff9634', secondary: '#fff' },
  green: { primary: '#22ff00', secondary: '#fff' },
};

export const PilesContext = createContext();

export const PilesContextProvider = ({ children }) => {
  const location = useLocation();
  const [currentPile, setCurrentPile] = useState(null);
  const [piles, setPiles] = useState([]);

  // Initialize config file
  useEffect(() => {
    getConfig();
  }, [location]);

  // Set the current pile based on the url
  useEffect(() => {
    if (!location.pathname) return;
    if (!location.pathname.startsWith('/pile/')) return;

    const currentPileName = location.pathname.split(/[/\\]/).pop();

    changeCurrentPile(currentPileName);
  }, [location.pathname]);

  const getConfig = async () => {
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
    if (!piles) return;
    const configFilePath = window.electron.getConfigPath();
    window.electron.writeFile(configFilePath, JSON.stringify(piles), (err) => {
      if (err) {
        console.error('Error writing to config');
        return;
      }
    });
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
      window.electron.mkdir(path, (err) => {
        if (err) {
          console.error('Error creating pile folder', err);
          return;
        }
      });
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
      const _pile = { ...currentPile, theme: theme };
      updateCurrentPile(_pile);
    },
    [currentPile]
  );

  const pilesContextValue = {
    piles,
    getCurrentPilePath,
    createPile,
    currentPile,
    deletePile,
    currentTheme,
    setTheme,
    updateCurrentPile
  };

  return (
    <PilesContext.Provider value={pilesContextValue}>
      {children}
    </PilesContext.Provider>
  );
};

export const usePilesContext = () => useContext(PilesContext);
