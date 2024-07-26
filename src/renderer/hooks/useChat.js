import { useState, useCallback, useMemo } from 'react';
import { useAIContext } from 'renderer/context/AIContext';
import { useIndexContext } from 'renderer/context/IndexContext';

const useChat = () => {
  const { generateCompletion, prompt } = useAIContext();
  const { vectorSearch, getThreadsAsText, latestThreads } = useIndexContext();

  const STARTER = useMemo(
    () => [
      {
        role: 'system',
        content:
          'You are a helpful assistant within a digital journaling app called Pile.',
      },
      {
        role: 'system',
        content:
          'The user has provided a description of your personality:' + prompt,
      },
      {
        role: 'system',
        content: `You are about to start a conversation with the user, usually involving reflection or discussion about their thoughts in this journal. For each of their messages, the system will provide a list of relevant journal entries as context to you, be aware of it when you answer and use whatever is relevant and appropriate. You are a wise librarian of my thoughts, providing advice and counsel. You try to keep responses concise and get to the point quickly. Plain-text responses only. You address the user as 'you', you don't need to know their name. You should engage with the user like you're a human. When you mention time, always do it relative to the current time– \nthe date and time at this moment is: ${new Date().toString()}.`,
      },
      {
        role: 'system',
        content: `Here are the 10 latest journal entries from the user: \n\n${latestThreads}`,
      },
      { role: 'system', content: 'The user starts the conversation:' },
    ],
    [prompt, latestThreads]
  );

  const [messages, setMessages] = useState(STARTER);

  const resetMessages = useCallback(() => setMessages(STARTER), [STARTER]);

  const addMessage = useCallback(
    async (message) => {
      const lastSystemMessage = messages[messages.length - 1];
      const augmentedMessages = `${lastSystemMessage.content} \n\n${message}`;
      const relevantEntries = await vectorSearch(augmentedMessages, 50);
      const entryFilePaths = relevantEntries.map((entry) => entry.ref);
      const threadsAsText = await getThreadsAsText(entryFilePaths);

      return [
        ...messages,
        {
          role: 'system',
          content:
            "Here are some relevant entries from the user's journal related to the user's message:" +
            threadsAsText.join('\n'),
        },
        { role: 'user', content: message },
      ];
    },
    [messages, vectorSearch, getThreadsAsText]
  );

  const getAIResponse = useCallback(
    async (messages, callback = () => {}) => {
      setMessages(messages);
      await generateCompletion(messages, callback);
    },
    [generateCompletion]
  );

  return { addMessage, getAIResponse, resetMessages };
};

export default useChat;
