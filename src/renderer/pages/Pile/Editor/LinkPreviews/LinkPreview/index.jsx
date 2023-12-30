import styles from './LinkPreview.module.scss';
import { useCallback, useState, useEffect } from 'react';
import {
  DiscIcon,
  PhotoIcon,
  TrashIcon,
  TagIcon,
  ChainIcon,
} from 'renderer/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useLinksContext } from 'renderer/context/LinksContext';

const isUrlYouTubeVideo = (url) => {
  // Regular expression to check for various forms of YouTube URLs
  const regExp =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return regExp.test(url);
};

export default function LinkPreview({ url }) {
  const { getLink } = useLinksContext();
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(null);

  const toggleExpand = () => setExpanded(!expanded);

  const getPreview = async (url) => {
    const data = await getLink(url);
    setPreview(data);
  };

  const updateSummary = (e) => {
    const summary = e.target.value;
    const _preview = { ...preview, aiCard: { ...preview.aiCard, summary } };
  };

  useEffect(() => {
    getPreview(url);
  }, [url]);

  if (!preview) return <div className={styles.placeholder}></div>;

  const createYouTubeEmbed = (url) => {
    // Extract the video ID from the YouTube URL
    const regExp = /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#\&\?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return (
        <div className={styles.youtube}>
          <iframe
            width="100%"
            height="auto"
            src={`https://www.youtube.com/embed/${match[2]}?si=w-plylbVGS7t7O4b"`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
            allowFullScreen
          />
        </div>
      );
    } else {
      return null;
    }
  };

  const renderImage = () => {
    if (!preview?.images || preview.images.length == 0) return;

    const image = preview.images[0];

    return (
      <div className={styles.image}>
        <img src={image} />
      </div>
    );
  };

  if (isUrlYouTubeVideo(url)) {
    return createYouTubeEmbed(url);
  }

  const renderAICard = () => {
    // check if AI card is reliable and has enough content.
    if (!preview.aiCard) return;

    const highlights = () => {};

    return (
      <div className={styles.aiCard}>
        <div className={styles.summary}>{preview?.aiCard?.summary}</div>

        {/* Highlights */}
        {preview?.aiCard?.highlights?.length > 0 && (
          <ul className={`${styles.highlights} ${expanded && styles.show}`}>
            {preview.aiCard.highlights.map((highlight, i) => (
              <li key={`preview-${i}`}>{highlight}</li>
            ))}
            <div
              key={'overlay'}
              className={`${styles.overlay} ${expanded && styles.hidden}`}
            ></div>
          </ul>
        )}

        {/* Buttons */}
        {preview?.aiCard?.buttons?.length > 0 && (
          <div className={styles.buttons}>
            {preview.aiCard.buttons.map((btn, i) => (
              <a
                key={`button-${i}`}
                href={btn.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ChainIcon className={styles.icon} />
                {btn.title}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
      }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className={styles.card} onClick={toggleExpand}>
        {renderImage()}
        <div className={styles.content}>
          <a
            href={url}
            target="_blank"
            className={styles.title}
            rel="noopener noreferrer"
          >
            {preview.title}
          </a>
        </div>
        {renderAICard()}
        <div className={styles.footer}>
          <img className={styles.favicon} src={preview.favicon} />{' '}
          {preview?.aiCard?.category && (
            <span className={styles.category}>{preview?.aiCard?.category}</span>
          )}
          {preview?.host}
        </div>
      </div>
    </motion.div>
  );
}
