import styles from './TagList.module.scss';
import { useCallback, useState, useEffect } from 'react';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTagsContext } from 'renderer/context/TagsContext';

export default function TagList({ tags = [], removeTag = () => {} }) {
  if (!tags || tags.length == 0) return null;

  const renderTags = () => {
    return tags.map((tag) => {
      return <div className={styles.tag}>{tag}</div>;
    });
  };

  return <div className={styles.tags}>{renderTags()}</div>;
}
