import styles from './LinkPreviews.module.scss';
import { useCallback, useState, useEffect } from 'react';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import LinkPreview from './LinkPreview';

const extractLinks = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const regex = /https:\/\/[^\s/$.?#].[^\s]*/gi;
  function extractText(node, urls) {
    if (node.nodeType === Node.TEXT_NODE) {
      const matches = node.textContent.match(regex);
      if (matches) {
        urls.push(...matches);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      node.childNodes.forEach((child) => extractText(child, urls));
    }
  }

  const urls = [];
  extractText(doc.body, urls);
  return urls.filter((value, index, self) => self.indexOf(value) === index);
};

export default function LinkPreviews({ post, editable = false }) {
  const getPreview = (url) => {
    return window.electron.ipc.invoke('get-link-preview', url);
  };
  const content = post.content ?? '';
  const links = extractLinks(content);

  if (links.length == 0) return;

  const renderLinks = () => {
    return links.map((url, i) => <LinkPreview key={`link-${i}`} url={url} />);
  };

  return <div className={styles.cards}>{renderLinks()}</div>;
}
