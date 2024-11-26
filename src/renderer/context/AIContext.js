import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import OpenAI from 'openai';
import { usePilesContext } from './PilesContext';
import { useElectronStore } from 'renderer/hooks/useElectronStore';

const OLLAMA_URL = 'http://localhost:11434/api';
const OPENAI_URL = 'https://api.openai.com/v1';
const DEFAULT_PROMPT =
  'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

export const AIContext = createContext();

export const AIContextProvider = ({ children }) => {
  const { currentPile, updateCurrentPile } = usePilesContext();
  const [ai, setAi] = useState(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [pileAIProvider, setPileAIProvider] = useElectronStore(
    'pileAIProvider',
    'openai'
  );
  const [model, setModel] = useElectronStore('model', 'gpt-4o');
  const [embeddingModel, setEmbeddingModel] = useElectronStore(
    'embeddingModel',
    'mxbai-embed-large'
  );
  const [baseUrl, setBaseUrl] = useElectronStore('baseUrl', OPENAI_URL);

  const setupAi = useCallback(async () => {
    const key = await window.electron.ipc.invoke('get-ai-key');
    if (!key && pileAIProvider !== 'ollama') return;

    if (pileAIProvider === 'ollama') {
      setAi({ type: 'ollama' });
    } else {
      const openaiInstance = new OpenAI({
        baseURL: baseUrl,
        apiKey: key,
        dangerouslyAllowBrowser: true,
      });
      setAi({ type: 'openai', instance: openaiInstance });
    }
  }, [pileAIProvider, baseUrl]);

  useEffect(() => {
    if (currentPile) {
      console.log('🧠 Syncing current pile');
      if (currentPile.AIPrompt) setPrompt(currentPile.AIPrompt);
      setupAi();
    }
  }, [currentPile, baseUrl, setupAi]);

  const generateCompletion = useCallback(
    async (context, callback) => {
      if (!ai) return;

      try {
        if (ai.type === 'ollama') {
          const response = await fetch(`${OLLAMA_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, messages: context }),
          });

          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() !== '') {
                const jsonResponse = JSON.parse(line);
                if (!jsonResponse.done) {
                  callback(jsonResponse.message.content);
                }
              }
            }
          }
        } else {
          const stream = await ai.instance.chat.completions.create({
            model,
            stream: true,
            max_tokens: 500,
            messages: context,
          });

          for await (const part of stream) {
            callback(part.choices[0].delta.content);
          }
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
        {
          role: 'system',
          content: 'You can only respond in plaintext, do NOT use HTML.',
        },
        ...thread.map((post) => ({ role: 'user', content: post.content })),
      ];
    },
    [prompt]
  );

  const checkApiKeyValidity = async () => {
    // TODO: Add regex for OpenAPI and Ollama API keys
    const key = await window.electron.ipc.invoke('get-ai-key');
    
    if (key !== null) {
      return true;
    }

    return false;
  }

  const AIContextValue = {
    ai,
    baseUrl,
    setBaseUrl,
    prompt,
    setPrompt,
    setKey: (secretKey) => window.electron.ipc.invoke('set-ai-key', secretKey),
    getKey: () => window.electron.ipc.invoke('get-ai-key'),
    validKey: checkApiKeyValidity,
    deleteKey: () => window.electron.ipc.invoke('delete-ai-key'),
    updateSettings: (newPrompt) =>
      updateCurrentPile({ ...currentPile, AIPrompt: newPrompt }),
    model,
    setModel,
    embeddingModel,
    setEmbeddingModel,
    generateCompletion,
    prepareCompletionContext,
    pileAIProvider,
    setPileAIProvider,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
