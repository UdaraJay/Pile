import styles from './TagButton.module.scss';
import { useCallback, useState, useEffect } from 'react';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTagsContext } from 'renderer/context/TagsContext';

export default function Tags({
  tags = [],
  addTag = () => {},
  removeTag = () => {},
}) {
  const { tags: allTags } = useTagsContext();
  const [show, setShow] = useState(false);
  const toggleShow = () => setShow(!show);

  const [newTag, setNewTag] = useState('');
  const onChangeNewTag = (e) => setNewTag(e.target.value);

  const renderAllTags = () => {
    if (allTags.size == 0) {
      return (
        <div className={styles.noTags}>
          Create your first tag to start assigning tags to posts.
        </div>
      );
    }
    return allTags.keys().map((tag) => {
      return (
        <div className={styles.item} key={tag}>
          {tag}
        </div>
      );
    });
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      createNewTag();
      return false;
    }
  };

  const createNewTag = () => {
    addTag(newTag);
    setNewTag('');
  };

  return (
    <div className={styles.frame}>
      <button className={styles.tags} onClick={toggleShow}>
        <TagIcon className={styles.icon} />
      </button>
      {show && (
        <div className={styles.popover}>
          {/* <div className={styles.title}>Tag this post</div> */}
          <input
            placeholder="Pick or create a tag"
            value={newTag}
            onChange={onChangeNewTag}
            onKeyDown={handleKeyPress}
          />
          <div className={styles.list}>
            {newTag.length > 0 && (
              <div className={styles.item}>Create new tag "{newTag}"</div>
            )}
            {renderAllTags()}
          </div>
        </div>
      )}
    </div>
  );
}
