import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import OpenAI from 'openai';
import { usePilesContext } from './PilesContext';
import { useLocalStorage } from 'renderer/hooks/useLocalStorage';

const OLLAMA_URL = 'http://localhost:11434/v1';
const OPENAI_URL = 'https://api.openai.com/v1';
const DEFAULT_PROMPT =
  'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

export const AIContext = createContext();

export const AIContextProvider = ({ children }) => {
  const { currentPile, updateCurrentPile } = usePilesContext();
  const [ai, setAi] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);

  const [ollama, setOllama] = useLocalStorage('ollamaEnabled', false);
  const [model, setModel] = useLocalStorage('model', 'gpt-4o');
  const [baseUrl, setBaseUrl] = useLocalStorage('baseUrl', OPENAI_URL);

  const setupAi = useCallback(async () => {
    const key = await window.electron.ipc.invoke('get-ai-key');
    if (!key) return;

    const openaiInstance = new OpenAI({
      baseURL: baseUrl,
      apiKey: ollama ? 'ollama' : key,
      dangerouslyAllowBrowser: true,
    });

    setAi(openaiInstance);
  }, [ollama, baseUrl]);

  useEffect(() => {
    if (currentPile) {
      console.log('🧠 Syncing current pile');
      if (currentPile.AIPrompt) setPrompt(currentPile.AIPrompt);
      setupAi();
    }
  }, [currentPile, ollama, baseUrl, setupAi]);

  const toggleOllama = () => {
    setOllama((prev) => {
      const newValue = !prev;
      setModel(newValue ? 'llama3' : 'gpt-4o');
      setBaseUrl(newValue ? OLLAMA_URL : OPENAI_URL);
      return newValue;
    });
  };

  const updateSettings = (newPrompt) => {
    updateCurrentPile({ ...currentPile, AIPrompt: newPrompt });
  };

  const generateCompletion = useCallback(
    async (context, callback) => {
      if (!ai) return;

      try {
        const stream = await ai.chat.completions.create({
          model,
          stream: true,
          max_tokens: 400,
          messages: context,
        });

        for await (const part of stream) {
          callback(part.choices[0].delta.content);
        }
      } catch (error) {
        console.error('AI request failed:', error);
        throw error;
      }
    },
    [ai, model]
  );

  const prepareCompletionContext = useCallback(
    (thread) => {
      return [
        { role: 'system', content: prompt },
        ...thread.map((post) => ({ role: 'user', content: post.content })),
        {
          role: 'system',
          content: 'You can only respond in plaintext, do NOT use HTML.',
        },
      ];
    },
    [prompt]
  );

  const AIContextValue = {
    ai,
    baseUrl,
    setBaseUrl,
    prompt,
    setPrompt,
    setKey: (secretKey) => window.electron.ipc.invoke('set-ai-key', secretKey),
    getKey: () => window.electron.ipc.invoke('get-ai-key'),
    deleteKey: () => window.electron.ipc.invoke('delete-ai-key'),
    updateSettings,
    ollama,
    toggleOllama,
    model,
    setModel,
    generateCompletion,
    prepareCompletionContext,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
