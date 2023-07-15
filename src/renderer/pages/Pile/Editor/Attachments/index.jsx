import styles from './Attachments.module.scss';
import { useCallback, useState, useEffect } from 'react';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { usePilesContext } from 'renderer/context/PilesContext';

export default function Attachments({
  post,
  onRemoveAttachment = () => {},
  editable = false,
}) {
  const { getCurrentPilePath } = usePilesContext();

  if (!post) return;

  return post.data.attachments.map((attachment) => {
    const image_exts = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
    const extension = attachment.split('.').pop();
    const imgPath = 'local://' + getCurrentPilePath() + '/' + attachment;

    if (image_exts.includes(extension)) {
      return (
        <div className={styles.image}>
          {editable && (
            <div
              className={styles.close}
              onClick={() => onRemoveAttachment(attachment)}
            >
              <TrashIcon className={styles.icon} />
            </div>
          )}
          <img src={imgPath} />
        </div>
      );
    }
  });
}
