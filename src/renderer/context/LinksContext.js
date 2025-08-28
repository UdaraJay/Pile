import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { usePilesContext } from './PilesContext';
import { useAIContext } from './AIContext';
import { useToastsContext } from './ToastsContext';

export const LinksContext = createContext();

export function LinksContextProvider({ children }) {
  const { currentPile, getCurrentPilePath } = usePilesContext();
  const { addNotification, updateNotification, removeNotification } =
    useToastsContext();

  const getLink = useCallback(
    async (url) => {
      const pilePath = getCurrentPilePath();
      if (!pilePath) {
        // Cloud piles don't cache previews on disk; just generate ad-hoc
        return await getPreview(url);
      }
      const preview = await window.electron.ipc.invoke(
        'links-get',
        pilePath,
        url,
      );

      // return cached preview if available
      if (preview) {
        return preview;
      }

      addNotification({
        id: url,
        type: 'waiting',
        message: 'Creating link preview',
        dismissTime: 12000,
      });

      // otherwise generate a new preview
      const _preview = await getPreview(url);
      updateNotification(url, 'thinking', 'Generating preview...');
      const aiCard = await generateMeta(url).catch(() => {
        console.log(
          'Failed to generate AI link preview, a basic preview will be used.',
        );
        updateNotification(url, 'failed', 'AI link preview failed');
        return null;
      });

      const linkPreview = {
        url,
        createdAt: new Date().toISOString(),
        title: _preview?.title ?? '',
        images: _preview?.images ?? [],
        favicon: _preview?.favicon ?? '',
        host: _preview?.host ?? '',
        description: aiCard?.summary ?? '',
        summary: '',
        aiCard: aiCard ?? null,
      };

      // cache it
      setLink(url, linkPreview);

      removeNotification(url);

      return linkPreview;
    },
    [currentPile],
  );

  const setLink = useCallback(
    async (url, data) => {
      const pilePath = getCurrentPilePath();
      if (!pilePath) return; // Skip caching for cloud piles
      window.electron.ipc.invoke('links-set', pilePath, url, data);
    },
    [currentPile],
  );

  const getPreview = async (url) => {
    const data = await window.electron.ipc.invoke('get-link-preview', url);
    return data;
  };

  const getContent = async (url) => {
    const data = await window.electron.ipc.invoke('get-link-content', url);
    return data;
  };

  const trimContent = (string, numWords = 2000) => {
    const wordsArray = string.split(/\s+/);
    if (wordsArray.length > numWords) {
      return `${wordsArray.slice(0, numWords).join(' ')}...`;
    }
    return string;
  };

  const generateMeta = async (url) => {
    const { text, images, links } = await getContent(url);
    const trimmedContent = trimContent(text);

    // Convert to single prompt for Gemini
    const prompt = `Provided below is some extracted plaintext response of a website. Use it to generate the content for a rich preview card for the webpage.

The content is as follows:
${trimmedContent}

These are the links on the page:
${links}

These are the images on the page:
${images}

Provide your response as a JSON object that follows this schema:
{
  "url": "${url}",
  "category": "", // suggest the best category for this page based on the content. eg: video, book, recipe, app, research paper, news, opinion, blog, social media etc.
  "images": [{"src": "", "alt": ""}], // key images
  "summary": "", // tldr summary of this webpage
  "highlights": [""], // plaintext sentences of 3-8 key insights, facts or quotes. Like an executive summary.
  "buttons": [{"title": "", "href": ""}] // use the links to generate a primary and secondary buttons appropriate for this preview. ONLY use relevant links from the page.
}`;

    let choice = false;

    try {
      // Use Gemini's JSON generation with a custom template
      if (window.electron?.gemini?.generateJson) {
        const response = await window.electron.gemini.generateJson(prompt, 'metadata');
        choice = response;
      }
    } catch (error) {
      console.error('Error generating link metadata with Gemini:', error);
    }

    return choice;
  };

  const linksContextValue = {
    getLink,
    setLink,
  };

  return (
    <LinksContext.Provider value={linksContextValue}>
      {children}
    </LinksContext.Provider>
  );
}

export const useLinksContext = () => useContext(LinksContext);
