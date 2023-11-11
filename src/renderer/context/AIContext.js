import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import OpenAI from 'openai';

const processKey = (k) => {
  if (k.startsWith('unms-')) {
    k = k.substring(5);
    const reversedStr = k.split('').reverse().join('');
    return 'sk-' + reversedStr;
  }

  return k;
};

export const AIContext = createContext();

export const AIContextProvider = ({ children }) => {
  const [ai, setAi] = useState(null);

  // this keeps track of async tasks that the user is notified about
  const [pendingJobs, setPendingJobs] = useState([]);

  const prompt =
    'You are an AI within a journaling app. Your job is to help the user reflect on their thoughts in a thoughtful and kind manner. The user can never directly address you or directly respond to you. Try not to repeat what the user said, instead try to seed new ideas, encourage or debate. Keep your responses concise, but meaningful.';

  useEffect(() => {
    setupAi();
  }, []);

  const setupAi = async () => {
    const key = await getKey();

    if (!key) return;

    const processedKey = processKey(key);
    const openaiInstance = new OpenAI({
      apiKey: processedKey,
    });
    setAi(openaiInstance);
  };

  const getKey = (accountName) => {
    return window.electron.ipc.invoke('get-ai-key');
  };

  const setKey = (secretKey) => {
    return window.electron.ipc.invoke('set-ai-key', secretKey);
  };

  const getCompletion = async (model = 'gpt-3', context) => {
    const response = await ai.chat.completions.create({
      model: 'gpt-4',
      max_tokens: 200,
      messages: context,
    });

    return response;
  };

  const AIContextValue = {
    ai,
    prompt,
    setKey,
    getKey,
    getCompletion,
  };

  return (
    <AIContext.Provider value={AIContextValue}>{children}</AIContext.Provider>
  );
};

export const useAIContext = () => useContext(AIContext);
