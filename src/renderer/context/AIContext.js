import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import OpenAI from 'openai';
import { usePilesContext } from './PilesContext';

const defaultPrompt =
  'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

export const AIContext = createContext();

export const AIContextProvider = ({ children }) => {
  const { currentPile, updateCurrentPile } = usePilesContext();
  const [ai, setAi] = useState(null);
  const [prompt, setPrompt] = useState(defaultPrompt);

  // Sync AI settings from currentPile
  useEffect(() => {
    if (currentPile) {
      console.log('🧠 Syncing current pile');
      if (currentPile.AIPrompt && currentPile.AIPrompt !== '')
        setPrompt(currentPile.AIPrompt);
      setupAi();
    }
  }, [currentPile]);

  const setupAi = async () => {
    const key = await getKey();

    if (!key) return;
    const openaiInstance = new OpenAI({
      baseURL: getBaseUrl(),
      apiKey: key,
    });

    setAi(openaiInstance);
  };

  const getBaseUrl = () => {
    return localStorage.getItem('baseUrl') ?? 'https://api.openai.com/v1';
  };

  const setBaseUrl = async (baseUrl) => {
    localStorage.setItem('baseUrl', baseUrl);
    await setupAi();
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

  const getCompletion = async (model = 'gpt-3', context) => {
    const response = await ai.chat.completions.create({
      model: model,
      max_tokens: 200,
      messages: context,
    });

    return response;
  };

  const AIContextValue = {
    ai,
    getBaseUrl,
    setBaseUrl,
    prompt,
    setPrompt,
    setKey,
    getKey,
    deleteKey,
    getCompletion,
    updateSettings,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
