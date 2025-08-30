import { useCallback, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTagsContext } from 'renderer/context/TagsContext';
import styles from './TagButton.module.scss';

export default function Tags({
  tags = [],
  addTag = () => {},
  removeTag = () => {},
}) {
  const { tags: allTags } = useTagsContext();
  const [show, setShow] = useState(false);
  const buttonRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const toggleShow = () => {
    const next = !show;
    setShow(next);
    if (next && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.top, left: rect.right + 8 });
    }
  };

  const [newTag, setNewTag] = useState('');
  const onChangeNewTag = (e) => setNewTag(e.target.value);

  const toggleTag = (tag) => {
    if (!tag) return;
    if (tags.includes(tag)) {
      removeTag(tag);
    } else {
      addTag(tag);
    }
  };

  const renderAllTags = () => {
    if (allTags.size == 0) {
      return (
        <div className={styles.noTags}>
          Create your first tag to start assigning tags to posts.
        </div>
      );
    }
    return allTags.keys().map((tag) => (
      <div
        className={`${styles.item} ${tags.includes(tag) ? styles.active : ''}`}
        key={tag}
        onClick={() => toggleTag(tag)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && toggleTag(tag)}
      >
        {tag}
      </div>
    ));
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      createNewTag();
      return false;
    }
  };

  const createNewTag = () => {
    const t = newTag.trim();
    if (!t) return;
    addTag(t);
    setNewTag('');
  };

  return (
    <div className={styles.frame}>
      <button ref={buttonRef} className={styles.tags} onClick={toggleShow}>
        <TagIcon className={styles.icon} />
      </button>
      {show &&
        createPortal(
          <div
            className={styles.popover}
            style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}
          >
            <input
              placeholder="Pick or create a tag"
              value={newTag}
              onChange={onChangeNewTag}
              onKeyDown={handleKeyPress}
            />
            <div className={styles.list}>
              {newTag.length > 0 && (
                <div className={styles.item} onClick={createNewTag}>
                  Create new tag "{newTag}"
                </div>
              )}
              {renderAllTags()}
            </div>
          </div>,
          document.getElementById('dialog') || document.body,
        )}
    </div>
  );
}
