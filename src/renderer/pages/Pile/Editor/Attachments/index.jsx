import styles from './Attachments.module.scss';
import { useCallback, useState, useEffect } from 'react';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion } from 'framer-motion';
import { usePilesContext } from 'renderer/context/PilesContext';

const Attachments = ({
  post,
  onRemoveAttachment = () => {},
  editable = false,
}) => {
  const { getCurrentPilePath } = usePilesContext();

  if (!post) return;

  return post.data.attachments.map((attachment) => {
    const image_exts = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    const extension = attachment.split('.').pop();
    const sep = window.electron.pathSeparator;
    const imgPath = 'local:' + sep + sep + getCurrentPilePath() + sep + attachment;

    if (image_exts.includes(extension)) {
      return (
        <motion.div
          key={attachment}
          initial={{ opacity: 0, y: -30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 0, scale: 0.9 }}
          transition={{ delay: 0.1 }}
        >
          <div className={styles.image}>
            {editable && (
              <div
                className={styles.remove}
                onClick={() => onRemoveAttachment(attachment)}
              >
                <TrashIcon className={styles.icon} />
              </div>
            )}
            <img src={imgPath} draggable="false" />
          </div>
        </motion.div>
      );
    }
  });
};

export default Attachments;
