import { useState, createContext, useContext, useEffect } from 'react'
import { useLocation } from 'react-router-dom';

export const PilesContext = createContext()

export const PilesContextProvider = ({ children }) => {
    const location = useLocation();
    const [currentPile, setCurrentPile] = useState(null);
    const [piles, setPiles] = useState([]);

    useEffect(() => {
        if(!location.pathname) return;
        const currentPileName = location.pathname.split('/').pop();
        changeCurrentPile(currentPileName);
    }, [location.pathname]);

    const getConfig = async () => {
        const configFilePath = window.electron.getConfigPath()
        // Setup piles.json if doesn't exist
        if (!window.electron.existsSync(configFilePath)) {
            window.electron.writeFile(configFilePath, JSON.stringify([]), err => {
                if (err){
                    console.error('Error writing to config')
                    return
                }

                setPiles([])
            });
        } else {
            await window.electron.readFile(configFilePath, (err, data) => {
                if (err) {
                    console.error('Error reading file', err);
                    return;
                }
                const jsonData = JSON.parse(data);
                setPiles(jsonData)
            })
        }
    }

    const writeConfig = async (piles) => {
         if(!piles) return;
        const configFilePath = window.electron.getConfigPath()
         window.electron.writeFile(configFilePath, JSON.stringify(piles), err => {
                if (err){
                    console.error('Error writing to config')
                    return
                }
        });
    }

    // Initialize config file
    useEffect(() => {
       getConfig();
    }, [])

    const createPile = (name = '', path = null) => {
        if(name == '' && path == null) return;

        if(piles.find((p) => p.name == name)){
            return;
        }

        const newPiles = [{name,path}, ...piles]
        setPiles(newPiles)
        writeConfig(newPiles)

        return name;
    }

    const changeCurrentPile = (name) => { 
        const pile = piles.find((p) => p.name == name);
        setCurrentPile(pile);
    }



    const pilesContextValue = {
        piles,
        createPile,
        currentPile,
        changeCurrentPile
    }

    return (
        <PilesContext.Provider value={pilesContextValue}>
            {children}
        </PilesContext.Provider>
    )
}

export const usePilesContext = () => useContext(PilesContext);
