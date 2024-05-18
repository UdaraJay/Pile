import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import OpenAI from 'openai';
import { usePilesContext } from './PilesContext';

const OLLAMA_URL = 'http://localhost:11434/v1';
const OPENAI_URL = 'https://api.openai.com/v1';

const defaultPrompt =
  'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

export const AIContext = createContext();

const getBaseUrl = () => {
  return localStorage.getItem('baseUrl') ?? OPENAI_URL;
};

const getOllamaStatus = () => {
  return JSON.parse(localStorage.getItem('ollamaEnabled')) ?? false;
};

const getModel = () => {
  return localStorage.getItem('model') ?? 'gpt-4o';
};

export const AIContextProvider = ({ children }) => {
  const { currentPile, updateCurrentPile } = usePilesContext();
  const [ai, setAi] = useState(null);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [memory, setMemory] = useState([]);
  const [ollama, setOllama] = useState(getOllamaStatus() ?? false);
  const [model, setModelState] = useState(getModel());
  const [baseUrl, setBaseUrlState] = useState(getBaseUrl());

  // Sync AI settings from currentPile
  useEffect(() => {
    if (currentPile) {
      console.log('🧠 Syncing current pile');
      if (currentPile.AIPrompt && currentPile.AIPrompt !== '')
        setPrompt(currentPile.AIPrompt);
      setupAi();
    }
  }, [currentPile, ollama, baseUrl]);

  const setupAi = useCallback(async () => {
    const key = await getKey();

    if (!key) return;

    const openaiInstance = new OpenAI({
      baseURL: baseUrl,
      apiKey: ollama == true ? 'ollama' : key,
      dangerouslyAllowBrowser: true,
    });

    setAi(openaiInstance);
  }, [ollama, baseUrl]);

  const setBaseUrl = (baseUrl) => {
    localStorage.setItem('baseUrl', baseUrl);
    setBaseUrlState(baseUrl);
  };

  const setModel = async (model) => {
    localStorage.setItem('model', model);
    setModelState(model);
  };

  const toggleOllama = () => {
    setOllama((prev) => {
      if (!prev == true) {
        localStorage.setItem('ollamaEnabled', true);
        setModel('llama3');
        setBaseUrl(OLLAMA_URL);
      } else {
        localStorage.setItem('ollamaEnabled', false);
        setModel('gpt-4o');
        setBaseUrl(OPENAI_URL);
      }
      return !prev;
    });
  };

  const getKey = (accountName) => {
    return window.electron.ipc.invoke('get-ai-key');
  };

  const setKey = (secretKey) => {
    return window.electron.ipc.invoke('set-ai-key', secretKey);
  };

  const deleteKey = () => {
    return window.electron.ipc.invoke('delete-ai-key');
  };

  const updateSettings = (prompt) => {
    updateCurrentPile({
      ...currentPile,
      AIPrompt: prompt,
    });
  };

  const getResponse = useCallback(
    async (stream = false, messages = [], callback = () => {}) => {
      try {
        const stream = await ai({
          model: 'gpt-4-turbo',
          maxTokens: 400,
          messages: messages,
          stream: true,
        });

        if (stream === true) {
          for await (const part of stream) {
            const token = part.choices[0].delta.content;
            callback(token);
          }
        } else {
        }
      } catch (error) {
        console.error(error.message);
      }
    },
    [ai]
  );

  const AIContextValue = {
    ai,
    baseUrl,
    setBaseUrl,
    prompt,
    setPrompt,
    setKey,
    getKey,
    deleteKey,
    updateSettings,
    ollama,
    toggleOllama,
    model,
    setModel,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
