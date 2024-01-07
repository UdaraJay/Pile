import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import OpenAI from 'openai';
import ollama from '../../main/utils/ollama';
import { usePilesContext } from './PilesContext';
import { MetaIcon, MistralIcon, OpenAIIcon } from 'renderer/icons';

export const availableModelsProviders = {
  openai: 'OpenAI',
  ollama: 'Ollama',
};

export const recognizedModels = {
  gpt: {
    provider: 'openai',
    icon: OpenAIIcon,
  },
  llama: {
    provider: 'ollama',
    icon: MetaIcon,
  },
  mixtral: {
    provider: 'ollama',
    icon: MistralIcon,
  },
  mistral: {
    provider: 'ollama',
    icon: MistralIcon,
  },
  unknown: {
    provider: 'ollama',
    icon: MistralIcon,
  },
};

export const recognizeModel = (name = '') => {
  const baseModelName = name.split(/[-:]/)[0].toLowerCase();

  if (recognizedModels[baseModelName]) {
    return recognizedModels[baseModelName];
  } else {
    return recognizedModels.unknown;
  }
};

export const AIContext = createContext();

export const AIContextProvider = ({ children }) => {
  const { currentPile, updateCurrentPile } = usePilesContext();
  const [ai, setAi] = useState(null);
  const [model, setModel] = useState('gpt-4');
  const [provider, setProvider] = useState('openai');
  const [prompt, setPrompt] = useState(
    'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.'
  );

  // Sync provider, model and prompt from currentPile
  useEffect(() => {
    if (currentPile) {
      console.log('🧠 Syncing current pile');
      if (currentPile.AIProvider) setProvider(currentPile.AIProvider);
      if (currentPile.AIModel) setModel(currentPile.AIModel);
      if (currentPile.AIPrompt) setPrompt(currentPile.AIPrompt);
    }
  }, [currentPile]);

  useEffect(() => {
    console.log('🧠 Setting up AI');
    setupAi();
  }, [provider, model]);

  const setupAi = async () => {
    switch (provider) {
      case 'ollama':
        console.log('🧠 Ollama selected');
        const ollamaInstance = await ollama();
        setAi(ollamaInstance);
        break;
      default:
        console.log('🧠 OpenAI selected');
        const key = await getKey();
        if (key) {
          const openaiInstance = new OpenAI({
            apiKey: key,
          });
          setAi(openaiInstance);
          return;
        }
        break;
    }
  };

  const updateSettings = (provider, model, prompt) => {
    updateCurrentPile({
      ...currentPile,
      AIProvider: provider,
      AIModel: model,
      AIPrompt: prompt,
    });
  };

  const startOllama = () => {
    return window.electron.ipc.invoke('start-ollama');
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

  const getCompletion = async (context) => {
    const response = await ai.chat.completions.create({
      model: model,
      max_tokens: 200,
      messages: context,
    });

    return response;
  };

  const AIContextValue = {
    ai,
    prompt,
    setPrompt,
    model,
    setModel,
    provider,
    setProvider,
    updateSettings,
    setKey,
    getKey,
    deleteKey,
    getCompletion,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
