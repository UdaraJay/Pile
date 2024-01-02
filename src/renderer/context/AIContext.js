import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import OpenAI from 'openai';
import ollama from '../../main/utils/ollama';
// import { set } from 'main/utils/pileLinks';

export const AIContext = createContext();

export const AIContextProvider = ({ children }) => {
  const [ai, setAi] = useState(null);
  const [model, setModel] = useState('gpt-3');
  const [type, setType] = useState('openai');

  const prompt =
    'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

  useEffect(() => {
    setupAi();
  }, []);

  const setupAi = async () => {
    const key = await getKey();

    if (key) {
      const openaiInstance = new OpenAI({
        apiKey: key,
      });

      setAi(openaiInstance);
      return;
    }

    const res = await startOllama();
    const ollamaInstance = await ollama();
    setAi(ollamaInstance);
    console.log(ollamaInstance);
    setModel('llama2')
    setType('ollama')
    return;


  };

  const getKey = (accountName) => {
    return window.electron.ipc.invoke('get-ai-key');
  };

  const startOllama = () => {
    return window.electron.ipc.invoke('start-ollama');
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
    model,
    type,
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
