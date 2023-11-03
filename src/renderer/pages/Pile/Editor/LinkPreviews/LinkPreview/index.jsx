import styles from './LinkPreview.module.scss';
import { useCallback, useState, useEffect } from 'react';
import { DiscIcon, PhotoIcon, TrashIcon, TagIcon } from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';

const isUrlYouTubeVideo = (url) => {
  // Regular expression to check for various forms of YouTube URLs
  const regExp =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return regExp.test(url);
};

export default function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null);

  const getPreview = async (url) => {
    const data = await window.electron.ipc.invoke('get-link-preview', url);
    setPreview(data);
  };

  useEffect(() => {
    getPreview(url);
  }, [url]);

  if (!preview) return;

  const createYouTubeEmbed = (url) => {
    // Extract the video ID from the YouTube URL
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return (
        <iframe
          width="100%"
          height="auto"
          src={`https://www.youtube.com/embed/${match[2]}?si=w-plylbVGS7t7O4b"`}
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      );
    } else {
      return null;
    }
  };

  const renderImage = () => {
    if (isUrlYouTubeVideo(url)) {
      const embed = createYouTubeEmbed(url);

      if (embed) {
        return <div className={styles.iframe}>{embed}</div>;
      }
    }

    if (preview.images.length == 0) return;
    const image = preview.images[0];

    return (
      <div className={styles.image}>
        <img src={image} />
      </div>
    );
  };

  return (
    <div className={styles.card}>
      {renderImage()}
      <div className={styles.content}>
        <a href={url} target="_blank" className={styles.title}>
          {preview.title}
        </a>
      </div>
    </div>
  );
}
